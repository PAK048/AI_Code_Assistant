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
    const response = await callWatsonx(prompt, {
      maxNewTokens: 2000,
      temperature: 0.1, // Very low temperature for consistent JSON
      decodingMethod: "greedy", // More deterministic output
    });

    const text = response.text || "";

    console.log(
      `[Code Review Service] LLM Response length: ${text.length} chars`
    );
    console.log(
      `[Code Review Service] Response preview: ${text.substring(0, 200)}...`
    );

    // If Watson X failed, use enhanced fallback immediately
    if (response.usedFallback || !text || text.length < 50) {
      console.log("[Code Review Service] Using enhanced fallback analysis");
      const analysis = createFallbackAnalysis(text, code);
      return {
        success: true,
        filePath,
        language,
        analysis,
        contextUsed: ragContext.length,
        usedFallback: true,
      };
    }

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

  return `You are an expert code reviewer. Analyze the following ${language} code and provide your response ONLY as a valid JSON object.

FILE: ${filePath}
LANGUAGE: ${language}${contextSection}

CODE TO REVIEW:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

CRITICAL: Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):

{
  "overall_quality": "excellent",
  "summary": "Brief summary of the code quality",
  "issues": [
    {
      "type": "bug",
      "severity": "high",
      "line": 10,
      "title": "Brief issue title",
      "description": "Detailed description",
      "impact": "What could go wrong"
    }
  ],
  "suggestions": [
    {
      "type": "refactoring",
      "priority": "medium",
      "title": "Brief suggestion title",
      "description": "What to improve and why",
      "benefit": "Expected benefit"
    }
  ],
  "positive_aspects": [
    "Good practices found in the code"
  ]
}

Rules:
- overall_quality: must be "excellent", "good", "fair", or "poor"
- issues.type: must be "bug", "security", "performance", "style", or "maintainability"
- issues.severity: must be "critical", "high", "medium", or "low"
- suggestions.type: must be "refactoring", "optimization", "best_practice", or "documentation"
- suggestions.priority: must be "high", "medium", or "low"
- Return ONLY the JSON object, nothing else

Focus on:
1. Potential bugs or logic errors
2. Security vulnerabilities
3. Performance bottlenecks
4. Code smells
5. Best practice violations
6. Missing error handling`;
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
    // Clean up the text - remove markdown code blocks if present
    let cleanText = text.trim();
    cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    // Try multiple JSON extraction strategies
    let jsonMatch = cleanText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // Try to find JSON between specific markers
      const startIdx = cleanText.indexOf("{");
      const endIdx = cleanText.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonMatch = [cleanText.substring(startIdx, endIdx + 1)];
      }
    }

    if (!jsonMatch) {
      console.warn(
        "[Code Review Service] No JSON found, creating fallback analysis"
      );
      console.log(
        "[Code Review Service] Response was:",
        text.substring(0, 500)
      );
      return createFallbackAnalysis(text, originalCode);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize structure
    const result = {
      overall_quality: parsed.overall_quality || parsed.quality || "good",
      summary:
        parsed.summary || parsed.description || "Code analysis completed",
      issues: [],
      suggestions: [],
      positive_aspects: [],
    };

    // Process issues
    if (Array.isArray(parsed.issues)) {
      result.issues = parsed.issues.map((issue) => ({
        type: issue.type || "style",
        severity: issue.severity || "medium",
        line: issue.line || null,
        title: issue.title || "Code Issue",
        description: issue.description || "No description provided",
        impact: issue.impact || "May affect code quality",
      }));
    }

    // Process suggestions
    if (Array.isArray(parsed.suggestions)) {
      result.suggestions = parsed.suggestions.map((suggestion) => ({
        type: suggestion.type || "best_practice",
        priority: suggestion.priority || "medium",
        title: suggestion.title || "Improvement Suggestion",
        description: suggestion.description || "No description provided",
        benefit: suggestion.benefit || "Improves code quality",
      }));
    }

    // Process positive aspects
    if (Array.isArray(parsed.positive_aspects)) {
      result.positive_aspects = parsed.positive_aspects;
    } else if (typeof parsed.positive_aspects === "string") {
      result.positive_aspects = [parsed.positive_aspects];
    }

    return result;
  } catch (error) {
    console.error(
      "[Code Review Service] Failed to parse analysis:",
      error.message
    );
    return createFallbackAnalysis(text, originalCode);
  }
}

/**
 * Create a fallback analysis when JSON parsing fails
 */
function createFallbackAnalysis(text, originalCode) {
  console.log("[Code Review Service] Creating enhanced fallback analysis");

  const analysis = {
    overall_quality: "good",
    summary: "Code analysis completed successfully.",
    issues: [],
    suggestions: [],
    positive_aspects: [],
  };

  const lowerText = text.toLowerCase();
  const lines = originalCode.split("\n");

  // Analyze code structure
  const hasComments =
    originalCode.includes("//") || originalCode.includes("/*");
  const hasErrorHandling =
    originalCode.includes("try") ||
    originalCode.includes("catch") ||
    originalCode.includes("error") ||
    originalCode.includes("Error");
  const hasAsync =
    originalCode.includes("async") || originalCode.includes("await");
  const functionCount = (
    originalCode.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{/g) || []
  ).length;

  // Extract meaningful suggestions from text
  const sentences = text.split(/[.!?]\s+/);

  // Look for specific recommendations in the text
  sentences.forEach((sentence) => {
    const lower = sentence.toLowerCase();

    // Security issues
    if (
      lower.includes("security") ||
      lower.includes("vulnerable") ||
      lower.includes("sql injection") ||
      lower.includes("xss")
    ) {
      analysis.issues.push({
        type: "security",
        severity: "high",
        line: null,
        title: "Security Consideration",
        description: sentence.trim().substring(0, 150),
        impact: "Potential security vulnerability",
      });
    }

    // Performance issues
    else if (
      lower.includes("performance") ||
      lower.includes("slow") ||
      lower.includes("optimize") ||
      lower.includes("inefficient")
    ) {
      analysis.suggestions.push({
        type: "optimization",
        priority: "medium",
        title: "Performance Optimization",
        description: sentence.trim().substring(0, 150),
        benefit: "Improved runtime performance",
      });
    }

    // Error handling
    else if (
      lower.includes("error handling") ||
      lower.includes("exception") ||
      lower.includes("try-catch")
    ) {
      analysis.suggestions.push({
        type: "best_practice",
        priority: "high",
        title: "Error Handling",
        description: sentence.trim().substring(0, 150),
        benefit: "Better error management and debugging",
      });
    }

    // Code quality
    else if (
      lower.includes("refactor") ||
      lower.includes("clean") ||
      lower.includes("improve") ||
      lower.includes("simplify")
    ) {
      analysis.suggestions.push({
        type: "refactoring",
        priority: "medium",
        title: "Code Quality Improvement",
        description: sentence.trim().substring(0, 150),
        benefit: "More maintainable code",
      });
    }
  });

  // Add code statistics as positive aspects
  if (hasComments) {
    analysis.positive_aspects.push("Code includes documentation comments");
  }

  if (hasErrorHandling) {
    analysis.positive_aspects.push("Implements error handling");
  }

  if (hasAsync) {
    analysis.positive_aspects.push("Uses modern async/await patterns");
  }

  analysis.positive_aspects.push(`Contains ${functionCount} functions`);
  analysis.positive_aspects.push(`Total of ${lines.length} lines of code`);

  // If we have no issues or suggestions, create generic helpful ones
  if (analysis.issues.length === 0 && analysis.suggestions.length === 0) {
    // Add generic best practice suggestions
    analysis.suggestions.push({
      type: "best_practice",
      priority: "low",
      title: "Code Review Completed",
      description:
        "The code appears to follow good practices. Consider adding more comments for complex logic.",
      benefit: "Improved code maintainability",
    });

    if (!hasErrorHandling) {
      analysis.suggestions.push({
        type: "best_practice",
        priority: "medium",
        title: "Add Error Handling",
        description:
          "Consider adding try-catch blocks to handle potential errors gracefully.",
        benefit: "More robust error management",
      });
    }

    if (lines.length > 100) {
      analysis.suggestions.push({
        type: "refactoring",
        priority: "low",
        title: "Consider Modularization",
        description:
          "For better maintainability, consider breaking down large files into smaller modules.",
        benefit: "Improved code organization",
      });
    }
  }

  // Update summary based on findings
  analysis.summary = `Code review completed. Found ${analysis.issues.length} potential issues and ${analysis.suggestions.length} suggestions for improvement.`;

  return analysis;
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
