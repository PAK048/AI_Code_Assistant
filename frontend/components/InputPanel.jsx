"use client";

import { useState } from "react";
import VoiceRecorder from "./VoiceRecorder";

export default function InputPanel({ onSubmit, isLoading }) {
  const [textInput, setTextInput] = useState("");

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim() && !isLoading) {
      onSubmit(textInput.trim());
      setTextInput(""); // Clear input after submit
    }
  };

  const handleVoiceTranscript = (transcript) => {
    // When voice input is received, also submit it
    onSubmit(transcript);
  };

  return (
    <div className="space-y-4">
      {/* Text Input Form */}
      <form onSubmit={handleTextSubmit} className="flex gap-3">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Type your command here... (e.g., 'Create a React button component')"
          className="flex-1 px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!textInput.trim() || isLoading}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>Send</span>
            </>
          )}
        </button>
      </form>

      {/* Divider with "OR" */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-700"></div>
        <span className="text-sm text-slate-500 font-medium">OR</span>
        <div className="flex-1 h-px bg-slate-700"></div>
      </div>

      {/* Voice Input */}
      <VoiceRecorder onTranscript={handleVoiceTranscript} />
    </div>
  );
}
