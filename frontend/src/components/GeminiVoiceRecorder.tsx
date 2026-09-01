import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, Loader } from "lucide-react";

interface GeminiVoiceAnalysisResult {
  status: "success" | "error";
  detected_language?: string;
  user_speech_transcript?: string;
  scheme_analysis?: string;
  spoken_response?: string;
  error_detail?: string;
}

interface GeminiVoiceRecorderProps {
  onAnalysisComplete?: (result: GeminiVoiceAnalysisResult) => void;
  apiEndpoint?: string; // Default: /api/gemini-voice-analyze
}

export default function GeminiVoiceRecorder({
  onAnalysisComplete,
  apiEndpoint = "/api/gemini-voice-analyze",
}: GeminiVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<GeminiVoiceAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Initialize audio recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);
      audioChunksRef.current = [];
      setElapsedSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio analyzer for visual feedback
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      source.connect(analyzerRef.current);
      dataArrayRef.current = new Uint8Array(analyzerRef.current.frequencyBinCount);

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop audio stream
        stream.getTracks().forEach((track) => track.stop());

        // Analyze audio
        if (audioChunksRef.current.length === 0) {
          setError("No audio recorded. Please try again.");
          return;
        }

        setIsAnalyzing(true);
        await analyzeAudio(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        setIsAnalyzing(false);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      setElapsedSeconds(0);
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to access microphone";
      setError(errorMsg);
      console.error("Recording error:", err);
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // Send audio to Gemini API
  const analyzeAudio = useCallback(
    async (audioBlob: Blob) => {
      try {
        // Convert audio to base64
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Audio = reader.result?.toString().split(",")[1];

          if (!base64Audio) {
            setError("Failed to encode audio");
            return;
          }

          // Send to Gemini endpoint
          const response = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: "Analyze this voice input for welfare scheme eligibility.",
              audioBase64: base64Audio,
              userContext:
                "User is querying about Indian government welfare schemes.",
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const analysisResult = (await response.json()) as GeminiVoiceAnalysisResult;
          setResult(analysisResult);
          onAnalysisComplete?.(analysisResult);

          // Auto-play TTS response if available
          if (analysisResult.spoken_response) {
            speakResponse(analysisResult.spoken_response, analysisResult.detected_language);
          }
        };
        reader.readAsDataURL(audioBlob);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Analysis failed";
        setError(errorMsg);
        console.error("Analysis error:", err);
      }
    },
    [apiEndpoint, onAnalysisComplete]
  );

  // Text-to-speech for response
  const speakResponse = useCallback((text: string, language?: string) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported in this browser");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Set language based on detected language
    if (language?.includes("(")) {
      const langCode = language.split("(")[1]?.split(")")[0] || "en-IN";
      utterance.lang = langCode;
    } else {
      utterance.lang = "en-IN";
    }

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  // Format time display (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isRecording]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 rounded-lg border border-cyan-300/20 bg-gradient-to-b from-slate-900 to-slate-800 p-6">
      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-4">
        {/* Mic Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          className={`relative p-6 rounded-full transition-all duration-300 ${
            isRecording
              ? "bg-red-500/20 border-2 border-red-400 hover:bg-red-500/30"
              : "bg-cyan-500/20 border-2 border-cyan-400 hover:bg-cyan-500/30"
          } ${isAnalyzing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {isAnalyzing ? (
            <Loader className="w-8 h-8 animate-spin text-cyan-300" />
          ) : isRecording ? (
            <Square className="w-8 h-8 text-red-400" />
          ) : (
            <Mic className="w-8 h-8 text-cyan-300" />
          )}
        </button>

        {/* Timer */}
        <div className="text-center">
          {isRecording && (
            <div className="text-2xl font-bold text-cyan-300 font-mono">
              {formatTime(elapsedSeconds)}
            </div>
          )}
          <div className="text-sm text-slate-400 mt-2">
            {isRecording
              ? "Listening... Click to stop"
              : isAnalyzing
                ? "Analyzing voice..."
                : "Click mic to start recording"}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-400/30 p-4 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Analysis Result */}
      {result && result.status === "success" && (
        <div className="space-y-4">
          {/* Detected Language */}
          {result.detected_language && (
            <div className="rounded-md bg-cyan-500/10 border border-cyan-400/30 p-3">
              <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                Detected Language
              </div>
              <div className="text-sm text-cyan-100 mt-1">
                {result.detected_language}
              </div>
            </div>
          )}

          {/* Transcript */}
          {result.user_speech_transcript && (
            <div className="rounded-md bg-slate-700/50 border border-slate-600/50 p-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Your Query
              </div>
              <div className="text-sm text-slate-100 mt-2 italic">
                "{result.user_speech_transcript}"
              </div>
            </div>
          )}

          {/* Scheme Analysis */}
          {result.scheme_analysis && (
            <div className="rounded-md bg-orange-500/10 border border-orange-400/30 p-3">
              <div className="text-xs font-semibold text-orange-300 uppercase tracking-wider">
                Scheme Analysis
              </div>
              <div className="text-sm text-orange-100 mt-2">
                {result.scheme_analysis}
              </div>
            </div>
          )}

          {/* Spoken Response */}
          {result.spoken_response && (
            <div className="rounded-md bg-green-500/10 border border-green-400/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs font-semibold text-green-300 uppercase tracking-wider">
                  Response
                </div>
                <button
                  onClick={() =>
                    speakResponse(result.spoken_response, result.detected_language)
                  }
                  className="p-1 rounded hover:bg-green-500/20 transition-colors"
                  title="Play audio"
                >
                  <Volume2 className="w-4 h-4 text-green-300" />
                </button>
              </div>
              <div className="text-sm text-green-100 leading-relaxed">
                {result.spoken_response}
              </div>
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="w-full py-2 px-4 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
          >
            New Recording
          </button>
        </div>
      )}
    </div>
  );
}
