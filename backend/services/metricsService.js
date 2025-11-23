/**
 * Code Metrics Service
 * Calculates complexity, maintainability, and other code quality metrics
 */

/**
 * Calculate comprehensive code metrics
 * @param {string} code - The code content
 * @param {string} language - Programming language
 * @returns {object} Metrics analysis
 */
function calculateMetrics(code, language) {
  console.log(`[Metrics Service] Calculating metrics for ${language} code`);

  const metrics = {
    cyclomatic_complexity: calculateCyclomaticComplexity(code, language),
    lines_of_code: calculateLOC(code),
    maintainability_index: calculateMaintainabilityIndex(code, language),
    code_duplication: detectCodeDuplication(code),
    comment_density: calculateCommentDensity(code, language),
    function_metrics: analyzeFunctions(code, language),
    halstead_metrics: calculateHalsteadMetrics(code, language),
    readability_score: calculateReadabilityScore(code, language),
  };

  // Add overall assessment
  metrics.overall_assessment = generateAssessment(metrics);

  console.log(
    `[Metrics Service] Complexity: ${
      metrics.cyclomatic_complexity.total
    }, Maintainability: ${metrics.maintainability_index.score.toFixed(1)}`
  );

  return metrics;
}

/**
 * Calculate Cyclomatic Complexity
 * Measures the number of linearly independent paths through code
 */
function calculateCyclomaticComplexity(code, language) {
  // Decision points that increase complexity
  const patterns = {
    JavaScript: /\b(if|else|for|while|case|catch|&&|\|\||\?)\b/g,
    Python: /\b(if|elif|else|for|while|except|and|or)\b/g,
    default: /\b(if|else|for|while|case|catch)\b/g,
  };

  const pattern = patterns[language] || patterns.default;
  const matches = code.match(pattern) || [];

  // Base complexity is 1, plus 1 for each decision point
  const complexity = 1 + matches.length;

  // Function-level complexity
  const functions = extractFunctions(code, language);
  const functionComplexity = functions.map((fn) => {
    const fnMatches = fn.body.match(pattern) || [];
    return {
      name: fn.name,
      complexity: 1 + fnMatches.length,
      lines: fn.body.split("\n").length,
    };
  });

  return {
    total: complexity,
    per_function: functionComplexity,
    rating: getRatingForComplexity(complexity),
    threshold: {
      low: "1-10",
      moderate: "11-20",
      high: "21-50",
      very_high: ">50",
    },
  };
}

/**
 * Calculate Lines of Code metrics
 */
function calculateLOC(code) {
  const lines = code.split("\n");
  const totalLines = lines.length;

  // Count non-empty, non-comment lines
  const codeLines = lines.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("/*") &&
      !trimmed.startsWith("*")
    );
  }).length;

  const commentLines = totalLines - codeLines;
  const blankLines = lines.filter((line) => line.trim().length === 0).length;

  return {
    total: totalLines,
    code: codeLines,
    comments: commentLines,
    blank: blankLines,
    code_to_comment_ratio:
      codeLines > 0 ? (commentLines / codeLines).toFixed(2) : 0,
  };
}

/**
 * Calculate Maintainability Index
 * Based on Halstead Volume, Cyclomatic Complexity, and LOC
 * Scale: 0-100 (higher is better)
 */
function calculateMaintainabilityIndex(code, language) {
  const loc = calculateLOC(code).code;
  const complexity = calculateCyclomaticComplexity(code, language).total;
  const halstead = calculateHalsteadMetrics(code, language);

  // Simplified MI formula: 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
  let mi = 171;
  if (halstead.volume > 0) {
    mi -= 5.2 * Math.log(halstead.volume);
  }
  mi -= 0.23 * complexity;
  if (loc > 0) {
    mi -= 16.2 * Math.log(loc);
  }

  // Normalize to 0-100 scale
  mi = Math.max(0, Math.min(100, mi));

  return {
    score: mi,
    rating: getMaintainabilityRating(mi),
    factors: {
      lines_of_code: loc,
      cyclomatic_complexity: complexity,
      halstead_volume: halstead.volume,
    },
    interpretation: {
      "0-9": "Difficult to maintain",
      "10-19": "Moderate maintainability",
      "20-100": "Easy to maintain",
    },
  };
}

/**
 * Detect code duplication
 */
function detectCodeDuplication(code) {
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 10); // Ignore short lines

  const duplicates = {};
  const minSequence = 3; // Minimum lines to consider as duplication

  for (let i = 0; i < lines.length - minSequence; i++) {
    const sequence = lines.slice(i, i + minSequence).join("\n");
    if (sequence.length > 30) {
      // Ignore trivial sequences
      duplicates[sequence] = (duplicates[sequence] || 0) + 1;
    }
  }

  const duplicatedSequences = Object.entries(duplicates)
    .filter(([_, count]) => count > 1)
    .map(([sequence, count]) => ({
      lines: minSequence,
      occurrences: count,
      preview: sequence.slice(0, 100) + "...",
    }));

  const duplicationPercentage =
    duplicatedSequences.length > 0
      ? (
          (duplicatedSequences.reduce(
            (sum, d) => sum + d.lines * d.occurrences,
            0
          ) /
            lines.length) *
          100
        ).toFixed(1)
      : 0;

  return {
    percentage: parseFloat(duplicationPercentage),
    duplicated_blocks: duplicatedSequences.length,
    details: duplicatedSequences.slice(0, 5), // Top 5
    rating:
      duplicationPercentage < 5
        ? "Good"
        : duplicationPercentage < 15
        ? "Moderate"
        : "High",
  };
}

/**
 * Calculate comment density
 */
function calculateCommentDensity(code, language) {
  const commentPatterns = {
    JavaScript: [/\/\/.*/g, /\/\*[\s\S]*?\*\//g],
    Python: [/#.*/g, /'''[\s\S]*?'''/g, /"""[\s\S]*?"""/g],
    default: [/\/\/.*/g, /\/\*[\s\S]*?\*\//g, /#.*/g],
  };

  const patterns = commentPatterns[language] || commentPatterns.default;
  let commentChars = 0;

  patterns.forEach((pattern) => {
    const matches = code.match(pattern) || [];
    commentChars += matches.join("").length;
  });

  const totalChars = code.length;
  const density =
    totalChars > 0 ? ((commentChars / totalChars) * 100).toFixed(1) : 0;

  return {
    percentage: parseFloat(density),
    rating: density < 10 ? "Low" : density < 30 ? "Good" : "High",
    recommendation:
      density < 10
        ? "Add more comments"
        : density > 30
        ? "May be over-commented"
        : "Well-commented",
  };
}

/**
 * Analyze functions/methods
 */
function analyzeFunctions(code, language) {
  const functions = extractFunctions(code, language);

  const analysis = functions.map((fn) => {
    const lines = fn.body.split("\n").length;
    const parameters = fn.params.length;

    return {
      name: fn.name,
      lines_of_code: lines,
      parameter_count: parameters,
      complexity_estimate: calculateCyclomaticComplexity(fn.body, language)
        .total,
      rating: lines > 50 ? "Too long" : lines > 20 ? "Long" : "Good",
    };
  });

  const avgLength =
    analysis.length > 0
      ? (
          analysis.reduce((sum, f) => sum + f.lines_of_code, 0) /
          analysis.length
        ).toFixed(1)
      : 0;

  return {
    total_functions: functions.length,
    average_length: parseFloat(avgLength),
    functions: analysis.slice(0, 10), // Top 10
    long_functions: analysis.filter((f) => f.lines_of_code > 50).length,
  };
}

/**
 * Calculate Halstead Metrics
 * Measures program complexity based on operators and operands
 */
function calculateHalsteadMetrics(code, language) {
  // Simplified operator/operand detection
  const operators =
    code.match(/[+\-*/%=<>!&|^~]+|if|else|for|while|return|function|class/g) ||
    [];
  const operands = code.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b|\b\d+\b/g) || [];

  const uniqueOperators = new Set(operators).size;
  const uniqueOperands = new Set(operands).size;
  const totalOperators = operators.length;
  const totalOperands = operands.length;

  // Halstead metrics
  const vocabulary = uniqueOperators + uniqueOperands;
  const length = totalOperators + totalOperands;
  const volume = length * Math.log2(vocabulary || 1);
  const difficulty =
    (uniqueOperators / 2) * (totalOperands / (uniqueOperands || 1));
  const effort = volume * difficulty;

  return {
    vocabulary,
    length,
    volume: Math.round(volume),
    difficulty: difficulty.toFixed(2),
    effort: Math.round(effort),
    time_to_program_seconds: Math.round(effort / 18), // Stroud number
    bugs_estimate: (volume / 3000).toFixed(3),
  };
}

/**
 * Calculate readability score
 */
function calculateReadabilityScore(code, language) {
  let score = 100;

  // Deduct for long lines
  const lines = code.split("\n");
  const longLines = lines.filter((line) => line.length > 100).length;
  score -= longLines * 2;

  // Deduct for deep nesting
  const maxIndent = Math.max(
    ...lines.map((line) => (line.match(/^[\s]*/)?.[0].length || 0) / 2)
  );
  if (maxIndent > 4) score -= (maxIndent - 4) * 5;

  // Deduct for lack of whitespace
  const whitespaceRatio = (code.match(/\s/g) || []).length / code.length;
  if (whitespaceRatio < 0.15) score -= 10;

  // Deduct for inconsistent naming
  const camelCase = (code.match(/\b[a-z][a-zA-Z0-9]+\b/g) || []).length;
  const snake_case = (code.match(/\b[a-z]+_[a-z0-9_]+\b/g) || []).length;
  if (camelCase > 0 && snake_case > 0) score -= 5;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    rating:
      score >= 80
        ? "Excellent"
        : score >= 60
        ? "Good"
        : score >= 40
        ? "Fair"
        : "Poor",
    factors: {
      long_lines: longLines,
      max_nesting_depth: maxIndent,
      whitespace_ratio: whitespaceRatio.toFixed(2),
    },
  };
}

/**
 * Extract functions from code
 */
function extractFunctions(code, language) {
  const functions = [];

  if (
    language === "JavaScript" ||
    language === "React JSX" ||
    language === "TypeScript" ||
    language === "React TSX"
  ) {
    // Match function declarations and arrow functions
    const functionPattern =
      /(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)|const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(([^)]*)\)\s*=>)\s*\{/g;
    let match;

    while ((match = functionPattern.exec(code)) !== null) {
      const name = match[1] || match[3] || "anonymous";
      const params = (match[2] || match[4] || "")
        .split(",")
        .filter((p) => p.trim());

      // Try to extract body (simplified)
      const start = match.index + match[0].length;
      let braceCount = 1;
      let end = start;

      for (let i = start; i < code.length && braceCount > 0; i++) {
        if (code[i] === "{") braceCount++;
        if (code[i] === "}") braceCount--;
        end = i;
      }

      functions.push({
        name,
        params,
        body: code.slice(start, end),
      });
    }
  } else if (language === "Python") {
    const functionPattern = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\):/g;
    let match;

    while ((match = functionPattern.exec(code)) !== null) {
      functions.push({
        name: match[1],
        params: match[2].split(",").filter((p) => p.trim()),
        body: code.slice(match.index, match.index + 200), // Simplified
      });
    }
  }

  return functions;
}

/**
 * Get complexity rating
 */
function getRatingForComplexity(complexity) {
  if (complexity <= 10) return "Low (Simple)";
  if (complexity <= 20) return "Moderate";
  if (complexity <= 50) return "High (Complex)";
  return "Very High (Refactor recommended)";
}

/**
 * Get maintainability rating
 */
function getMaintainabilityRating(mi) {
  if (mi >= 80) return "Excellent";
  if (mi >= 65) return "Good";
  if (mi >= 50) return "Moderate";
  if (mi >= 25) return "Difficult";
  return "Very Difficult";
}

/**
 * Generate overall assessment
 */
function generateAssessment(metrics) {
  const issues = [];
  const strengths = [];

  // Check complexity
  if (metrics.cyclomatic_complexity.total > 20) {
    issues.push("High cyclomatic complexity");
  } else if (metrics.cyclomatic_complexity.total <= 10) {
    strengths.push("Low complexity");
  }

  // Check maintainability
  if (metrics.maintainability_index.score < 50) {
    issues.push("Low maintainability index");
  } else if (metrics.maintainability_index.score >= 80) {
    strengths.push("Highly maintainable");
  }

  // Check duplication
  if (metrics.code_duplication.percentage > 15) {
    issues.push("High code duplication");
  } else if (metrics.code_duplication.percentage < 5) {
    strengths.push("Minimal code duplication");
  }

  // Check comments
  if (metrics.comment_density.percentage < 10) {
    issues.push("Low comment density");
  }

  // Check readability
  if (metrics.readability_score.score < 60) {
    issues.push("Poor readability");
  } else if (metrics.readability_score.score >= 80) {
    strengths.push("Excellent readability");
  }

  const overallScore =
    (metrics.cyclomatic_complexity.total <= 20 ? 25 : 0) +
    metrics.maintainability_index.score / 4 +
    (metrics.code_duplication.percentage < 10 ? 25 : 0) +
    metrics.readability_score.score / 4;

  return {
    overall_score: Math.round(overallScore),
    rating:
      overallScore >= 80
        ? "Excellent"
        : overallScore >= 60
        ? "Good"
        : overallScore >= 40
        ? "Fair"
        : "Needs Improvement",
    issues,
    strengths,
    recommendation:
      issues.length > 2
        ? "Consider refactoring to improve code quality"
        : issues.length > 0
        ? "Minor improvements recommended"
        : "Code quality is good",
  };
}

module.exports = {
  calculateMetrics,
  calculateCyclomaticComplexity,
  calculateLOC,
  calculateMaintainabilityIndex,
};
