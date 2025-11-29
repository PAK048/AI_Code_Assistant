"use client";

import { motion } from "framer-motion";
import TestingPanel from "../../components/TestingPanel";

/**
 * Testing Page Component
 *
 * Dedicated page for testing functionality with a complete standalone interface.
 * Features:
 * - File upload (drag & drop, button)
 * - Test generation
 * - Test execution
 * - Results display
 *
 * State Flow: NO_FILE → FILE_UPLOADED → TEST_GENERATED → TEST_EXECUTED
 */
export default function TestingPage() {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3 pb-6 border-b border-slate-800"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
          Testing Suite
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Upload your code, generate comprehensive tests, and execute them
          instantly. Powered by{" "}
          <span className="text-emerald-400 font-medium">
            watsonx Orchestrate
          </span>
          .
        </p>
      </motion.header>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8 max-w-5xl mx-auto"
      >
        <TestingPanel backendUrl={backendUrl} />
      </motion.div>

      {/* Footer Info */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-12 text-center space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
            <div className="text-3xl mb-2">📁</div>
            <h3 className="font-semibold text-slate-300 mb-1">
              1. Upload File
            </h3>
            <p className="text-sm text-slate-500">
              Drag & drop or select your code file
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
            <div className="text-3xl mb-2">🧪</div>
            <h3 className="font-semibold text-slate-300 mb-1">
              2. Generate Tests
            </h3>
            <p className="text-sm text-slate-500">
              AI creates comprehensive test cases
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
            <div className="text-3xl mb-2">▶️</div>
            <h3 className="font-semibold text-slate-300 mb-1">
              3. Execute Tests
            </h3>
            <p className="text-sm text-slate-500">
              Run tests and view detailed results
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-600 pt-4">
          <p>Supports JavaScript, Python, TypeScript, Java, C++, and more</p>
        </div>
      </motion.footer>
    </div>
  );
}
