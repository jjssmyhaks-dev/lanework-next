/**
 * VoiceInput — Deepgram-powered voice input with Web Speech API fallback.
 *
 * Primary: Uses MediaRecorder + Deepgram API for high-accuracy transcription
 *   - Supports Hindi + English (Hinglish-friendly)
 *   - Nova-2 model for best accuracy
 *   - Server-side processing (better than browser speech)
 *
 * Fallback: Uses Web Speech API if Deepgram fails or is unavailable
 *
 * Shows a mic button with:
 * - Pulse animation while recording
 * - Real-time interim transcript bubble
 * - Visual waveform indicator
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

type RecordingState = "idle" | "recording" | "processing" | "error";

export default function VoiceInput({ onTranscript, disabled, className }: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [interimText, setInterimText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // ── Deepgram Transcription ──

  const transcribeWithDeepgram = useCallback(
    async (audioBlob: Blob): Promise<string> => {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: audioBlob,
        headers: {
          "Content-Type": audioBlob.type || "audio/webm",
        },
      });

      if (!res.ok) {
        throw new Error(`Deepgram returned ${res.status}`);
      }

      const data = await res.json();
      return data.text || "";
    },
    []
  );

  // ── Web Speech API Fallback ──

  const startWebSpeechFallback = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("Speech recognition not supported");
      setState("error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState("recording");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) setInterimText(interim);
      if (final) {
        onTranscript(final.trim());
        setInterimText("");
        setState("idle");
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setState("idle");
      setInterimText("");
    };

    recognition.onend = () => {
      setState("idle");
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript]);

  // ── Start Recording (Deepgram primary) ──

  const startRecording = useCallback(async () => {
    try {
      setErrorMsg("");
      setInterimText("");

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      setState("recording");

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Clean up stream
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (audioChunksRef.current.length === 0) {
          setState("idle");
          return;
        }

        setState("processing");
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        try {
          // Try Deepgram first
          const text = await transcribeWithDeepgram(audioBlob);
          if (text) {
            onTranscript(text);
          }
        } catch (deepgramError) {
          console.warn("Deepgram failed, trying Web Speech API:", deepgramError);
          // Fallback to Web Speech API
          try {
            startWebSpeechFallback();
          } catch {
            setErrorMsg("Voice input failed. Please try again.");
            setState("error");
            setTimeout(() => setState("idle"), 2000);
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms for responsiveness

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 30000);
    } catch (err: any) {
      console.warn("MediaRecorder failed, trying Web Speech API:", err);
      // If MediaRecorder fails (e.g., permission denied), try Web Speech API
      startWebSpeechFallback();
    }
  }, [onTranscript, transcribeWithDeepgram, startWebSpeechFallback]);

  // ── Stop Recording ──

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setState("idle");
    setInterimText("");
  }, []);

  // ── Toggle ──

  const toggle = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle" || state === "error") {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const isError = state === "error";

  return (
    <div className="relative">
      <button
        onClick={toggle}
        disabled={disabled || isProcessing}
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-xl border transition-all duration-200",
          isRecording
            ? "border-red-300 bg-red-50 text-red-600 shadow-lg shadow-red-100"
            : isProcessing
              ? "border-blue-300 bg-blue-50 text-blue-600"
              : isError
                ? "border-red-300 bg-red-50 text-red-500"
                : "border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        title={
          isRecording
            ? "Stop recording"
            : isProcessing
              ? "Processing..."
              : "Voice input (Deepgram)"
        }
        aria-label={
          isRecording ? "Stop voice input" : "Start voice input"
        }
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isRecording ? (
          <div className="relative">
            <MicOff className="h-5 w-5" />
            {/* Recording pulse rings */}
            <div className="absolute inset-0 -m-1">
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
              <span className="absolute inset-0 rounded-full bg-red-400 animate-pulse opacity-10" />
            </div>
          </div>
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>

      {/* Interim transcript bubble */}
      {isRecording && interimText && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap max-w-[200px] truncate shadow-lg z-10">
          {interimText}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}

      {/* Error message */}
      {isError && errorMsg && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-10">
          {errorMsg}
        </div>
      )}

      {/* Recording indicator dot */}
      {isRecording && (
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full">
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping" />
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}
