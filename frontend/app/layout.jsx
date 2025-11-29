import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "CodeEcho Agentic UI",
  description: "Voice-driven coding assistant powered by watsonx Orchestrate",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans bg-slate-950 text-slate-100">
        <Navbar />
        <main className="min-h-screen max-w-6xl mx-auto py-10 px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
