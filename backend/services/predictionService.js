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
    const response = await callWatsonx(prompt, {
      maxNewTokens: 1500,
      temperature: 0.3, // Slightly higher for creative suggestions
    });

    let predictions;
    const text = response.text;

    if (response.usedFallback || !text) {
      console.log(
        "[Prediction Service] Using fallback prediction generation (LLM unavailable)"
      );
      predictions = generateFallbackPredictions(filePath, code, language);
    } else {
      // Parse predictions
      predictions = parsePredictions(text);

      // If parsing failed (returned empty structure with raw_response), use fallback
      if (
        predictions.next_steps.length === 0 &&
        predictions.test_cases.length === 0
      ) {
        console.log(
          "[Prediction Service] Parsing failed or empty, using fallback logic"
        );
        predictions = generateFallbackPredictions(filePath, code, language);
      }
    }

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
    // Use fallback on error
    const predictions = generateFallbackPredictions(filePath, code, language);
    return {
      success: true,
      filePath,
      language,
      predictions,
      contextUsed: ragContext.length,
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
    const response = await callWatsonx(prompt, {
      maxNewTokens: 2000,
      temperature: 0.2,
    });

    const text = response.text || "";

    // Extract test code from markdown code block
    let testCode = extractCodeBlock(text);

    // Validate test code quality
    const isValidTest =
      testCode &&
      testCode.length > 50 &&
      !response.usedFallback &&
      (testCode.includes("test(") ||
        testCode.includes("it(") ||
        testCode.includes("describe(") ||
        testCode.includes("def test_"));

    // If Watson X failed or returned poor quality, generate fallback tests
    if (!isValidTest) {
      console.log(
        "[Prediction Service] Using fallback test generation (WatsonX output insufficient)"
      );
      testCode = generateFallbackTests(code, language, framework);
      return {
        success: true,
        testCode,
        framework,
        language,
        usedFallback: true,
      };
    }

    console.log("[Prediction Service] ✓ Generated tests via WatsonX");
    return {
      success: true,
      testCode,
      framework,
      language,
      usedFallback: false,
    };
  } catch (error) {
    console.error("[Prediction Service] Test generation failed:", error);
    // Generate fallback tests even on error
    console.log(
      "[Prediction Service] Using fallback test generation (error recovery)"
    );
    const testCode = generateFallbackTests(code, language, framework);
    return {
      success: true,
      testCode,
      framework,
      language,
      usedFallback: true,
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
 * Generate fallback test cases when Watson X fails
 */
function generateFallbackTests(code, language, framework) {
  console.log(`[Prediction Service] Generating fallback tests for ${language}`);

  // Extract function/class names from code
  const functionMatches = code.match(
    /(?:function|const|let|var)\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?(?:function|\(.*?\)\s*=>)|class\s+(\w+)/g
  );
  const functionNames = [];
  const classNames = [];

  if (functionMatches) {
    functionMatches.forEach((match) => {
      // Check for class
      const classMatch = match.match(/class\s+(\w+)/);
      if (classMatch && !classNames.includes(classMatch[1])) {
        classNames.push(classMatch[1]);
        return;
      }

      // Check for function
      const nameMatch = match.match(
        /(?:function|const|let|var)\s+(\w+)|(\w+)\s*[:=]/
      );
      if (nameMatch) {
        const name = nameMatch[1] || nameMatch[2];
        if (
          name &&
          !functionNames.includes(name) &&
          !classNames.includes(name)
        ) {
          functionNames.push(name);
        }
      }
    });
  }

  // Generate tests based on language and framework
  if (
    language === "JavaScript" ||
    language === "TypeScript" ||
    language.includes("JSX") ||
    language.includes("TSX")
  ) {
    return generateJavaScriptFallbackTests(
      code,
      framework,
      functionNames,
      classNames
    );
  } else if (language === "Python") {
    return generatePythonFallbackTests(code, functionNames);
  } else {
    return generateGenericFallbackTests(
      code,
      language,
      framework,
      functionNames
    );
  }
}

/**
 * Generate JavaScript/TypeScript fallback tests
 */
function generateJavaScriptFallbackTests(
  code,
  framework,
  functionNames,
  classNames = []
) {
  const hasExports = code.includes("module.exports") || code.includes("export");
  const hasImports = code.includes("import") || code.includes("require");
  const firstFunc = functionNames[0] || "myFunction";
  const hasReturn = code.includes("return");
  const hasParams =
    /function\s+\w+\s*\([^)]+\)/.test(code) || /\(\w+[^)]*\)\s*=>/.test(code);
  const hasAsync = code.includes("async");
  const firstClass = classNames[0];

  // Inline the original code so tests are self-contained
  let testCode = `// ${framework} Test Suite - Auto-generated
// This test file includes the source code inline for execution

// ============== SOURCE CODE ==============
${code}
// =========================================

`;

  // Generate tests for classes
  if (firstClass) {
    testCode += `
describe('${firstClass} class tests', () => {
  test('${firstClass} should be defined', () => {
    expect(${firstClass}).toBeDefined();
    expect(typeof ${firstClass}).toBe('function');
  });

  test('${firstClass} should be instantiable', () => {
    expect(() => {
      const instance = new ${firstClass}();
    }).not.toThrow();
  });

  test('${firstClass} instance should have expected structure', () => {
    const instance = new ${firstClass}();
    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(${firstClass});
  });
});

`;
  }

  // Generate tests for functions
  if (functionNames.length > 0) {
    testCode += `describe('${firstFunc} function tests', () => {
  test('${firstFunc} should be defined', () => {
    expect(typeof ${firstFunc}).toBe('function');
  });

  test('${firstFunc} should execute without errors', () => {
    expect(() => {
      ${firstFunc}${hasParams ? "(1, 2)" : "()"};
    }).not.toThrow();
  });
${
  hasReturn
    ? `
  test('${firstFunc} should return a value', () => {
    const result = ${firstFunc}${hasParams ? "(1, 2)" : "()"};
    expect(result).toBeDefined();
  });`
    : ""
}
${
  hasAsync
    ? `
  test('${firstFunc} should handle async operations', async () => {
    ${hasReturn ? "const result = " : ""}await ${firstFunc}${
        hasParams ? "(1, 2)" : "()"
      };
    ${hasReturn ? "expect(result).toBeDefined();" : "expect(true).toBe(true);"}
  });`
    : ""
}

  test('${firstFunc} should handle edge cases', () => {
    expect(() => {
      ${firstFunc}${hasParams ? "(0, 0)" : "()"};
      ${firstFunc}${hasParams ? "(-1, -1)" : "()"};
      ${firstFunc}${hasParams ? "(null, undefined)" : "()"};
    }).not.toThrow();
  });
});

`;

    // Add tests for additional functions
    if (functionNames.length > 1) {
      testCode += `describe('Additional function tests', () => {
${functionNames
  .slice(1, 4)
  .map(
    (fn) => `  test('${fn} should be defined', () => {
    expect(typeof ${fn}).toBe('function');
  });

  test('${fn} should execute without throwing', () => {
    expect(() => {
      ${fn}();
    }).not.toThrow();
  });
`
  )
  .join("\n")}
});

`;
    }
  }

  testCode += `// TODO: Add more specific test cases based on your requirements
// - Test with various input combinations
// - Test error handling and validation
// - Test boundary conditions
// - Add integration tests if needed
`;

  return testCode;
}

/**
 * Generate Python fallback tests
 */
function generatePythonFallbackTests(code, functionNames) {
  const firstFunc = functionNames[0] || "my_function";

  return `# pytest Test Suite
# Generated fallback tests - Please customize as needed

import pytest

def test_${firstFunc}_exists():
    """Test that ${firstFunc} exists"""
    assert callable(${firstFunc})

def test_${firstFunc}_basic():
    """Test basic functionality of ${firstFunc}"""
    # TODO: Add specific test logic
    result = ${firstFunc}()
    assert result is not None

def test_${firstFunc}_edge_cases():
    """Test edge cases for ${firstFunc}"""
    # TODO: Add edge case tests
    pass

${
  functionNames.length > 1
    ? `
${functionNames
  .slice(1, 4)
  .map(
    (fn) => `
def test_${fn}_exists():
    """Test that ${fn} exists"""
    assert callable(${fn})
`
  )
  .join("")}
`
    : ""
}

# TODO: Add more specific test cases:
# - Test with different inputs
# - Test error handling
# - Test boundary conditions
`;
}

/**
 * Generate generic fallback tests
 */
function generateGenericFallbackTests(
  code,
  language,
  framework,
  functionNames
) {
  return `// ${framework} Test Suite for ${language}
// Generated fallback tests - Please customize as needed

// Basic test structure - adapt to your testing framework
test_suite() {
  // Test 1: Basic functionality
  test_basic_functionality() {
    // TODO: Add your test logic here
    assert(true);
  }
  
  // Test 2: Edge cases
  test_edge_cases() {
    // TODO: Test edge cases
    assert(true);
  }
  
  // Test 3: Error handling
  test_error_handling() {
    // TODO: Test error scenarios
    assert(true);
  }
}

// TODO: Customize these tests for your specific code
// Functions detected: ${functionNames.join(", ") || "none"}
`;
}

/**
 * Generate fallback predictions when Watson X fails
 */
function generateFallbackPredictions(filePath, code, language) {
  console.log(
    `[Prediction Service] Generating fallback predictions for ${filePath}`
  );

  const predictions = {
    next_steps: [],
    test_cases: [],
    dependencies: [],
    improvements: [],
  };

  // Basic static analysis
  const hasTests =
    code.includes("test") || code.includes("spec") || filePath.includes("test");
  const hasDocs =
    code.includes("/**") || code.includes('"""') || code.includes("///");
  const hasErrorHandling =
    code.includes("try") || code.includes("catch") || code.includes("except");

  // 1. Next Steps
  if (!hasTests) {
    predictions.next_steps.push({
      title: "Implement Unit Tests",
      description: `Create ${language} tests to verify the functionality`,
      priority: "high",
      category: "testing",
    });
  }

  if (!hasDocs) {
    predictions.next_steps.push({
      title: "Add Documentation",
      description: "Add function/class documentation and comments",
      priority: "medium",
      category: "documentation",
    });
  }

  if (code.includes("TODO") || code.includes("FIXME")) {
    predictions.next_steps.push({
      title: "Resolve TODOs",
      description: "Address pending TODO items found in the code",
      priority: "medium",
      category: "refactor",
    });
  }

  // 2. Test Cases
  predictions.test_cases.push({
    scenario: "Happy Path Validation",
    type: "unit",
    importance: "critical",
    suggestion: "Verify function returns expected output for valid input",
  });

  predictions.test_cases.push({
    scenario: "Error Handling",
    type: "edge_case",
    importance: "important",
    suggestion: "Verify behavior when invalid inputs are provided",
  });

  // 3. Improvements
  if (!hasErrorHandling) {
    predictions.improvements.push({
      area: "Error Handling",
      suggestion: "Add try/catch blocks or error checking",
      impact: "Improve application stability",
    });
  }

  if (code.length > 1000) {
    predictions.improvements.push({
      area: "Code Structure",
      suggestion: "Consider breaking down large functions",
      impact: "Improve maintainability",
    });
  }

  // Ensure we have at least one next step
  if (predictions.next_steps.length === 0) {
    predictions.next_steps.push({
      title: "Code Review",
      description: "Perform a self-review of the implementation",
      priority: "low",
      category: "refactor",
    });
  }

  return predictions;
}

/**
 * Detect test framework based on language
 */
function detectTestFramework(language) {
  const frameworks = {
    JavaScript: "Jest",
    TypeScript: "Jest",
    Python: "pytest",
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
