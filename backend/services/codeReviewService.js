const { callWatsonx, buildStructuredPrompt } = require("./llmService");
const { embedTexts } = require("./embeddingService");
const getQdrantClient = require("../config/qdrant");

const COLLECTION = process.env.QDRANT_COLLECTION || "Hackathons";

/**
 * Analyze a single file for potential bugs, code smells, and optimization opportunities
 * @param {string} filePath - Path to the file
 * @param {string} code - The code content to analyze
 * @param {array} ragContext - Optional RAG context for better analysis
 * @returns {Promise<object>} Analysis result with suggestions
 */
async function analyzeCode(filePath, code, ragContext = []) {
  console.log(`[Code Review Service] Analyzing ${filePath}`);
  console.log(`[Code Review Service] Code length: ${code.length} chars`);

  // Detect language from file extension
  const language = detectLanguage(filePath);
  console.log(`[Code Review Service] Detected language: ${language}`);

  // Build comprehensive analysis prompt
  const prompt = buildCodeReviewPrompt(filePath, code, language, ragContext);

  try {
    const { text } = await callWatsonx(prompt, {
      maxNewTokens: 1500,
      temperature: 0.2, // Low temperature for consistent analysis
    });

    // Parse the analysis result
    const analysis = parseAnalysisResult(text, code);
    console.log(
      `[Code Review Service] Found ${analysis.issues.length} issues and ${analysis.suggestions.length} suggestions`
    );

    return {
      success: true,
      filePath,
      language,
      analysis,
      contextUsed: ragContext.length,
    };
  } catch (error) {
    console.error("[Code Review Service] Analysis failed:", error);
    return {
      success: false,
      error: error.message,
      filePath,
    };
  }
}

/**
 * Generate refactored code based on approved suggestions
 * @param {string} code - Original code
 * @param {array} approvedSuggestions - List of suggestions to apply
 * @param {string} language - Programming language
 * @returns {Promise<object>} Refactored code
 */
async function generateRefactoredCode(code, approvedSuggestions, language) {
  console.log(
    `[Code Review Service] Generating refactored code for ${approvedSuggestions.length} suggestions`
  );

  const prompt = buildRefactoringPrompt(code, approvedSuggestions, language);

  try {
    const { text } = await callWatsonx(prompt, {
      maxNewTokens: 2000,
      temperature: 0.1, // Very low temperature for precise refactoring
    });

    // Extract refactored code
    const refactoredCode = extractCodeFromResponse(text, language);

    return {
      success: true,
      refactoredCode,
      appliedSuggestions: approvedSuggestions.length,
    };
  } catch (error) {
    console.error("[Code Review Service] Refactoring failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Retrieve relevant context from RAG for code review
 * @param {string} filePath - Path to the file
 * @param {string} code - The code content
 * @returns {Promise<array>} RAG context chunks
 */
async function retrieveReviewContext(filePath, code) {
  try {
    // Create a query that combines file path and code snippet
    const query = `${filePath}\n\n${code.slice(0, 500)}`;

    console.log(
      `[Code Review Service] Retrieving context for: ${filePath.slice(
        0,
        50
      )}...`
    );

    const [vector] = await embedTexts([query]);
    const qdrant = getQdrantClient();

    const results = await qdrant.search(COLLECTION, {
      vector,
      limit: 3, // Limit to most relevant chunks
      with_payload: true,
    });

    console.log(
      `[Code Review Service] Retrieved ${results.length} context chunks`
    );

    return results.map((item) => ({
      score: item.score,
      path: item.payload?.path || "unknown",
      chunk: item.payload?.chunk || item.payload?.text || "",
    }));
  } catch (error) {
    console.error("[Code Review Service] RAG retrieval failed:", error);
    return [];
  }
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
    swift: "Swift",
    kt: "Kotlin",
    html: "HTML",
    css: "CSS",
  };
  return languageMap[ext] || "Unknown";
}

/**
 * Build comprehensive code review prompt
 */
function buildCodeReviewPrompt(filePath, code, language, ragContext) {
  let contextSection = "";
  if (ragContext && ragContext.length > 0) {
    contextSection = `\n\nRELEVANT PROJECT CONTEXT:\n`;
    ragContext.forEach((ctx, idx) => {
      contextSection += `[Context ${idx + 1}] (relevance: ${
        ctx.score?.toFixed(2) || "N/A"
      })\nSource: ${ctx.path}\nContent: ${ctx.chunk}\n\n`;
    });
  }

  return `You are an expert code reviewer and software quality analyst. Analyze the following ${language} code for potential issues and improvements.

FILE: ${filePath}
LANGUAGE: ${language}${contextSection}

CODE TO REVIEW:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Perform a comprehensive code review and provide your analysis in the following JSON format:

{
  "overall_quality": "excellent|good|fair|poor",
  "summary": "Brief summary of the code quality",
  "issues": [
    {
      "type": "bug|security|performance|style|maintainability",
      "severity": "critical|high|medium|low",
      "line": <line_number or null>,
      "title": "Brief issue title",
      "description": "Detailed description of the issue",
      "impact": "What could go wrong or how it affects the codebase"
    }
  ],
  "suggestions": [
    {
      "type": "refactoring|optimization|best_practice|documentation",
      "priority": "high|medium|low",
      "title": "Brief suggestion title",
      "description": "What to improve and why",
      "benefit": "Expected benefit of applying this suggestion"
    }
  ],
  "positive_aspects": [
    "List any good practices or well-implemented features"
  ]
}

Focus on:
1. Potential bugs or logic errors
2. Security vulnerabilities
3. Performance bottlenecks
4. Code smells (duplicated code, long functions, etc.)
5. Violation of best practices
6. Missing error handling
7. Optimization opportunities
8. Maintainability concerns

Provide ONLY the JSON response, no additional text.`;
}

/**
 * Build refactoring prompt
 */
function buildRefactoringPrompt(code, approvedSuggestions, language) {
  const suggestionsText = approvedSuggestions
    .map((s, idx) => `${idx + 1}. ${s.title}: ${s.description}`)
    .join("\n");

  return `You are an expert software developer. Refactor the following ${language} code by applying the approved suggestions.

ORIGINAL CODE:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

APPROVED SUGGESTIONS TO APPLY:
${suggestionsText}

Generate the refactored code that applies ALL the approved suggestions above. Ensure the refactored code:
1. Maintains the same functionality
2. Implements all suggested improvements
3. Follows ${language} best practices and conventions
4. Is well-formatted and readable
5. Includes helpful comments for significant changes

Provide ONLY the complete refactored code, wrapped in a code block. No explanations or additional text.

REFACTORED CODE:`;
}

/**
 * Parse analysis result from LLM response
 */
function parseAnalysisResult(text, originalCode) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    return {
      overall_quality: parsed.overall_quality || "unknown",
      summary: parsed.summary || "Analysis completed",
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      positive_aspects: Array.isArray(parsed.positive_aspects)
        ? parsed.positive_aspects
        : [],
    };
  } catch (error) {
    console.error("[Code Review Service] Failed to parse analysis:", error);
    // Return fallback structure
    return {
      overall_quality: "unknown",
      summary: "Analysis parsing failed. Raw response available.",
      issues: [],
      suggestions: [],
      positive_aspects: [],
      raw_response: text,
    };
  }
}

/**
 * Extract code from LLM response
 */
function extractCodeFromResponse(text, language) {
  // Try to extract code from markdown code blocks
  const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);

  if (match) {
    return match[1].trim();
  }

  // If no code block, return the trimmed text
  return text.trim();
}

module.exports = {
  analyzeCode,
  generateRefactoredCode,
  retrieveReviewContext,
  detectLanguage,
};
