const { callWatsonx, buildStructuredPrompt } = require("./llmService");
const { embedTexts } = require("./embeddingService");
const getQdrantClient = require("../config/qdrant");

const COLLECTION = process.env.QDRANT_COLLECTION || "Hackathons";

/**
 * Analyze code and predict next steps, test cases, and dependencies
 * @param {string} filePath - Path to the file
 * @param {string} code - The code content
 * @param {string} language - Programming language
 * @returns {Promise<object>} Predictions
 */
async function predictNextSteps(filePath, code, language) {
  console.log(`[Prediction Service] Analyzing ${filePath} for predictions`);

  // Retrieve RAG context for similar patterns
  const ragContext = await retrievePredictionContext(filePath, code);

  // Build prediction prompt
  const prompt = buildPredictionPrompt(filePath, code, language, ragContext);

  try {
    const { text } = await callWatsonx(prompt, {
      maxNewTokens: 1500,
      temperature: 0.3, // Slightly higher for creative suggestions
    });

    // Parse predictions
    const predictions = parsePredictions(text);
    console.log(
      `[Prediction Service] Generated ${
        predictions.next_steps?.length || 0
      } next steps, ${predictions.test_cases?.length || 0} test cases, ${
        predictions.dependencies?.length || 0
      } dependencies`
    );

    return {
      success: true,
      filePath,
      language,
      predictions,
      contextUsed: ragContext.length,
    };
  } catch (error) {
    console.error("[Prediction Service] Prediction failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate test cases for the code
 * @param {string} code - The code content
 * @param {string} language - Programming language
 * @param {string} testFramework - Preferred test framework
 * @returns {Promise<object>} Generated test cases
 */
async function generateTestCases(code, language, testFramework = "auto") {
  console.log(`[Prediction Service] Generating test cases for ${language}`);

  // Detect appropriate test framework
  const framework =
    testFramework === "auto" ? detectTestFramework(language) : testFramework;

  const prompt = buildTestCasePrompt(code, language, framework);

  try {
    const { text } = await callWatsonx(prompt, {
      maxNewTokens: 2000,
      temperature: 0.2,
    });

    // Extract test code
    const testCode = extractCodeBlock(text);

    return {
      success: true,
      testCode,
      framework,
      language,
    };
  } catch (error) {
    console.error("[Prediction Service] Test generation failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Analyze dependencies and suggest improvements
 * @param {string} code - The code content
 * @param {string} language - Programming language
 * @returns {Promise<object>} Dependency analysis
 */
async function analyzeDependencies(code, language) {
  console.log(`[Prediction Service] Analyzing dependencies for ${language}`);

  const prompt = buildDependencyPrompt(code, language);

  try {
    const { text } = await callWatsonx(prompt, {
      maxNewTokens: 1000,
      temperature: 0.2,
    });

    const analysis = parseDependencyAnalysis(text);

    return {
      success: true,
      analysis,
      language,
    };
  } catch (error) {
    console.error("[Prediction Service] Dependency analysis failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Retrieve relevant context from RAG for predictions
 */
async function retrievePredictionContext(filePath, code) {
  try {
    // Create query that combines file info and code structure
    const query = `${filePath}\n\nCode patterns and similar implementations:\n${code.slice(
      0,
      600
    )}`;

    const [vector] = await embedTexts([query]);
    const qdrant = getQdrantClient();

    const results = await qdrant.search(COLLECTION, {
      vector,
      limit: 5, // More context for better predictions
      with_payload: true,
    });

    console.log(
      `[Prediction Service] Retrieved ${results.length} context chunks`
    );

    return results.map((item) => ({
      score: item.score,
      path: item.payload?.path || "unknown",
      chunk: item.payload?.chunk || item.payload?.text || "",
    }));
  } catch (error) {
    console.error("[Prediction Service] RAG retrieval failed:", error);
    return [];
  }
}

/**
 * Build prediction prompt
 */
function buildPredictionPrompt(filePath, code, language, ragContext) {
  let contextSection = "";
  if (ragContext && ragContext.length > 0) {
    contextSection = `\n\nPROJECT CONTEXT (similar patterns and implementations):\n`;
    ragContext.forEach((ctx, idx) => {
      contextSection += `[Context ${idx + 1}] (relevance: ${ctx.score?.toFixed(
        2
      )})\nSource: ${ctx.path}\n${ctx.chunk}\n\n`;
    });
  }

  return `You are an expert software development assistant with predictive capabilities. Analyze the provided ${language} code and predict what the developer likely needs next.

FILE: ${filePath}
LANGUAGE: ${language}${contextSection}

CODE TO ANALYZE:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Based on the code analysis and project context, provide comprehensive predictions in the following JSON format:

{
  "next_steps": [
    {
      "title": "Clear action title",
      "description": "Why this is a logical next step",
      "priority": "high|medium|low",
      "category": "feature|refactor|optimization|documentation|testing"
    }
  ],
  "test_cases": [
    {
      "scenario": "Test scenario description",
      "type": "unit|integration|edge_case",
      "importance": "critical|important|nice_to_have",
      "suggestion": "Brief suggestion for implementation"
    }
  ],
  "dependencies": [
    {
      "name": "Package or module name",
      "purpose": "Why this dependency would be useful",
      "type": "existing|suggested",
      "install_command": "Installation command if applicable"
    }
  ],
  "improvements": [
    {
      "area": "Area to improve (e.g., error handling, validation)",
      "suggestion": "Specific improvement suggestion",
      "impact": "Expected impact"
    }
  ]
}

Consider:
1. Current code structure and what's missing
2. Common patterns for this type of code
3. Error handling and edge cases
4. Testing needs
5. Dependencies that would be beneficial
6. Similar implementations in the project context

Provide ONLY the JSON response, no additional text.`;
}

/**
 * Build test case generation prompt
 */
function buildTestCasePrompt(code, language, framework) {
  return `You are a test-driven development expert. Generate comprehensive test cases for the following ${language} code using ${framework}.

CODE TO TEST:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Generate complete, runnable test code that includes:
1. Unit tests for all functions/methods
2. Edge case tests
3. Error/exception tests
4. Integration tests if applicable
5. Proper test setup and teardown
6. Clear test descriptions

Use ${framework} syntax and best practices. Include necessary imports and setup.

Provide ONLY the complete test code wrapped in a code block, no explanations.

TEST CODE:`;
}

/**
 * Build dependency analysis prompt
 */
function buildDependencyPrompt(code, language) {
  return `Analyze the dependencies in this ${language} code and provide recommendations.

CODE:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Provide analysis in JSON format:

{
  "current_dependencies": [
    {
      "name": "dependency name",
      "usage": "how it's used",
      "status": "required|optional|unused"
    }
  ],
  "suggested_dependencies": [
    {
      "name": "package name",
      "purpose": "what it would help with",
      "benefit": "expected benefit"
    }
  ],
  "optimization_opportunities": [
    {
      "current": "current approach",
      "suggestion": "better alternative",
      "reason": "why it's better"
    }
  ]
}

Provide ONLY the JSON response.`;
}

/**
 * Parse predictions from LLM response
 */
function parsePredictions(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
      test_cases: Array.isArray(parsed.test_cases) ? parsed.test_cases : [],
      dependencies: Array.isArray(parsed.dependencies)
        ? parsed.dependencies
        : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements
        : [],
    };
  } catch (error) {
    console.error("[Prediction Service] Failed to parse predictions:", error);
    return {
      next_steps: [],
      test_cases: [],
      dependencies: [],
      improvements: [],
      raw_response: text,
    };
  }
}

/**
 * Parse dependency analysis from LLM response
 */
function parseDependencyAnalysis(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(
      "[Prediction Service] Failed to parse dependency analysis:",
      error
    );
    return {
      current_dependencies: [],
      suggested_dependencies: [],
      optimization_opportunities: [],
      raw_response: text,
    };
  }
}

/**
 * Extract code from markdown code block
 */
function extractCodeBlock(text) {
  const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);
  return match ? match[1].trim() : text.trim();
}

/**
 * Detect appropriate test framework for language
 */
function detectTestFramework(language) {
  const frameworks = {
    JavaScript: "Jest",
    "React JSX": "Jest + React Testing Library",
    TypeScript: "Jest",
    "React TSX": "Jest + React Testing Library",
    Python: "pytest",
    "C++": "Google Test",
    C: "Unity",
    Java: "JUnit",
    Go: "testing",
    Rust: "cargo test",
    Ruby: "RSpec",
    PHP: "PHPUnit",
    "C#": "NUnit",
  };
  return frameworks[language] || "language default";
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const languageMap = {
    js: "JavaScript",
    jsx: "React JSX",
    ts: "TypeScript",
    tsx: "React TSX",
    py: "Python",
    cpp: "C++",
    c: "C",
    java: "Java",
    go: "Go",
    rs: "Rust",
    rb: "Ruby",
    php: "PHP",
    cs: "C#",
  };
  return languageMap[ext] || "Unknown";
}

module.exports = {
  predictNextSteps,
  generateTestCases,
  analyzeDependencies,
  retrievePredictionContext,
  detectLanguage,
};
