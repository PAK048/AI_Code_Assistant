import ChatInterface from "../../components/ChatInterface";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <header className="text-center space-y-3 pb-6 border-b border-slate-800">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
          CodeEcho Control Room
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          AI-powered coding assistant with{" "}
          <span className="text-emerald-400 font-medium">
            watsonx Orchestrate
          </span>
          , providing intelligent assistance and code generation.
        </p>
      </header>
      <div className="mt-6">
        <ChatInterface />
      </div>
    </div>
  );
}
