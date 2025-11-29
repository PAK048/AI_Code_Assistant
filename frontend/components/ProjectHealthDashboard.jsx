"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const ProjectSelector = ({ onSelect, loading, onCancel, error }) => {
  const [githubUrl, setGithubUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const localPathInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInputRef.current.click();
    }
  };

  const handleFolderSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setProcessing(true);
      // Small delay to allow UI to update before processing potentially large file list
      setTimeout(() => {
        const path = files[0].webkitRelativePath.split("/")[0];
        onSelect({ type: "upload", files: files, name: path });
        setProcessing(false); // Reset processing since we're just passing data
      }, 100);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700 relative overflow-hidden">
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="text-left">
            <h4 className="text-red-400 font-semibold">Selection Error</h4>
            <p className="text-red-200/80 text-sm">{error}</p>
          </div>
        </div>
      )}
      {(loading || processing) && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="text-xl font-semibold text-white">
            {processing ? "Preparing Files..." : "Analyzing Project..."}
          </h3>
          <p className="text-gray-400 mt-2 mb-6">
            {processing
              ? "Reading project structure..."
              : "This may take a minute depending on project size."}
          </p>
          <button
            onClick={() => {
              if (processing) setProcessing(false);
              else if (onCancel) onCancel();
            }}
            className="px-6 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/50 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}{" "}
      <h2 className="text-2xl font-bold mb-6 text-white">
        Select Project to Analyze
      </h2>
      <div className="space-y-6">
        {/* Option A: Upload Folder */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-500/10"
              : "border-gray-600 hover:border-gray-500"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="mb-4 text-4xl">📁</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            Upload Project Folder
          </h3>
          <p className="text-gray-400 mb-4">
            Drag & drop your project folder here
          </p>
          <input
            ref={fileInputRef}
            type="file"
            {...{ webkitdirectory: "", directory: "" }}
            multiple
            className="hidden"
            onChange={handleFolderSelect}
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || processing}
          >
            Select Folder
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-gray-600 w-full"></div>
          <span className="bg-gray-800 px-4 text-gray-400 absolute">OR</span>
        </div>

        {/* Option B: GitHub URL */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Analyze GitHub Repository
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              disabled={loading || processing}
            />
            <button
              onClick={() => onSelect({ type: "github", url: githubUrl })}
              disabled={!githubUrl || loading || processing}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Analyzing...
                </>
              ) : (
                "Analyze"
              )}
            </button>
          </div>
        </div>

        {/* Option C: Local Path (Dev Only) */}
        <div className="pt-4 border-t border-gray-700">
          <details className="text-gray-400 text-sm cursor-pointer">
            <summary>Advanced: Enter Local Path</summary>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="/absolute/path/to/project"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value) {
                    onSelect({ type: "local", path: e.target.value });
                  }
                }}
              />
              <button
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                onClick={(e) => {
                  const input = e.target.previousSibling;
                  if (input.value)
                    onSelect({ type: "local", path: input.value });
                }}
              >
                Go
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default function ProjectHealthDashboard({ initialProjectId }) {
  const [projectId, setProjectId] = useState(initialProjectId || null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAnalyzing(false);
    setLoading(false);
  };

  // Load recent project from localStorage
  useEffect(() => {
    if (!projectId) {
      const savedId = localStorage.getItem("lastProjectId");
      if (savedId) setProjectId(savedId);
    }
  }, [projectId]);

  // Fetch project overview
  const fetchOverview = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${backendUrl}/api/project-health/overview?projectId=${projectId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // If not found, maybe it's a new project that needs analysis
          // But usually overview should return something if project exists
          setError("Project data not found.");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setOverview(data.overview);
        setError(null);
      } else {
        setError(data.error || "Failed to load project data");
      }
    } catch (error) {
      console.error("Fetch overview error:", error);
      setError(error.message || "Failed to fetch project health data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchOverview();
      localStorage.setItem("lastProjectId", projectId);
    }
  }, [projectId, fetchOverview]);

  const handleProjectSelect = async (selection) => {
    setAnalyzing(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let body = {};

      if (selection.type === "github") {
        body = { githubUrl: selection.url, source: "github" };
      } else if (selection.type === "local") {
        body = { projectPath: selection.path, source: "upload" };
      } else if (selection.type === "upload") {
        // For local development environment, we can try to use the path if available
        // or fallback to a mock upload if we can't get the full path.
        // Since we can't easily upload thousands of files via this interface without
        // a dedicated upload endpoint that handles multipart/form-data recursively,
        // and the user is likely running locally, we'll try to use the path.

        // Note: In a real production web app, we would use FormData and upload files here.
        // But for this specific "CodeEcho" tool which seems to be a local dev tool,
        // we might be able to just pass the path if the user enters it manually,
        // or if we can infer it.

        // Since browser security blocks full path, and we added a "Local Path" input,
        // we will assume "upload" here means we want to analyze the folder the user selected.
        // But we only have the relative path.

        // If we are in a browser, we can't get the absolute path.
        // So we will show an error if we can't upload.

        // However, to make the "Upload" button do *something* useful in this demo:
        // We will assume the user wants to analyze the project they are currently in
        // if they select a file from it, OR we will ask them to use the Local Path input.

        // Let's try to send the project name and see if the backend can find it in uploads
        // (which it won't, because we didn't upload it).

        // Ideally, we should implement the upload.
        // But for now, let's just use the project name as the ID and hope for the best
        // or fail gracefully.

        // BETTER UX: If it's an upload, we'll simulate an upload delay and then
        // fail with a message saying "Please use Local Path for local projects"
        // or actually implement the upload if we can.

        // Let's try to implement a basic upload for small projects.
        // But we don't have the code for that here.

        // I will fallback to using the "name" as the project path for now,
        // which will likely fail on the backend, but at least it sends a request.
        // AND I will add a check.

        if (selection.files && selection.files.length > 0) {
          // We can't get absolute path.
          // We will prompt the user to use the "Local Path" option for now
          // as it is more reliable for local dev tools.
          setError(
            "Browser security prevents accessing full folder paths. Please use the 'Advanced: Enter Local Path' option below for local projects."
          );
          setAnalyzing(false);

          // Auto-open the details if possible (requires ref access which we don't have easily here)
          // But showing the error is a good start.
          return;
        }

        body = { projectPath: selection.name, source: "upload" };
      }

      const response = await fetch(`${backendUrl}/api/project-health/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProjectId(data.projectHealth.projectId);
        await fetchOverview();
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Analysis cancelled");
        return;
      }
      console.error("Analyze project error:", error);
      setError(error.message || "Failed to analyze project");
    } finally {
      if (abortControllerRef.current === controller) {
        setAnalyzing(false);
        abortControllerRef.current = null;
      }
    }
  };

  // Analyze project (re-analyze)
  const analyzeProject = async () => {
    if (!projectId) return;

    try {
      setAnalyzing(true);
      setError(null);

      const response = await fetch(`${backendUrl}/api/project-health/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        await fetchOverview();
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Analyze project error:", error);
      setError(error.message || "Failed to analyze project");
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle file click
  const handleFileClick = (filePath, metrics) => {
    setSelectedFile({ filePath, metrics });
    if (onFileClick) {
      onFileClick(filePath, metrics);
    }
  };

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (projectId && !loading && !analyzing) {
        fetchOverview();
      }
    }, 120000);

    return () => clearInterval(interval);
  }, [projectId, loading, analyzing, fetchOverview]);

  if (!projectId) {
    return (
      <ProjectSelector
        onSelect={handleProjectSelect}
        loading={analyzing}
        onCancel={handleCancelAnalysis}
        error={error}
      />
    );
  }

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            Loading Project Health
          </h3>
          <p className="text-slate-400">Fetching latest analysis data...</p>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-8 text-center max-w-2xl mx-auto mt-12 border border-slate-700">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">⚠️</span>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">
          Project Not Analyzed
        </h3>
        <p className="text-slate-400 mb-8 text-lg">{error}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              localStorage.removeItem("lastProjectId");
              setProjectId(null);
            }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>←</span> Select Different Project
          </button>
          <button
            onClick={analyzeProject}
            disabled={analyzing}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            {analyzing ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Analyzing...
              </>
            ) : (
              <>
                <span>🔍</span> Analyze Selected Project
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Re-analysis Loading Overlay */}
      {analyzing && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl flex flex-col items-center max-w-md w-full mx-4">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-white mb-2">
              Analyzing Project
            </h3>
            <p className="text-slate-400 text-center mb-6">
              Running code analysis, tests, and generating insights...
            </p>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 animate-pulse w-2/3 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-blue-900/40 backdrop-blur rounded-lg p-6 border border-emerald-700/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-emerald-400">
                📊 Project Health Dashboard
              </h2>
              <button
                onClick={() => {
                  localStorage.removeItem("lastProjectId");
                  setProjectId(null);
                }}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
              >
                Change Project
              </button>
            </div>
            <p className="text-slate-400 text-sm">
              {overview?.projectName || "Selected Project"}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Last analyzed:{" "}
              {overview?.lastAnalyzed
                ? new Date(overview.lastAnalyzed).toLocaleString()
                : "Never"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={analyzeProject}
              disabled={analyzing}
              className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {analyzing ? "Analyzing..." : "Re-analyze Project"}
            </button>

            {/* Health Score */}
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${
                  overview?.healthScore >= 80
                    ? "text-emerald-400"
                    : overview?.healthScore >= 60
                    ? "text-yellow-400"
                    : overview?.healthScore >= 40
                    ? "text-orange-400"
                    : "text-red-400"
                }`}
              >
                {overview?.healthScore || 0}
              </div>
              <div className="text-xs text-slate-400">Health Score</div>
            </div>

            <button
              onClick={analyzeProject}
              disabled={analyzing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing...
                </>
              ) : (
                <>🔄 Re-analyze</>
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          <StatCard
            icon="📁"
            label="Files"
            value={overview?.stats.totalFiles || 0}
            color="text-blue-400"
          />
          <StatCard
            icon="📝"
            label="Lines of Code"
            value={overview?.stats.totalLinesOfCode?.toLocaleString() || 0}
            color="text-purple-400"
          />
          <StatCard
            icon="⚠️"
            label="Critical Issues"
            value={overview?.stats.criticalIssues || 0}
            color="text-red-400"
          />
          <StatCard
            icon="💡"
            label="Recommendations"
            value={overview?.stats.totalRecommendations || 0}
            color="text-yellow-400"
          />
          <StatCard
            icon="🧪"
            label="Test Coverage"
            value={`${Math.round(overview?.metrics.overallTestCoverage || 0)}%`}
            color="text-emerald-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <TabButton
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          icon="📊"
          label="Overview"
        />
        <TabButton
          active={activeTab === "files"}
          onClick={() => setActiveTab("files")}
          icon="📁"
          label="Critical Files"
        />
        <TabButton
          active={activeTab === "recommendations"}
          onClick={() => setActiveTab("recommendations")}
          icon="💡"
          label="Recommendations"
        />
        <TabButton
          active={activeTab === "tests"}
          onClick={() => setActiveTab("tests")}
          icon="🧪"
          label="Tests"
        />
        <TabButton
          active={activeTab === "git"}
          onClick={() => setActiveTab("git")}
          icon="🔀"
          label="Git/PRs"
        />
        <TabButton
          active={activeTab === "quality"}
          onClick={() => setActiveTab("quality")}
          icon="✨"
          label="Code Quality"
        />
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && <OverviewTab overview={overview} />}
          {activeTab === "files" && (
            <CriticalFilesTab
              files={overview?.criticalFiles}
              onFileClick={handleFileClick}
            />
          )}
          {activeTab === "recommendations" && (
            <RecommendationsTab
              recommendations={overview?.topRecommendations}
              projectPath={projectPath}
              onFileClick={handleFileClick}
            />
          )}
          {activeTab === "tests" && (
            <TestsTab
              testSummary={overview?.testSummary}
              projectPath={projectPath}
              onFileClick={handleFileClick}
            />
          )}
          {activeTab === "git" && (
            <GitTab gitStatus={overview?.gitStatus} projectPath={projectPath} />
          )}
          {activeTab === "quality" && (
            <CodeQualityTab
              metrics={overview?.metrics}
              languages={overview?.languages}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ==================== Helper Components ====================

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-slate-800/60 backdrop-blur rounded-lg p-4 border border-slate-700/50">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 border-b-2 ${
        active
          ? "text-emerald-400 border-emerald-400"
          : "text-slate-400 border-transparent hover:text-slate-300"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ==================== Tab Components ====================

function OverviewTab({ overview }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Metrics Overview */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">
          📈 Code Metrics
        </h3>

        <div className="space-y-3">
          <MetricBar
            label="Avg Complexity"
            value={overview?.metrics.avgComplexity || 0}
            max={20}
            color="text-purple-400"
            bgColor="bg-purple-500/20"
          />
          <MetricBar
            label="Maintainability"
            value={overview?.metrics.avgMaintainability || 0}
            max={100}
            color="text-blue-400"
            bgColor="bg-blue-500/20"
          />
          <MetricBar
            label="Test Coverage"
            value={overview?.metrics.overallTestCoverage || 0}
            max={100}
            color="text-emerald-400"
            bgColor="bg-emerald-500/20"
          />
          <MetricBar
            label="Duplication"
            value={overview?.metrics.duplicationPercentage || 0}
            max={30}
            color="text-orange-400"
            bgColor="bg-orange-500/20"
            inverse
          />
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Code Smells</div>
              <div className="text-xl font-bold text-yellow-400">
                {overview?.metrics.totalCodeSmells || 0}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Tech Debt</div>
              <div className="text-xl font-bold text-red-400">
                {Math.round((overview?.metrics.totalTechnicalDebt || 0) / 60)}h
              </div>
            </div>
            <div>
              <div className="text-slate-400">Defect Density</div>
              <div className="text-xl font-bold text-orange-400">
                {(overview?.metrics.defectDensity || 0).toFixed(2)}/1K LOC
              </div>
            </div>
            <div>
              <div className="text-slate-400">Avg Maintainability</div>
              <div className="text-xl font-bold text-blue-400">
                {Math.round(overview?.metrics.avgMaintainability || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Language Distribution */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">
          🗣️ Language Distribution
        </h3>

        <div className="space-y-3">
          {overview?.languages?.slice(0, 5).map((lang, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{lang.language}</span>
                <span className="text-slate-400">
                  {Math.round(lang.percentage)}%
                </span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${lang.percentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {lang.filesCount} files • {lang.linesOfCode.toLocaleString()}{" "}
                LOC
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Summary */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">
          🧪 Test Summary
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-700/30">
            <div className="text-3xl font-bold text-emerald-400">
              {overview?.testSummary?.passing || 0}
            </div>
            <div className="text-sm text-slate-400">✅ Passing</div>
          </div>
          <div className="bg-red-900/20 rounded-lg p-4 border border-red-700/30">
            <div className="text-3xl font-bold text-red-400">
              {overview?.testSummary?.failing || 0}
            </div>
            <div className="text-sm text-slate-400">❌ Failing</div>
          </div>
          <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/30">
            <div className="text-3xl font-bold text-yellow-400">
              {overview?.testSummary?.skipped || 0}
            </div>
            <div className="text-sm text-slate-400">⏭️ Skipped</div>
          </div>
          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/30">
            <div className="text-3xl font-bold text-blue-400">
              {overview?.testSummary?.totalTests || 0}
            </div>
            <div className="text-sm text-slate-400">📊 Total</div>
          </div>
        </div>

        {overview?.testSummary?.lastRunAt && (
          <div className="mt-4 text-xs text-slate-400">
            Last run:{" "}
            {new Date(overview.testSummary.lastRunAt).toLocaleString()}
            {overview.testSummary.duration && (
              <span>
                {" "}
                • Duration: {(overview.testSummary.duration / 1000).toFixed(2)}s
              </span>
            )}
          </div>
        )}
      </div>

      {/* Top Recommendations Preview */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">
          💡 Top Recommendations
        </h3>

        <div className="space-y-2">
          {overview?.topRecommendations?.slice(0, 5).map((rec, idx) => (
            <div
              key={idx}
              className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">
                  {rec.type === "fix"
                    ? "🔧"
                    : rec.type === "test"
                    ? "🧪"
                    : rec.type === "refactor"
                    ? "✨"
                    : "📝"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        rec.priority === "critical"
                          ? "bg-red-900/50 text-red-300"
                          : rec.priority === "high"
                          ? "bg-orange-900/50 text-orange-300"
                          : rec.priority === "medium"
                          ? "bg-yellow-900/50 text-yellow-300"
                          : "bg-slate-700/50 text-slate-300"
                      }`}
                    >
                      {rec.priority}
                    </span>
                    <span className="text-xs text-slate-500">
                      {rec.estimatedEffort}min
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 truncate">
                    {rec.title}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricBar({ label, value, max, color, bgColor, inverse = false }) {
  const percentage = Math.min((value / max) * 100, 100);
  const displayValue = typeof value === "number" ? Math.round(value) : value;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className={color}>{displayValue}</span>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-2">
        <div
          className={`${bgColor} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function CriticalFilesTab({ files, onFileClick }) {
  if (!files || files.length === 0) {
    return (
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-12 text-center border border-slate-700/50">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-emerald-400 mb-2">
          No Critical Files!
        </h3>
        <p className="text-slate-400">
          All files are within acceptable quality thresholds.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 backdrop-blur rounded-lg border border-slate-700/50 overflow-hidden">
      <div className="p-4 bg-slate-900/50 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-amber-400">
          ⚠️ Files Needing Attention
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Click a file to view details and open in editor
        </p>
      </div>

      <div className="divide-y divide-slate-700">
        {files.map((file, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onFileClick(file.filePath, file)}
            className="p-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-mono text-sm text-emerald-400 mb-1">
                  {file.filePath}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{file.language}</span>
                  <span>•</span>
                  <span>{file.linesOfCode} LOC</span>
                </div>
              </div>

              <div className="flex gap-2">
                {file.cyclomaticComplexity > 15 && (
                  <span className="px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded border border-purple-700/50">
                    Complexity: {file.cyclomaticComplexity}
                  </span>
                )}
                {file.maintainabilityIndex < 40 && (
                  <span className="px-2 py-1 bg-orange-900/30 text-orange-300 text-xs rounded border border-orange-700/50">
                    Maintainability: {Math.round(file.maintainabilityIndex)}
                  </span>
                )}
                {file.testFailures.length > 0 && (
                  <span className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded border border-red-700/50">
                    {file.testFailures.length} Test Failures
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-900/50 rounded p-2">
                <div className="text-slate-500">Complexity</div>
                <div
                  className={`font-bold ${
                    file.cyclomaticComplexity > 20
                      ? "text-red-400"
                      : file.cyclomaticComplexity > 10
                      ? "text-yellow-400"
                      : "text-emerald-400"
                  }`}
                >
                  {file.cyclomaticComplexity}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded p-2">
                <div className="text-slate-500">Maintainability</div>
                <div
                  className={`font-bold ${
                    file.maintainabilityIndex < 40
                      ? "text-red-400"
                      : file.maintainabilityIndex < 60
                      ? "text-yellow-400"
                      : "text-emerald-400"
                  }`}
                >
                  {Math.round(file.maintainabilityIndex)}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded p-2">
                <div className="text-slate-500">Coverage</div>
                <div
                  className={`font-bold ${
                    file.testCoverage < 50
                      ? "text-red-400"
                      : file.testCoverage < 70
                      ? "text-yellow-400"
                      : "text-emerald-400"
                  }`}
                >
                  {Math.round(file.testCoverage)}%
                </div>
              </div>
              <div className="bg-slate-900/50 rounded p-2">
                <div className="text-slate-500">Code Smells</div>
                <div
                  className={`font-bold ${
                    file.codeSmells > 5
                      ? "text-red-400"
                      : file.codeSmells > 2
                      ? "text-yellow-400"
                      : "text-emerald-400"
                  }`}
                >
                  {file.codeSmells}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RecommendationsTab({ recommendations, projectPath, onFileClick }) {
  const [filter, setFilter] = useState("all");

  const filtered =
    recommendations?.filter(
      (rec) =>
        filter === "all" || rec.priority === filter || rec.type === filter
    ) || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
        />
        <FilterButton
          active={filter === "critical"}
          onClick={() => setFilter("critical")}
          label="Critical"
          color="text-red-400"
        />
        <FilterButton
          active={filter === "high"}
          onClick={() => setFilter("high")}
          label="High"
          color="text-orange-400"
        />
        <FilterButton
          active={filter === "test"}
          onClick={() => setFilter("test")}
          label="Tests"
        />
        <FilterButton
          active={filter === "refactor"}
          onClick={() => setFilter("refactor")}
          label="Refactor"
        />
        <FilterButton
          active={filter === "fix"}
          onClick={() => setFilter("fix")}
          label="Fixes"
        />
      </div>

      {/* Recommendations List */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg border border-slate-700/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-xl font-semibold text-emerald-400 mb-2">
              No Recommendations
            </h3>
            <p className="text-slate-400">Your code quality looks good!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {filtered.map((rec, idx) => (
              <RecommendationCard
                key={idx}
                recommendation={rec}
                onClick={() => onFileClick(rec.filePath)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">
          {recommendation.type === "fix"
            ? "🔧"
            : recommendation.type === "test"
            ? "🧪"
            : recommendation.type === "refactor"
            ? "✨"
            : recommendation.type === "optimize"
            ? "⚡"
            : "📝"}
        </span>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                recommendation.priority === "critical"
                  ? "bg-red-900/50 text-red-300 border border-red-700/50"
                  : recommendation.priority === "high"
                  ? "bg-orange-900/50 text-orange-300 border border-orange-700/50"
                  : recommendation.priority === "medium"
                  ? "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50"
                  : "bg-slate-700/50 text-slate-300 border border-slate-600/50"
              }`}
            >
              {recommendation.priority.toUpperCase()}
            </span>

            <span className="text-xs text-slate-500">
              {recommendation.estimatedEffort} min
            </span>

            {recommendation.autoFixAvailable && (
              <span className="text-xs px-2 py-1 bg-emerald-900/30 text-emerald-300 rounded border border-emerald-700/50">
                ⚡ Auto-fix available
              </span>
            )}
          </div>

          <h4 className="text-sm font-semibold text-slate-200 mb-1">
            {recommendation.title}
          </h4>
          <p className="text-sm text-slate-400 mb-2">
            {recommendation.description}
          </p>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">📁</span>
            <span className="font-mono text-emerald-400">
              {recommendation.filePath}
            </span>
          </div>

          {recommendation.suggestedAction && (
            <div className="mt-2 bg-slate-900/50 rounded p-2 text-xs text-slate-300">
              💡 {recommendation.suggestedAction}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TestsTab({ testSummary, projectPath, onFileClick }) {
  const [testFailures, setTestFailures] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTestFailures = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${backendUrl}/api/project-health/test-failures?projectPath=${encodeURIComponent(
            projectPath
          )}`
        );

        const data = await response.json();
        if (data.success) {
          setTestFailures(data.testFailures);
        }
      } catch (error) {
        console.error("Fetch test failures error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (projectPath) {
      fetchTestFailures();
    }
  }, [projectPath]);

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400">
        Loading test data...
      </div>
    );
  }

  const successRate =
    testSummary?.totalTests > 0
      ? ((testSummary.passing / testSummary.totalTests) * 100).toFixed(1)
      : 0;

  return (
    <div className="space-y-6">
      {/* Test Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 backdrop-blur rounded-lg p-4 border border-slate-700/50">
          <div className="text-sm text-slate-400 mb-1">Success Rate</div>
          <div
            className={`text-3xl font-bold ${
              successRate >= 90
                ? "text-emerald-400"
                : successRate >= 70
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {successRate}%
          </div>
        </div>

        <div className="bg-emerald-900/20 backdrop-blur rounded-lg p-4 border border-emerald-700/30">
          <div className="text-sm text-slate-400 mb-1">✅ Passing</div>
          <div className="text-3xl font-bold text-emerald-400">
            {testSummary?.passing || 0}
          </div>
        </div>

        <div className="bg-red-900/20 backdrop-blur rounded-lg p-4 border border-red-700/30">
          <div className="text-sm text-slate-400 mb-1">❌ Failing</div>
          <div className="text-3xl font-bold text-red-400">
            {testSummary?.failing || 0}
          </div>
        </div>

        <div className="bg-yellow-900/20 backdrop-blur rounded-lg p-4 border border-yellow-700/30">
          <div className="text-sm text-slate-400 mb-1">⏭️ Skipped</div>
          <div className="text-3xl font-bold text-yellow-400">
            {testSummary?.skipped || 0}
          </div>
        </div>
      </div>

      {/* Test Failures */}
      {testFailures.length > 0 && (
        <div className="bg-slate-800/60 backdrop-blur rounded-lg border border-slate-700/50 overflow-hidden">
          <div className="p-4 bg-red-900/20 border-b border-red-700/30">
            <h3 className="text-lg font-semibold text-red-400">
              ❌ Test Failures
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Click to view file and fix issues
            </p>
          </div>

          <div className="divide-y divide-slate-700">
            {testFailures.map((file, idx) => (
              <div
                key={idx}
                onClick={() => onFileClick(file.filePath)}
                className="p-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
              >
                <div className="font-mono text-sm text-emerald-400 mb-2">
                  {file.fileName}
                </div>

                <div className="space-y-2">
                  {file.failures.map((failure, fIdx) => (
                    <div key={fIdx} className="bg-slate-900/50 rounded p-3">
                      <div className="text-sm font-semibold text-slate-200 mb-1">
                        {failure.testName}
                      </div>
                      <div className="text-xs text-red-400 font-mono">
                        {failure.error}
                      </div>
                      {failure.line && (
                        <div className="text-xs text-slate-500 mt-1">
                          Line {failure.line}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GitTab({ gitStatus, projectPath }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Current Branch */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">
          🔀 Current Branch
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded">
            <span className="text-slate-400">Branch</span>
            <span className="font-mono text-emerald-400">
              {gitStatus?.currentBranch || "N/A"}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded">
            <span className="text-slate-400">Status</span>
            <span
              className={
                gitStatus?.isDirty ? "text-yellow-400" : "text-emerald-400"
              }
            >
              {gitStatus?.isDirty ? "⚠️ Uncommitted changes" : "✅ Clean"}
            </span>
          </div>

          {gitStatus?.isDirty && (
            <div className="flex items-center justify-between p-3 bg-yellow-900/20 rounded border border-yellow-700/30">
              <span className="text-slate-400">Uncommitted Files</span>
              <span className="font-bold text-yellow-400">
                {gitStatus.uncommittedChanges}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pending PRs */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">
          📋 Pending PRs
        </h3>

        {!gitStatus?.pendingPRs || gitStatus.pendingPRs === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">✅</div>
            <p>No pending pull requests</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl font-bold text-purple-400">
              {gitStatus.pendingPRs}
            </div>
            <p className="text-slate-400 text-sm mt-2">Open pull requests</p>
          </div>
        )}
      </div>

      {/* Branches */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-6 border border-slate-700/50 md:col-span-2">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">
          🌿 Branches
        </h3>

        {!gitStatus?.branches || gitStatus.branches === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No branch data available
          </div>
        ) : (
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">
              {gitStatus.branches}
            </div>
            <p className="text-slate-400 text-sm mt-2">Total branches</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeQualityTab({ metrics, languages }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Quality Metrics */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">
          ✨ Quality Metrics
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Avg Complexity</span>
              <span className="text-purple-400">
                {(metrics?.avgComplexity || 0).toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2">
              <div
                className="bg-purple-500/50 h-2 rounded-full"
                style={{
                  width: `${Math.min((metrics?.avgComplexity || 0) * 5, 100)}%`,
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Maintainability</span>
              <span className="text-blue-400">
                {(metrics?.avgMaintainability || 0).toFixed(0)}
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2">
              <div
                className="bg-blue-500/50 h-2 rounded-full"
                style={{ width: `${metrics?.avgMaintainability || 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Test Coverage</span>
              <span className="text-emerald-400">
                {(metrics?.overallTestCoverage || 0).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2">
              <div
                className="bg-emerald-500/50 h-2 rounded-full"
                style={{ width: `${metrics?.overallTestCoverage || 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Duplication</span>
              <span className="text-orange-400">
                {(metrics?.duplicationPercentage || 0).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2">
              <div
                className="bg-orange-500/50 h-2 rounded-full"
                style={{
                  width: `${Math.min(
                    (metrics?.duplicationPercentage || 0) * 3,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">
          📊 Detailed Stats
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded p-3">
            <div className="text-xs text-slate-400 mb-1">Code Smells</div>
            <div className="text-2xl font-bold text-yellow-400">
              {metrics?.totalCodeSmells || 0}
            </div>
          </div>

          <div className="bg-slate-900/50 rounded p-3">
            <div className="text-xs text-slate-400 mb-1">Technical Debt</div>
            <div className="text-2xl font-bold text-red-400">
              {Math.round((metrics?.totalTechnicalDebt || 0) / 60)}h
            </div>
          </div>

          <div className="bg-slate-900/50 rounded p-3">
            <div className="text-xs text-slate-400 mb-1">Defect Density</div>
            <div className="text-2xl font-bold text-orange-400">
              {(metrics?.defectDensity || 0).toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">per 1K LOC</div>
          </div>

          <div className="bg-slate-900/50 rounded p-3">
            <div className="text-xs text-slate-400 mb-1">
              Avg Maintainability
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {Math.round(metrics?.avgMaintainability || 0)}
            </div>
            <div className="text-xs text-slate-500">out of 100</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label, color = "text-emerald-400" }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? `bg-emerald-900/30 ${color} border border-emerald-700/50`
          : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60"
      }`}
    >
      {label}
    </button>
  );
}
