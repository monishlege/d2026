import { useCallback, useRef, useState } from "react";

interface UseVoiceRecorderOptions {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onAnalysisStart?: () => void;
  onAnalysisComplete?: (transcript: string, language: string) => void;
  onError?: (error: string) => void;
}

interface VoiceRecorderState {
  isRecording: boolean;
  isAnalyzing: boolean;
  elapsedSeconds: number;
  audioBlob: Blob | null;
  transcript: string;
  detectedLanguage: string;
  error: string | null;
}

/**
 * Hook for recording complete voice input and sending to Gemini API
 * Handles:
 * - Audio recording from microphone
 * - Audio to Blob conversion
 * - Sending to /api/gemini-voice-analyze
 * - Parsing structured JSON response
 */
export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isAnalyzing: false,
    elapsedSeconds: 0,
    audioBlob: null,
    transcript: "",
    detectedLanguage: "",
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      options.onRecordingStart?.();
      setState((prev) => ({ ...prev, error: null }));
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop stream
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) {
          const errorMsg = "No audio recorded";
          setState((prev) => ({ ...prev, error: errorMsg }));
          options.onError?.(errorMsg);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setState((prev) => ({ ...prev, audioBlob, isRecording: false }));

        // Auto-analyze
        await analyzeAudio(audioBlob);
      };

      mediaRecorder.start();
      setState((prev) => ({ ...prev, isRecording: true, elapsedSeconds: 0 }));

      // Start timer
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }, 1000);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to access microphone";
      setState((prev) => ({ ...prev, error: errorMsg }));
      options.onError?.(errorMsg);
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      setState((prev) => ({ ...prev, isRecording: false }));

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      options.onRecordingStop?.();
    }
  }, [state.isRecording, options]);

  const analyzeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      options.onAnalysisStart?.();
      setState((prev) => ({ ...prev, isAnalyzing: true }));

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(",")[1];
        if (!base64) {
          throw new Error("Failed to encode audio");
        }

        // Send to API
        const response = await fetch("/api/gemini-voice-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt:
              "Analyze this voice input for Indian government welfare scheme eligibility.",
            audioBase64: base64,
            userContext: "User is querying about welfare schemes.",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.status === "error") {
          throw new Error(result.error_detail || "Analysis failed");
        }

        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          transcript: result.user_speech_transcript || "",
          detectedLanguage: result.detected_language || "en-IN",
        }));

        options.onAnalysisComplete?.(
          result.user_speech_transcript || "",
          result.detected_language || "en-IN"
        );
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Analysis failed";
      setState((prev) => ({ ...prev, error: errorMsg, isAnalyzing: false }));
      options.onError?.(errorMsg);
    }
  }, [options]);

  const resetRecorder = useCallback(() => {
    setState({
      isRecording: false,
      isAnalyzing: false,
      elapsedSeconds: 0,
      audioBlob: null,
      transcript: "",
      detectedLanguage: "",
      error: null,
    });
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    analyzeAudio,
    resetRecorder,
  };
}
