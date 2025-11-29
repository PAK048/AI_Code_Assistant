"use client";

import { useEffect, useRef, useState } from "react";

export default function VoiceRecorder({ onTranscript }) {
  const recognitionRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Web Speech API is unavailable in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript?.(transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      setError(event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, [onTranscript]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      recognitionRef.current.start();
    }

    setIsRecording((prev) => !prev);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={toggleRecording}
        className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-lg ${
          isRecording
            ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 animate-pulse"
            : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
        }`}
      >
        {isRecording ? "🔴 Listening..." : "🎤 Start Voice Input"}
      </button>
      {error && (
        <p className="text-sm text-rose-400 bg-rose-950/30 px-3 py-2 rounded border border-rose-800">
          ⚠️ Speech error: {error}
        </p>
      )}
    </div>
  );
}
