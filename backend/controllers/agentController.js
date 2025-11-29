const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const { callWatsonx } = require("../services/llmService");
const { embedTexts } = require("../services/embeddingService");
const { runInContainer } = require("../services/runnerService");
const gitService = require("../services/gitService");
const getQdrantClient = require("../config/qdrant");
const codeReviewService = require("../services/codeReviewService");
const predictionService = require("../services/predictionService");
const metricsService = require("../services/metricsService");
const fileManagerService = require("../services/fileManagerService");

const SANDBOX_PATH = path.resolve(__dirname, "../sandbox");
const COLLECTION = process.env.QDRANT_COLLECTION || "Hackathons"; // Updated to match .env

// Ensure sandbox exists
if (!fs.existsSync(SANDBOX_PATH)) {
  fs.mkdirSync(SANDBOX_PATH, { recursive: true });
}

function sanitizePath(targetPath) {
  const normalized = path.normalize(targetPath).replace(/^(\.\.[\/\\])+/, "");
  const safePath = path.join(SANDBOX_PATH, normalized);

  if (!safePath.startsWith(SANDBOX_PATH)) {
    throw new Error("Access denied: Path traversal detected");
  }

  return safePath;
}

async function embedQuery(query) {
  console.log(
    `[Embedding Service] Embedding query: "${query.slice(0, 80)}..."`
  );
  const [vector] = await embedTexts([query]);
  console.log(`[Embedding Service] Generated ${vector.length}-dim vector`);
  return vector;
}

exports.processIntent = async (req, res) => {
  const { transcript } = req.body;
  const io = req.app.get("io");

  try {
    console.log("[Intent Agent] Processing:", transcript);
    io.emit("agent_update", { message: "Analyzing intent..." });

    // Heuristic-based intent detection for reliability
    let intent = detectIntentHeuristic(transcript);

    // If heuristic is uncertain, use LLM as fallback
    if (intent.confidence < 0.7) {
      console.log("[Intent Agent] Using LLM fallback");
      const prompt = `You are an intent classifier for a coding assistant. Analyze the user's request and classify it into one of these intents:
- generate_code: user wants to create/write code or a component
- rag_answer: user asks questions about architecture, documentation, or how things work
- run_test: user wants to run tests or execute code
- debug_issue: user reports errors or wants to fix bugs
- git_operation: user wants git actions (commit, branch, PR)
- file_operation: user wants to read/write/modify files directly
- unknown: cannot determine intent

User request: "${transcript}"

Return ONLY a JSON object with this exact format:
{"type": "intent_name", "confidence": 0.95}`;

      const { text } = await callWatsonx(prompt, {
        maxNewTokens: 100,
        temperature: 0.1,
      });

      try {
        const llmIntent = JSON.parse(text.trim());
        if (llmIntent.confidence > intent.confidence) {
          intent = llmIntent;
        }
      } catch (parseErr) {
        console.log("[Intent Agent] LLM parse failed, using heuristic");
      }
    }

    intent.original = transcript;
    console.log(
      `[Intent Agent] Detected: ${intent.type} (confidence: ${intent.confidence})`
    );
    io.emit("agent_update", { message: `Intent detected: ${intent.type}` });

    res.json(intent);
  } catch (error) {
    console.error("[Intent Agent] Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Heuristic intent detection based on keywords
function detectIntentHeuristic(text) {
  const lower = text.toLowerCase();

  // Generate code / create file
  if (
    /(create|generate|make|build|write|add)\s+(a\s+)?(component|function|class|file|code|react|jsx|tsx|js|py|cpp)/i.test(
      lower
    )
  ) {
    return { type: "generate_code", confidence: 0.9 };
  }

  // RAG / Documentation questions
  if (
    /(what|how|explain|tell me|describe|show me|documentation|architecture|workflow|agents?|communicate)/i.test(
      lower
    ) &&
    !/(create|generate|make|write)/i.test(lower)
  ) {
    return { type: "rag_answer", confidence: 0.85 };
  }

  // Run tests
  if (
    /(run|execute|start)\s+(test|tests|testing|jest|mocha|pytest)/i.test(lower)
  ) {
    return { type: "run_test", confidence: 0.9 };
  }

  // Debug
  if (
    /(debug|fix|error|bug|issue|problem|failing|broken|not working)/i.test(
      lower
    )
  ) {
    return { type: "debug_issue", confidence: 0.85 };
  }

  // Git operations
  if (/(git|commit|push|pull|branch|merge|pr|pull request)/i.test(lower)) {
    return { type: "git_operation", confidence: 0.9 };
  }

  // File operations
  if (/(read|open|show|display|view)\s+(file|code)/i.test(lower)) {
    return { type: "file_operation", confidence: 0.85 };
  }

  // Default to RAG for questions, generate_code for requests
  if (/\?|what|why|when|where|who/i.test(lower)) {
    return { type: "rag_answer", confidence: 0.6 };
  }

  // Fallback to code generation if it seems like a request
  if (lower.length > 10) {
    return { type: "generate_code", confidence: 0.5 };
  }

  return { type: "unknown", confidence: 0.3 };
}

exports.generateCode = async (req, res) => {
  const { prompt, context, skipRAG = false } = req.body;
  const io = req.app.get("io");

  try {
    console.log("[CodeGen Agent] Request:", prompt);
    io.emit("agent_update", { message: "Generating code..." });

    let ragContext = context || [];

    // Automatically retrieve RAG context if not provided and not explicitly skipped
    if (!skipRAG && (!context || context.length === 0)) {
      console.log("[CodeGen Agent] Retrieving RAG context...");
      io.emit("agent_update", {
        message: "Retrieving relevant documentation...",
      });

      try {
        const vector = await embedQuery(prompt);
        console.log("[CodeGen Agent] Embedded query, searching Qdrant...");

        const qdrant = getQdrantClient();
        const results = await qdrant.search(COLLECTION, {
          vector,
          limit: 5,
          with_payload: true,
        });

        console.log(
          `[CodeGen Agent] Retrieved ${results.length} context chunks`
        );
        ragContext = results.map((item) => ({
          score: item.score,
          path: item.payload?.path || "unknown",
          chunk: item.payload?.chunk || item.payload?.text || "",
        }));

        io.emit("agent_update", {
          message: `Found ${ragContext.length} relevant documentation chunks`,
        });
      } catch (ragError) {
        console.error("[CodeGen Agent] RAG retrieval failed:", ragError);
        // Continue without RAG context
      }
    }

    // Format context for LLM prompt
    const contextText = ragContext
      .map(
        (doc, idx) => `[Context ${idx + 1}] (relevance: ${
          doc.score?.toFixed(2) || "N/A"
        })
Source: ${doc.path}
Content: ${doc.chunk}`
      )
      .join("\n\n---\n\n");

    console.log(
      `[CodeGen Agent] Using ${ragContext.length} context chunks in prompt`
    );

    const fullPrompt = buildCodeGenPrompt(prompt, contextText);
    console.log("[CodeGen Agent] Calling Watsonx...");

    const { text } = await callWatsonx(fullPrompt, {
      maxNewTokens: 1000,
      temperature: 0.3,
    });

    console.log("[CodeGen Agent] Code generated successfully");
    io.emit("agent_update", { message: "Code generation complete!" });

    res.json({
      code: text,
      contextUsed: ragContext.length,
      sources: ragContext.map((c) => c.path),
    });
  } catch (error) {
    console.error("[CodeGen Agent] Error:", error);
    io.emit("agent_update", {
      message: `Error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

function buildCodeGenPrompt(userRequest, ragContext) {
  let prompt = `You are an expert software developer assistant specializing in generating clean, production-ready code.

SYSTEM INSTRUCTIONS:
- Generate complete, runnable code based on the user's request
- Follow best practices and coding standards
- Include necessary imports and dependencies
- Add brief inline comments for complex logic
- Ensure code is idiomatic for the target language
- If the context includes relevant examples or patterns, use them as guidance\n\n`;

  if (ragContext && ragContext.trim().length > 0) {
    prompt += `RELEVANT DOCUMENTATION AND CONTEXT:
${ragContext}

Use the above context to inform your code generation. Follow any patterns or conventions shown in the documentation.\n\n`;
  }

  prompt += `USER REQUEST:
${userRequest}

Generate the requested code below. Provide only the code without additional explanation unless specifically requested:\n\n`;

  return prompt;
}

exports.handleFileOperation = async (req, res) => {
  const { filePath, content, operation } = req.body;
  const io = req.app.get("io");

  try {
    const safePath = sanitizePath(filePath);

    if (operation === "write") {
      fs.mkdirSync(path.dirname(safePath), { recursive: true });
      fs.writeFileSync(safePath, content);
      io.emit("agent_update", { message: `File written: ${filePath}` });
      res.json({ success: true, path: filePath });
    } else if (operation === "read") {
      if (fs.existsSync(safePath)) {
        const data = fs.readFileSync(safePath, "utf-8");
        res.json({ content: data });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } else {
      res.status(400).json({ error: "Invalid operation" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.retrieveContext = async (req, res) => {
  const { query, topK = 5 } = req.body;
  const io = req.app.get("io");

  try {
    console.log("[Retrieval Agent] Query:", query);
    console.log(`[Retrieval Agent] Retrieving top ${topK} chunks`);
    io.emit("agent_update", { message: "Searching knowledge base..." });

    const vector = await embedQuery(query);
    console.log(
      `[Retrieval Agent] Embedding generated: ${vector.length} dimensions`
    );

    const qdrant = getQdrantClient();
    console.log(`[Retrieval Agent] Searching collection: ${COLLECTION}`);

    const results = await qdrant.search(COLLECTION, {
      vector,
      limit: topK,
      with_payload: true,
    });

    console.log(`[Retrieval Agent] Found ${results.length} results`);

    const formattedResults = results.map((item) => ({
      score: item.score,
      path: item.payload?.path || "unknown",
      chunk: item.payload?.chunk || item.payload?.text || "",
    }));

    // Log top results for debugging
    formattedResults.slice(0, 3).forEach((r, idx) => {
      console.log(
        `  [${idx + 1}] Score: ${r.score.toFixed(3)}, Source: ${r.path}`
      );
    });

    io.emit("agent_update", {
      message: `Retrieved ${results.length} relevant documents`,
    });

    res.json({
      results: formattedResults,
      query,
      collection: COLLECTION,
    });
  } catch (error) {
    console.error("[Retrieval Agent] Error:", error);
    io.emit("agent_update", {
      message: `Retrieval error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

exports.runCommand = async (req, res) => {
  const { command } = req.body;
  const io = req.app.get("io");

  io.emit("agent_update", { message: `Executing: ${command}` });

  const useDocker = process.env.USE_DOCKER_RUNNER === "true";

  if (useDocker) {
    // Use Docker runner for isolation
    try {
      runInContainer(command, io);
      res.json({ success: true, message: "Command running in container" });
    } catch (error) {
      io.emit("command_output", { type: "error", data: error.message });
      res.json({ success: false, error: error.message });
    }
  } else {
    // Fallback to local exec (legacy)
    exec(command, { cwd: SANDBOX_PATH }, (error, stdout, stderr) => {
      if (error) {
        io.emit("command_output", {
          type: "error",
          data: stderr || error.message,
        });
        return res.json({ success: false, error: error.message, stderr });
      }
      io.emit("command_output", { type: "stdout", data: stdout });
      res.json({ success: true, stdout, stderr });
    });
  }
};

exports.handleGitOperation = async (req, res) => {
  const { action, branchName, message, files, prOptions } = req.body;
  const io = req.app.get("io");

  try {
    switch (action) {
      case "create_branch":
        io.emit("agent_update", { message: `Creating branch: ${branchName}` });
        const branchResult = await gitService.createBranch(
          branchName,
          SANDBOX_PATH
        );
        res.json(branchResult);
        break;

      case "commit":
        io.emit("agent_update", { message: `Committing changes: ${message}` });
        const commitResult = await gitService.commitChanges(
          message,
          files,
          SANDBOX_PATH
        );
        res.json(commitResult);
        break;

      case "push":
        io.emit("agent_update", { message: `Pushing branch: ${branchName}` });
        const pushResult = await gitService.pushBranch(
          branchName,
          "origin",
          SANDBOX_PATH
        );
        res.json(pushResult);
        break;

      case "create_pr":
        io.emit("agent_update", { message: "Creating pull request..." });
        const prResult = await gitService.createPullRequest(prOptions);
        if (prResult.success) {
          io.emit("agent_update", { message: `PR created: ${prResult.prUrl}` });
        }
        res.json(prResult);
        break;

      case "status":
        const statusResult = await gitService.hasUncommittedChanges(
          SANDBOX_PATH
        );
        const currentBranch = await gitService.getCurrentBranch(SANDBOX_PATH);
        res.json({ ...statusResult, ...currentBranch });
        break;

      default:
        res.status(400).json({ error: "Invalid git action" });
    }
  } catch (error) {
    io.emit("agent_update", {
      message: `Git error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Multi-Agent Orchestration: Unified chat endpoint that handles full workflow
 * Intent -> Retrieve (if needed) -> Generate -> File (if needed) -> Run (if needed)
 */
exports.chatOrchestrate = async (req, res) => {
  const { message, autoExecute = false } = req.body;
  const io = req.app.get("io");

  try {
    console.log("\n========================================");
    console.log("[Orchestrator] New chat request:", message);
    console.log("========================================\n");

    io.emit("agent_update", { message: "Processing your request..." });

    // Step 1: Detect Intent
    console.log("[Orchestrator] Step 1: Intent Detection");
    const intent = detectIntentHeuristic(message);
    console.log(`[Orchestrator] Intent: ${intent.type} (${intent.confidence})`);
    io.emit("agent_update", { message: `Intent: ${intent.type}` });

    let response = {
      intent: intent.type,
      confidence: intent.confidence,
      message: message,
    };

    // Step 2: Handle based on intent
    switch (intent.type) {
      case "rag_answer":
        console.log("[Orchestrator] Step 2: RAG-based answer");
        response = await handleRAGAnswer(message, io);
        break;

      case "generate_code":
      case "create_file":
        console.log("[Orchestrator] Step 2: Code generation with RAG");
        response = await handleCodeGeneration(message, io, autoExecute);
        break;

      case "run_test":
        console.log("[Orchestrator] Step 2: Running tests");
        response = await handleTestRun(message, io);
        break;

      case "debug_issue":
        console.log("[Orchestrator] Step 2: Debug analysis");
        response = await handleDebug(message, io);
        break;

      case "file_operation":
        console.log("[Orchestrator] Step 2: File operation");
        response.message = "File operation endpoint - use /file directly";
        break;

      case "git_operation":
        console.log("[Orchestrator] Step 2: Git operation");
        response.message = "Git operation endpoint - use /git directly";
        break;

      default:
        console.log("[Orchestrator] Step 2: Default RAG fallback");
        response = await handleRAGAnswer(message, io);
    }

    console.log("\n[Orchestrator] ✓ Request completed\n");
    res.json(response);
  } catch (error) {
    console.error("[Orchestrator] Error:", error);
    io.emit("agent_update", {
      message: `Error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

// Handler for RAG-based answers
async function handleRAGAnswer(query, io) {
  console.log("[RAG Handler] Retrieving context...");
  io.emit("agent_update", { message: "Searching documentation..." });

  // Retrieve relevant context
  const vector = await embedQuery(query);
  const qdrant = getQdrantClient();
  const results = await qdrant.search(COLLECTION, {
    vector,
    limit: 5,
    with_payload: true,
  });

  console.log(`[RAG Handler] Found ${results.length} relevant chunks`);

  const ragContext = results.map((item) => ({
    score: item.score,
    path: item.payload?.path || "unknown",
    chunk: item.payload?.chunk || item.payload?.text || "",
  }));

  // Format context for LLM
  const contextText = ragContext
    .map(
      (doc, idx) => `[Document ${idx + 1}] (relevance: ${doc.score.toFixed(2)})
Source: ${doc.path}
Content: ${doc.chunk}`
    )
    .join("\n\n---\n\n");

  console.log("[RAG Handler] Generating answer with context...");
  io.emit("agent_update", { message: "Generating answer..." });

  const prompt = `You are a helpful assistant that answers questions about the CodeEcho project using the provided documentation.

DOCUMENTATION CONTEXT:
${contextText}

USER QUESTION:
${query}

Provide a clear, accurate answer based on the documentation above. If the documentation doesn't contain enough information, say so. Always cite which documents you're referencing.

ANSWER:`;

  const { text } = await callWatsonx(prompt, {
    maxNewTokens: 800,
    temperature: 0.3,
  });

  console.log("[RAG Handler] Answer generated");
  io.emit("agent_update", { message: "Answer ready!" });

  return {
    intent: "rag_answer",
    answer: text,
    sources: ragContext.map((c) => ({ path: c.path, score: c.score })),
    contextsUsed: ragContext.length,
  };
}

// Handler for code generation with RAG
async function handleCodeGeneration(query, io, autoExecute = false) {
  console.log("[CodeGen Handler] Starting code generation...");
  io.emit("agent_update", { message: "Retrieving relevant examples..." });

  // Retrieve context
  const vector = await embedQuery(query);
  const qdrant = getQdrantClient();
  const results = await qdrant.search(COLLECTION, {
    vector,
    limit: 3,
    with_payload: true,
  });

  const ragContext = results.map((item) => ({
    score: item.score,
    path: item.payload?.path || "unknown",
    chunk: item.payload?.chunk || item.payload?.text || "",
  }));

  const contextText = ragContext
    .map(
      (doc, idx) => `[Context ${idx + 1}]
Source: ${doc.path}
${doc.chunk}`
    )
    .join("\n\n---\n\n");

  console.log("[CodeGen Handler] Generating code...");
  io.emit("agent_update", { message: "Generating code..." });

  const fullPrompt = buildCodeGenPrompt(query, contextText);
  const { text } = await callWatsonx(fullPrompt, {
    maxNewTokens: 1200,
    temperature: 0.3,
  });

  console.log("[CodeGen Handler] Code generated");

  // Try to extract filename from query or code
  const filename = extractFilename(query, text);

  let fileWritten = false;
  if (autoExecute && filename) {
    console.log(`[CodeGen Handler] Auto-writing to ${filename}`);
    io.emit("agent_update", { message: `Writing to ${filename}...` });

    try {
      const safePath = sanitizePath(filename);
      fs.mkdirSync(path.dirname(safePath), { recursive: true });
      fs.writeFileSync(safePath, text);
      fileWritten = true;
      io.emit("agent_update", { message: `✓ File written: ${filename}` });
      console.log(`[CodeGen Handler] File written: ${safePath}`);
    } catch (err) {
      console.error("[CodeGen Handler] File write error:", err);
    }
  }

  return {
    intent: "generate_code",
    code: text,
    suggestedFilename: filename,
    fileWritten,
    sources: ragContext.map((c) => c.path),
    contextsUsed: ragContext.length,
  };
}

// Handler for test runs
async function handleTestRun(query, io) {
  console.log("[Test Handler] Preparing to run tests...");
  io.emit("agent_update", { message: "Running tests..." });

  return {
    intent: "run_test",
    message: "Use /run endpoint to execute test commands",
    suggestion: "POST /api/agents/run with { command: 'npm test' }",
  };
}

// Handler for debugging
async function handleDebug(query, io) {
  console.log("[Debug Handler] Analyzing issue...");
  io.emit("agent_update", { message: "Analyzing debug request..." });

  // Retrieve relevant code/docs
  const vector = await embedQuery(query);
  const qdrant = getQdrantClient();
  const results = await qdrant.search(COLLECTION, {
    vector,
    limit: 3,
    with_payload: true,
  });

  const ragContext = results.map((item) => ({
    path: item.payload?.path || "unknown",
    chunk: item.payload?.chunk || item.payload?.text || "",
  }));

  const contextText = ragContext
    .map((doc, idx) => `[Reference ${idx + 1}] ${doc.path}\n${doc.chunk}`)
    .join("\n\n---\n\n");

  const prompt = `You are a debugging assistant. Help analyze and fix the issue described by the user.

RELEVANT CODE/DOCUMENTATION:
${contextText}

USER'S ISSUE:
${query}

Provide:
1. Analysis of the problem
2. Likely causes
3. Suggested fixes
4. Code examples if applicable

RESPONSE:`;

  const { text } = await callWatsonx(prompt, {
    maxNewTokens: 1000,
    temperature: 0.3,
  });

  return {
    intent: "debug_issue",
    analysis: text,
    sources: ragContext.map((c) => c.path),
  };
}

// Extract filename from query or code
function extractFilename(query, code) {
  // Try to find filename in query
  const filenameMatch = query.match(
    /(?:create|generate|make|write)\s+(?:a\s+)?(?:file\s+)?(?:named\s+|called\s+)?[`"']?([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)[`"']?/i
  );
  if (filenameMatch) {
    return filenameMatch[1];
  }

  // Try to infer from component name
  const componentMatch = query.match(
    /(?:create|generate|make)\s+(?:a\s+)?(\w+)(?:\s+component)?/i
  );
  if (componentMatch) {
    const name = componentMatch[1];
    // Determine extension based on keywords
    if (/react|jsx|component/i.test(query)) {
      return `${name}.jsx`;
    } else if (/typescript|tsx/i.test(query)) {
      return `${name}.tsx`;
    } else if (/javascript|js/i.test(query)) {
      return `${name}.js`;
    } else if (/python|py/i.test(query)) {
      return `${name}.py`;
    }
    return `${name}.js`; // default
  }

  // Default generic name based on code content
  if (code.includes("class ") || code.includes("function ")) {
    return "generated_code.js";
  }

  return "generated_file.txt";
}

/**
 * AI-Assisted Code Review Handler
 * Analyzes a single file for bugs, code smells, and optimization opportunities
 * Integrates with RAG for context-aware suggestions
 */
exports.reviewCode = async (req, res) => {
  const { filePath, code, useRAG = true } = req.body;
  const io = req.app.get("io");

  try {
    console.log("\n========================================");
    console.log(`[Code Review Agent] Reviewing file: ${filePath}`);
    console.log("========================================\n");

    if (!filePath || !code) {
      return res.status(400).json({
        error: "Missing required fields: filePath and code",
      });
    }

    io.emit("agent_update", { message: "Starting code review..." });

    // Step 1: Retrieve relevant context from RAG (optional)
    let ragContext = [];
    if (useRAG) {
      console.log("[Code Review Agent] Retrieving RAG context...");
      io.emit("agent_update", {
        message: "Retrieving project best practices...",
      });

      try {
        ragContext = await codeReviewService.retrieveReviewContext(
          filePath,
          code
        );
        console.log(
          `[Code Review Agent] Retrieved ${ragContext.length} context chunks`
        );
        io.emit("agent_update", {
          message: `Found ${ragContext.length} relevant context items`,
        });
      } catch (ragError) {
        console.error("[Code Review Agent] RAG retrieval failed:", ragError);
        // Continue without RAG context
      }
    }

    // Step 2: Analyze code with AI
    console.log("[Code Review Agent] Analyzing code with AI...");
    io.emit("agent_update", { message: "Analyzing code quality..." });

    const analysisResult = await codeReviewService.analyzeCode(
      filePath,
      code,
      ragContext
    );

    if (!analysisResult.success) {
      throw new Error(analysisResult.error);
    }

    console.log(
      `[Code Review Agent] Analysis complete: ${analysisResult.analysis.issues.length} issues, ${analysisResult.analysis.suggestions.length} suggestions`
    );

    io.emit("agent_update", {
      message: `Code review complete! Found ${analysisResult.analysis.issues.length} issues and ${analysisResult.analysis.suggestions.length} improvement suggestions.`,
    });

    res.json({
      success: true,
      filePath,
      language: analysisResult.language,
      analysis: analysisResult.analysis,
      contextUsed: ragContext.length,
      sources: ragContext.map((c) => ({ path: c.path, score: c.score })),
    });
  } catch (error) {
    console.error("[Code Review Agent] Error:", error);
    io.emit("agent_update", {
      message: `Review error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Apply Refactoring Handler
 * Generates refactored code based on user-approved suggestions
 */
exports.applyRefactoring = async (req, res) => {
  const { filePath, code, approvedSuggestions } = req.body;
  const io = req.app.get("io");

  try {
    console.log("\n========================================");
    console.log(
      `[Refactoring Agent] Applying ${
        approvedSuggestions?.length || 0
      } suggestions to ${filePath}`
    );
    console.log("========================================\n");

    if (!filePath || !code || !approvedSuggestions) {
      return res.status(400).json({
        error:
          "Missing required fields: filePath, code, and approvedSuggestions",
      });
    }

    if (approvedSuggestions.length === 0) {
      return res.status(400).json({
        error: "No suggestions selected for refactoring",
      });
    }

    io.emit("agent_update", {
      message: `Applying ${approvedSuggestions.length} refactoring suggestions...`,
    });

    // Detect language
    const language = codeReviewService.detectLanguage(filePath);

    // Generate refactored code
    console.log("[Refactoring Agent] Generating refactored code...");
    const result = await codeReviewService.generateRefactoredCode(
      code,
      approvedSuggestions,
      language
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log("[Refactoring Agent] Refactoring complete");
    io.emit("agent_update", { message: "Refactoring complete!" });

    res.json({
      success: true,
      filePath,
      originalCode: code,
      refactoredCode: result.refactoredCode,
      appliedSuggestions: result.appliedSuggestions,
    });
  } catch (error) {
    console.error("[Refactoring Agent] Error:", error);
    io.emit("agent_update", {
      message: `Refactoring error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Predictive Suggestions Handler
 * Analyzes code and predicts next steps, test cases, and dependencies
 */
exports.getPredictions = async (req, res) => {
  const { filePath, code } = req.body;
  const io = req.app.get("io");

  try {
    console.log("\n========================================");
    console.log(`[Prediction Agent] Analyzing ${filePath}`);
    console.log("========================================\n");

    if (!filePath || !code) {
      return res.status(400).json({
        error: "Missing required fields: filePath and code",
      });
    }

    io.emit("agent_update", { message: "Analyzing code patterns..." });

    // Detect language
    const language = predictionService.detectLanguage(filePath);
    console.log(`[Prediction Agent] Language: ${language}`);

    // Get predictions
    io.emit("agent_update", { message: "Generating predictions..." });
    const result = await predictionService.predictNextSteps(
      filePath,
      code,
      language
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`[Prediction Agent] Predictions generated successfully`);
    io.emit("agent_update", { message: "Predictions ready!" });

    res.json({
      success: true,
      filePath,
      language,
      predictions: result.predictions,
      contextUsed: result.contextUsed,
    });
  } catch (error) {
    console.error("[Prediction Agent] Error:", error);
    io.emit("agent_update", {
      message: `Prediction error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Test Case Generation Handler
 * Generates comprehensive test cases for the code
 */
/**
 * Generate Tests Handler
 * Creates test code using WatsonX with fallback to template-based generation
 */
exports.generateTests = async (req, res) => {
  const { filePath, code, testFramework } = req.body;
  const io = req.app.get("io");

  try {
    console.log(`[Test Generator] Generating tests for ${filePath}`);

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: code",
        message: "Please provide code to generate tests for",
      });
    }

    io?.emit("agent_update", { message: "Generating test cases..." });

    // Detect language from file extension
    const language = predictionService.detectLanguage(filePath || "unknown.js");
    console.log(`[Test Generator] Detected language: ${language}`);

    // Try WatsonX test generation with fallback
    const result = await predictionService.generateTestCases(
      code,
      language,
      testFramework
    );

    if (!result.success) {
      console.error("[Test Generator] Test generation failed:", result.error);
      throw new Error(result.error || "Test generation failed");
    }

    console.log(
      `[Test Generator] ✓ Tests generated successfully using ${
        result.framework
      }${result.usedFallback ? " (fallback)" : ""}`
    );
    io?.emit("agent_update", { message: "Test cases ready!" });

    res.json({
      success: true,
      testCode: result.testCode,
      framework: result.framework,
      language: result.language,
      usedFallback: result.usedFallback || false,
    });
  } catch (error) {
    console.error("[Test Generator] Error:", error);
    io?.emit("agent_update", {
      message: `Test generation error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({
      success: false,
      error: error.message,
      message:
        "Failed to generate tests. Please check your code and try again.",
    });
  }
};

/**
 * Execute Tests Handler
 * Runs the generated tests in a temporary file and returns structured results
 */
exports.executeTests = async (req, res) => {
  const { testCode, framework } = req.body;
  const io = req.app.get("io");
  const fs = require("fs");
  const path = require("path");
  const { exec } = require("child_process");

  let testFilePath = null;

  try {
    console.log(`[Test Executor] Running ${framework || "Jest"} tests`);

    if (!testCode) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: testCode",
        message: "No test code provided to execute",
      });
    }

    io?.emit("agent_update", { message: "Executing tests..." });

    // Create /temp folder if missing
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      console.log(`[Test Executor] Creating temp directory: ${tempDir}`);
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write generated tests to unique temp file
    const timestamp = Date.now();
    testFilePath = path.join(tempDir, `test_${timestamp}.test.js`);
    console.log(`[Test Executor] Writing test file: ${testFilePath}`);
    fs.writeFileSync(testFilePath, testCode, "utf8");

    // Execute Jest with JSON output
    const testFramework = framework || "Jest";
    let command = "";

    if (testFramework === "Jest" || testFramework.includes("Jest")) {
      command = `npx jest "${testFilePath}" --json --testLocationInResults --no-coverage`;
    } else if (testFramework === "Mocha") {
      command = `npx mocha "${testFilePath}" --reporter json`;
    } else {
      // Default to Jest
      command = `npx jest "${testFilePath}" --json --testLocationInResults --no-coverage`;
    }

    console.log(`[Test Executor] Executing: ${command}`);

    exec(command, { cwd: tempDir, timeout: 30000 }, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        if (testFilePath && fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
          console.log(`[Test Executor] ✓ Cleaned up temp file`);
        }
      } catch (cleanupError) {
        console.error("[Test Executor] Cleanup error:", cleanupError);
      }

      // Handle execution errors
      if (error && !stdout) {
        console.error("[Test Executor] Execution error:", error.message);

        // Check if Jest is not installed
        if (stderr && stderr.includes("jest: not found")) {
          return res.json({
            success: false,
            error: "Jest is not installed",
            message:
              "Jest is not installed. Please run: npm install --save-dev jest",
            stderr: stderr,
          });
        }

        return res.json({
          success: false,
          error: error.message,
          stderr: stderr,
          message:
            "Test execution failed. Check if Jest is installed and tests have no syntax errors.",
        });
      }

      try {
        // Parse Jest JSON output
        let results = null;

        if (stdout) {
          try {
            results = JSON.parse(stdout);
            console.log(
              `[Test Executor] ✓ Tests completed: ${
                results.numPassedTests || 0
              } passed, ${results.numFailedTests || 0} failed`
            );
          } catch (parseError) {
            console.error("[Test Executor] JSON parse error:", parseError);
            // Create minimal results structure
            results = {
              numTotalTests: 0,
              numPassedTests: 0,
              numFailedTests: 0,
              numPendingTests: 0,
              testResults: [],
              success: false,
              rawOutput: stdout,
            };
          }
        } else {
          results = {
            numTotalTests: 0,
            numPassedTests: 0,
            numFailedTests: 0,
            numPendingTests: 0,
            testResults: [],
            success: false,
          };
        }

        // Build summary
        const summary = {
          total: results.numTotalTests || 0,
          passed: results.numPassedTests || 0,
          failed: results.numFailedTests || 0,
          skipped: results.numPendingTests || 0,
        };

        io?.emit("agent_update", {
          message: `Tests executed: ${summary.passed} passed, ${summary.failed} failed`,
        });

        // Return structured response
        res.json({
          success: true,
          results: results,
          summary: summary,
          rawOutput: stdout,
          stderr: stderr || null,
          message:
            summary.total === 0
              ? "No tests were executed. Check test syntax."
              : summary.failed === 0
              ? `All ${summary.passed} tests passed!`
              : `${summary.failed} test(s) failed`,
        });
      } catch (parseError) {
        console.error("[Test Executor] Result parsing error:", parseError);
        res.json({
          success: false,
          message: "Tests executed but results could not be parsed",
          rawOutput: stdout,
          stderr: stderr,
          error: parseError.message,
        });
      }
    });
  } catch (error) {
    console.error("[Test Executor] Error:", error);

    // Clean up on error
    try {
      if (testFilePath && fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch (cleanupError) {
      console.error("[Test Executor] Cleanup error:", cleanupError);
    }

    io?.emit("agent_update", {
      message: `Test execution error: ${error.message}`,
      type: "error",
    });

    res.status(500).json({
      success: false,
      error: error.message,
      message: "An unexpected error occurred during test execution",
    });
  }
};

/**
 * Code Metrics Handler
 * Calculates complexity, maintainability, and other metrics
 */
exports.getMetrics = async (req, res) => {
  const { filePath, code } = req.body;
  const io = req.app.get("io");

  try {
    console.log(`[Metrics Agent] Calculating metrics for ${filePath}`);

    if (!code) {
      return res.status(400).json({
        error: "Missing required field: code",
      });
    }

    io.emit("agent_update", { message: "Calculating code metrics..." });

    const language = predictionService.detectLanguage(filePath || "unknown.js");
    const metrics = metricsService.calculateMetrics(code, language);

    console.log(
      `[Metrics Agent] Metrics calculated - Complexity: ${
        metrics.cyclomatic_complexity.total
      }, Maintainability: ${metrics.maintainability_index.score.toFixed(1)}`
    );
    io.emit("agent_update", { message: "Metrics analysis complete!" });

    res.json({
      success: true,
      filePath,
      language,
      metrics,
    });
  } catch (error) {
    console.error("[Metrics Agent] Error:", error);
    io.emit("agent_update", {
      message: `Metrics calculation error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Dependency Analysis Handler
 * Analyzes and suggests dependencies
 */
exports.analyzeDeps = async (req, res) => {
  const { filePath, code } = req.body;
  const io = req.app.get("io");

  try {
    console.log(`[Dependency Agent] Analyzing dependencies for ${filePath}`);

    if (!code) {
      return res.status(400).json({
        error: "Missing required field: code",
      });
    }

    io.emit("agent_update", { message: "Analyzing dependencies..." });

    const language = predictionService.detectLanguage(filePath || "unknown.js");
    const result = await predictionService.analyzeDependencies(code, language);

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`[Dependency Agent] Analysis complete`);
    io.emit("agent_update", { message: "Dependency analysis ready!" });

    res.json({
      success: true,
      filePath,
      language,
      analysis: result.analysis,
    });
  } catch (error) {
    console.error("[Dependency Agent] Error:", error);
    io.emit("agent_update", {
      message: `Dependency analysis error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Multi-File Test Execution Handler
 * Runs tests across multiple files with coverage tracking
 */
exports.runBatchTests = async (req, res) => {
  const { files, options = {} } = req.body;
  const io = req.app.get("io");

  try {
    console.log(
      `[Test Runner Agent] Running tests for ${
        files ? files.length : "all"
      } files`
    );

    if (files && !Array.isArray(files)) {
      return res.status(400).json({
        error: "Files must be an array of file paths",
      });
    }

    io.emit("agent_update", { message: "Discovering and running tests..." });

    const testRunnerService = require("../services/testRunnerService");
    const result = await testRunnerService.runMultiFileTests(files, options);

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(
      `[Test Runner Agent] Completed: ${result.summary.totalTests} tests executed`
    );
    io.emit("agent_update", {
      message: `Test execution complete: ${result.summary.passed}/${result.summary.totalTests} passed`,
      type: result.summary.failed > 0 ? "warning" : "success",
    });

    res.json({
      success: true,
      totalFiles: result.results.length,
      summary: result.summary,
      results: result.results,
      coverage: result.coverage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Test Runner Agent] Error:", error);
    io.emit("agent_update", {
      message: `Test execution error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Multi-File Quality Metrics Handler
 * Aggregates quality metrics across multiple files
 */
exports.getBatchMetrics = async (req, res) => {
  const { files, projectPath, options = {} } = req.body;
  const io = req.app.get("io");

  try {
    console.log(
      `[Metrics Agent] Calculating metrics for ${
        files ? files.length : "all"
      } files`
    );

    if (files && !Array.isArray(files)) {
      return res.status(400).json({
        error: "Files must be an array of file paths",
      });
    }

    io.emit("agent_update", {
      message: "Analyzing code quality across files...",
    });

    const qualityMetricsService = require("../services/qualityMetricsService");
    const result = await qualityMetricsService.calculateMultiFileMetrics(
      files,
      projectPath,
      options
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(
      `[Metrics Agent] Analysis complete for ${result.results.length} files`
    );
    io.emit("agent_update", {
      message: `Quality metrics calculated`,
      type: "success",
    });

    res.json({
      success: true,
      totalFiles: result.results.length,
      aggregated: result.aggregated,
      results: result.results,
      trends: result.trends,
      aiInsights: result.aiInsights,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Metrics Agent] Error:", error);
    io.emit("agent_update", {
      message: `Metrics calculation error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Style Compliance Check Handler
 * Checks style compliance across multiple files
 */
exports.getStyleCompliance = async (req, res) => {
  const { files, projectPath, options = {} } = req.body;
  const io = req.app.get("io");

  try {
    console.log(
      `[Style Check Agent] Checking style for ${
        files ? files.length : "all"
      } files`
    );

    if (files && !Array.isArray(files)) {
      return res.status(400).json({
        error: "Files must be an array of file paths",
      });
    }

    io.emit("agent_update", { message: "Checking style compliance..." });

    const qualityMetricsService = require("../services/qualityMetricsService");
    const result = await qualityMetricsService.getStyleCompliance(
      files,
      projectPath,
      options
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    const issueCount = result.results.reduce(
      (sum, r) => sum + r.violations.length,
      0
    );
    console.log(
      `[Style Check Agent] Found ${issueCount} style issues across ${result.results.length} files`
    );

    io.emit("agent_update", {
      message: `Style check complete: ${issueCount} issues found`,
      type: issueCount > 0 ? "warning" : "success",
    });

    res.json({
      success: true,
      totalFiles: result.results.length,
      summary: result.summary,
      results: result.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Style Check Agent] Error:", error);
    io.emit("agent_update", {
      message: `Style check error: ${error.message}`,
      type: "error",
    });
    res.status(500).json({ error: error.message });
  }
};

/**
 * File Session Management Handlers
 * Handle multi-file session operations
 */

/**
 * Get all files in the session
 */
exports.getSessionFiles = async (req, res) => {
  try {
    const files = fileManagerService.getAllFiles();
    const activeFile = fileManagerService.getActiveFile();
    const stats = fileManagerService.getSessionStats();

    res.json({
      success: true,
      files,
      activeFileId: activeFile?.id || null,
      stats,
    });
  } catch (error) {
    console.error("[File Manager] Error getting files:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add a file to the session
 */
exports.addSessionFile = async (req, res) => {
  const { filePath, content } = req.body;

  try {
    if (!filePath) {
      return res.status(400).json({ error: "File path is required" });
    }

    const file = await fileManagerService.addFile(filePath, content);

    res.json({
      success: true,
      file,
      message: `File ${file.name} added to session`,
    });
  } catch (error) {
    console.error("[File Manager] Error adding file:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Upload a file with content (for drag-drop, paste, or upload)
 */
exports.uploadSessionFile = async (req, res) => {
  const { name, content, language } = req.body;

  try {
    if (!name || !content) {
      return res
        .status(400)
        .json({ error: "File name and content are required" });
    }

    // Create a virtual file path in a temp directory
    const virtualPath = `uploaded/${name}`;

    const file = await fileManagerService.addFile(virtualPath, content);

    // Override language if provided
    if (language) {
      file.language = language;
    }

    res.json({
      success: true,
      file,
      message: `File ${file.name} uploaded successfully`,
    });
  } catch (error) {
    console.error("[File Manager] Error uploading file:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Remove a file from the session
 */
exports.removeSessionFile = async (req, res) => {
  const { fileId } = req.params;

  try {
    const file = fileManagerService.getFile(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const removed = fileManagerService.removeFile(fileId);

    res.json({
      success: removed,
      message: removed
        ? `File ${file.name} removed from session`
        : "Failed to remove file",
    });
  } catch (error) {
    console.error("[File Manager] Error removing file:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a specific file
 */
exports.getSessionFile = async (req, res) => {
  const { fileId } = req.params;

  try {
    const file = fileManagerService.getFile(fileId);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      success: true,
      file,
    });
  } catch (error) {
    console.error("[File Manager] Error getting file:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update file content
 */
exports.updateSessionFile = async (req, res) => {
  const { fileId } = req.params;
  const { content, setActive } = req.body;

  try {
    if (content === undefined) {
      return res.status(400).json({ error: "Content is required" });
    }

    const file = fileManagerService.updateFileContent(fileId, content);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (setActive) {
      fileManagerService.setActiveFile(fileId);
    }

    res.json({
      success: true,
      file,
      message: `File ${file.name} updated`,
    });
  } catch (error) {
    console.error("[File Manager] Error updating file:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save file to disk
 */
exports.saveSessionFile = async (req, res) => {
  const { fileId } = req.params;

  try {
    const result = await fileManagerService.saveFile(fileId);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      file: result.file,
      message: `File ${result.file.name} saved`,
    });
  } catch (error) {
    console.error("[File Manager] Error saving file:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Set active file
 */
exports.setActiveFile = async (req, res) => {
  const { fileId } = req.params;

  try {
    const success = fileManagerService.setActiveFile(fileId);

    if (!success) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = fileManagerService.getFile(fileId);

    res.json({
      success: true,
      file,
      message: `Switched to ${file.name}`,
    });
  } catch (error) {
    console.error("[File Manager] Error setting active file:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Store file-specific results
 */
exports.storeFileResults = async (req, res) => {
  const { fileId } = req.params;
  const { resultType, data } = req.body;

  try {
    if (!resultType || !data) {
      return res
        .status(400)
        .json({ error: "Result type and data are required" });
    }

    const validTypes = ["metrics", "tests", "review", "predictions"];
    if (!validTypes.includes(resultType)) {
      return res.status(400).json({
        error: `Invalid result type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    const file = fileManagerService.storeFileResults(fileId, resultType, data);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      success: true,
      message: `${resultType} results stored for ${file.name}`,
    });
  } catch (error) {
    console.error("[File Manager] Error storing results:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get file-specific results
 */
exports.getFileResults = async (req, res) => {
  const { fileId, resultType } = req.params;

  try {
    const results = fileManagerService.getFileResults(fileId, resultType);

    if (results === null) {
      return res.status(404).json({ error: "File or results not found" });
    }

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("[File Manager] Error getting results:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Export session (for IDE plugin sync)
 */
exports.exportSession = async (req, res) => {
  try {
    const sessionData = fileManagerService.exportSession();

    res.json({
      success: true,
      session: sessionData,
    });
  } catch (error) {
    console.error("[File Manager] Error exporting session:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Import session (for IDE plugin sync)
 */
exports.importSession = async (req, res) => {
  const { session } = req.body;

  try {
    if (!session) {
      return res.status(400).json({ error: "Session data is required" });
    }

    fileManagerService.importSession(session);

    res.json({
      success: true,
      message: "Session imported successfully",
      stats: fileManagerService.getSessionStats(),
    });
  } catch (error) {
    console.error("[File Manager] Error importing session:", error);
    res.status(500).json({ error: error.message });
  }
};
