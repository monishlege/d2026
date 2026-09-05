import { useCallback, useEffect, useRef, useState } from "react";

import type { LanguageCode } from "@/types";

type STTProvider = "bhashini" | "webkit" | "mock";

export interface BhashiniSTTHook {
  transcript: string;
  interimTranscript: string;
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  provider: STTProvider;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  cancelRecording: () => void;
  resetTranscript: () => void;
  setLanguage: (language: LanguageCode) => void;
  audioLevel: number;
}

type WebkitRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((evt: any) => void) | null;
  onerror: ((evt: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => WebkitRecognition;
    webkitSpeechRecognition?: new () => WebkitRecognition;
  }
}

const BHASHINI_LANG_MAP: Record<LanguageCode, string> = {
  hi: "hin_Deva",
  kn: "kan_Knda",
  ta: "tam_Taml",
  te: "tel_Telu",
  mr: "mar_Deva",
  bn: "ben_Beng",
  en: "eng_Latn",
};

const WEBKIT_LANG_MAP: Record<LanguageCode, string> = {
  hi: "hi-IN",
  kn: "kn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  en: "en-IN",
};

function hasBrowserSpeechRecognition(): boolean {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

const localHosts = new Set(["localhost", "127.0.0.1"]);
const configuredApiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const productionApiBase = configuredApiBase || "https://decodesih2026.onrender.com";
const API_BASE =
  typeof window !== "undefined" && localHosts.has(window.location.hostname)
    ? "http://localhost:8000/api"
    : `${productionApiBase}/api`;

async function detectBackendBhashiniConfigured(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/config/status`, { cache: "no-store" });
    if (!response.ok) return false;
    const data = (await response.json()) as { bhashini_configured?: boolean };
    return Boolean(data.bhashini_configured);
  } catch {
    return false;
  }
}

function getMediaRecorderOptions(): MediaRecorderOptions | undefined {
  const candidateMimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/wav",
  ];
  if (typeof window === "undefined" || !("MediaRecorder" in window)) return undefined;
  const supported = candidateMimeTypes.find((mt) => MediaRecorder.isTypeSupported(mt));
  return supported ? { mimeType: supported } : undefined;
}

export function useBhashiniSTT(initialLanguage: LanguageCode = "hi"): BhashiniSTTHook {
  const [language, setLanguage] = useState<LanguageCode>(initialLanguage);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const webkitRef = useRef<WebkitRecognition | null>(null);
  const finalResolveRef = useRef<((value: string) => void) | null>(null);
  const finalTranscriptRef = useRef("");

  const [provider, setProvider] = useState<STTProvider>("mock");

  useEffect(() => {
    let active = true;
    void (async () => {
      const hasBhashini = await detectBackendBhashiniConfigured();
      if (!active) return;
      const hasWebkit = hasBrowserSpeechRecognition();
      // Prefer native browser recognition for immediate microphone feedback.
      // Use Bhashini only when the browser has no SpeechRecognition API.
      setProvider(hasWebkit ? "webkit" : hasBhashini ? "bhashini" : "mock");
    })();
    return () => {
      active = false;
    };
  }, []);

  const cleanupAudio = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setAudioLevel(0);
  }, []);

  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, v) => acc + v, 0);
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(1, avg / 180));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* ignore visualizer setup errors */
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setInterimTranscript("");
    finalTranscriptRef.current = "";

    if (provider === "webkit") {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Ctor) {
        setProvider("mock");
      } else {
        try {
          const recognition = new Ctor();
          recognition.lang = WEBKIT_LANG_MAP[language] ?? "en-IN";
          recognition.continuous = false;
          recognition.interimResults = true;
          webkitRef.current = recognition;
          let combinedInterim = "";
          recognition.onresult = (event: any) => {
            let interim = "";
            let finalText = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const res = event.results[i];
              if (res.isFinal) finalText += res[0].transcript;
              else interim += res[0].transcript;
            }
            combinedInterim = interim;
            setInterimTranscript(interim);
            if (finalText) {
              finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalText}`.trim();
              setTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText));
            }
          };
          recognition.onerror = (event: any) => {
            const recognitionError = event?.error ?? "unknown";
            setIsRecording(false);
            webkitRef.current = null;
            if (finalResolveRef.current) {
              const finalResolve = finalResolveRef.current;
              finalResolveRef.current = null;
              finalResolve(finalTranscriptRef.current);
            }
            setError(
              recognitionError === "not-allowed"
                ? "Microphone permission denied. Please allow microphone access and try again."
                : `Speech recognition error: ${recognitionError}`,
            );
          };
          recognition.onend = () => {
            setIsRecording(false);
            const finishedText = combinedInterim.trim();
            const completeText = `${finalTranscriptRef.current} ${finishedText}`.trim();
            if (completeText) {
              finalTranscriptRef.current = completeText;
              setTranscript(completeText);
            }
            if (finalResolveRef.current) {
              const finalResolve = finalResolveRef.current;
              finalResolveRef.current = null;
              finalResolve(completeText);
            }
            webkitRef.current = null;
            cleanupAudio();
          };
          recognition.start();
          setIsRecording(true);
          return;
        } catch (err) {
          setError(err instanceof Error ? err.message : "Webkit STT failed to start");
          setProvider(hasBrowserSpeechRecognition() ? "webkit" : "mock");
        }
      }
    }

    if (provider === "mock" || provider === "bhashini") {
      if (!("mediaDevices" in navigator) || typeof navigator.mediaDevices?.getUserMedia !== "function") {
        setError("Microphone access blocked. Enable permissions in your browser bar or type your query below.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        startAudioLevelMonitoring(stream);

        const options = getMediaRecorderOptions();
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (evt) => {
          if (evt.data && evt.data.size > 0) {
            audioChunksRef.current.push(evt.data);
          }
        };

        recorder.onerror = (evt: any) => {
          setError(evt?.error?.message || "Recording error occurred");
        };

        recorder.start(100);
        setIsRecording(true);
      } catch (err: any) {
        if (err?.name === "NotAllowedError") {
          setError("Microphone permission denied. Please allow microphone access and try again.");
        } else if (err?.name === "NotFoundError") {
          setError("No microphone detected on this device.");
        } else {
          setError(err?.message || "Microphone access blocked. Enable permissions in your browser bar or type your query below.");
        }
        cleanupAudio();
      }
    }
  }, [provider, language, startAudioLevelMonitoring, cleanupAudio]);

  const stopRecording = useCallback(async (): Promise<string> => {
    if (!isRecording) return transcript;

    if (provider === "webkit" && webkitRef.current) {
      return await new Promise<string>((resolve) => {
        finalResolveRef.current = resolve;
        try {
          webkitRef.current!.stop();
        } catch {
          resolve(transcript);
        }
      });
    }

    return await new Promise<string>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(transcript);
        return;
      }

      const chunks = audioChunksRef.current;
      recorder.onstop = async () => {
        setIsRecording(false);
        if (provider === "mock") {
          const sampleText = "mujhe pm-kisan yojana ke baare mein jaana hai";
          setTranscript(sampleText);
          cleanupAudio();
          resolve(sampleText);
          return;
        }

        try {
          setIsTranscribing(true);
          const mimeType =
            chunks[0]?.type || (recorder as any).mimeType || "audio/webm";
          const blob = new Blob(chunks, { type: mimeType });
          const formData = new FormData();
          formData.append("audio", blob, `recording.${mimeType.includes("wav") ? "wav" : mimeType.includes("mp4") ? "m4a" : "webm"}`);
          formData.append("language", BHASHINI_LANG_MAP[language] ?? "hin_Deva");
          formData.append("userId", "jansahayak-user");

          const response = await fetch(`${API_BASE}/speech-to-text`, {
            method: "POST",
            headers: {},
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Bhashini ASR error: ${response.status}`);
          }

          const data = (await response.json()) as {
            transcribed_text?: string;
            normalized_text?: string;
            transcript?: string;
          };
          const text =
            data?.transcribed_text ||
            data?.normalized_text ||
            data?.transcript ||
            "";
          setTranscript(text || "");
          resolve(text || "");
        } catch (err: any) {
          const message = err?.message || "Transcription failed";
          setError(message);
          resolve("");
        } finally {
          setIsTranscribing(false);
          cleanupAudio();
        }
      };

      try {
        recorder.stop();
      } catch {
        setIsRecording(false);
        resolve(transcript);
      }
    });
  }, [isRecording, provider, language, transcript, cleanupAudio]);

  const cancelRecording = useCallback(() => {
    if (webkitRef.current) {
      try {
        webkitRef.current.abort();
      } catch {
        /* ignore */
      }
      webkitRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.onstop = null as any;
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    setIsRecording(false);
    setIsTranscribing(false);
    setInterimTranscript("");
    cleanupAudio();
  }, [cleanupAudio]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, [cancelRecording]);

  return {
    transcript,
    interimTranscript,
    isRecording,
    isTranscribing,
    error,
    provider,
    startRecording,
    stopRecording,
    cancelRecording,
    resetTranscript,
    setLanguage,
    audioLevel,
  };
}
