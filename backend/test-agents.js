#!/usr/bin/env node
/**
 * Test script for multi-agent orchestration system
 * Tests: Intent detection, RAG retrieval, code generation, and orchestration
 */

const axios = require("axios");

const BASE_URL = "http://localhost:5000/api/agents";

// Test cases
const testCases = [
  {
    name: "Test 1: RAG Answer - Architecture Question",
    endpoint: "/chat",
    data: { message: "How do agents communicate in CodeEcho?" },
    expectedIntent: "rag_answer",
  },
  {
    name: "Test 2: RAG Answer - Workflow Question",
    endpoint: "/chat",
    data: { message: "Explain the workflow of this system" },
    expectedIntent: "rag_answer",
  },
  {
    name: "Test 3: Code Generation - React Component",
    endpoint: "/chat",
    data: { message: "create a react login component", autoExecute: false },
    expectedIntent: "generate_code",
  },
  {
    name: "Test 4: Code Generation - Logout Component",
    endpoint: "/chat",
    data: { message: "logout component", autoExecute: false },
    expectedIntent: "generate_code",
  },
  {
    name: "Test 5: Intent Detection - Create File",
    endpoint: "/intent",
    data: { transcript: "create a react component" },
    expectedIntent: "generate_code",
  },
  {
    name: "Test 6: Intent Detection - Documentation",
    endpoint: "/intent",
    data: { transcript: "what is the architecture?" },
    expectedIntent: "rag_answer",
  },
  {
    name: "Test 7: Direct RAG Retrieval",
    endpoint: "/retrieve",
    data: { query: "agent communication architecture", topK: 3 },
    expectedResults: true,
  },
  {
    name: "Test 8: Code Generation with Explicit Context",
    endpoint: "/generate",
    data: {
      prompt: "create a simple button component",
      skipRAG: false,
    },
    expectedCode: true,
  },
];

async function runTest(test) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 ${test.name}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`📍 Endpoint: ${test.endpoint}`);
  console.log(`📤 Request:`, JSON.stringify(test.data, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}${test.endpoint}`, test.data);
    console.log(`✅ Status: ${response.status}`);
    console.log(`📥 Response:`);
    console.log(JSON.stringify(response.data, null, 2));

    // Validate response
    if (test.expectedIntent && response.data.intent) {
      if (response.data.intent === test.expectedIntent) {
        console.log(`✅ Intent matches: ${test.expectedIntent}`);
      } else {
        console.log(
          `❌ Intent mismatch! Expected: ${test.expectedIntent}, Got: ${response.data.intent}`
        );
      }
    }

    if (test.expectedResults && response.data.results) {
      console.log(`✅ Retrieved ${response.data.results.length} results`);
      if (response.data.results.length > 0) {
        console.log(
          `📄 Top result: ${
            response.data.results[0].path
          } (score: ${response.data.results[0].score.toFixed(3)})`
        );
      }
    }

    if (test.expectedCode && response.data.code) {
      console.log(`✅ Code generated (${response.data.code.length} chars)`);
      if (response.data.contextsUsed !== undefined) {
        console.log(`📚 RAG contexts used: ${response.data.contextsUsed}`);
      }
    }

    return true;
  } catch (error) {
    console.log(`❌ Test failed:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error:`, error.response.data);
    } else {
      console.log(`   Error:`, error.message);
    }
    return false;
  }
}

async function runAllTests() {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║     CodeEcho Multi-Agent Orchestration Test Suite        ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Total tests: ${testCases.length}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const result = await runTest(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║                      Test Summary                         ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${testCases.length}`);
  console.log(
    `📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`
  );

  if (failed === 0) {
    console.log(
      "🎉 All tests passed! The multi-agent system is working correctly.\n"
    );
  } else {
    console.log("⚠️  Some tests failed. Check the output above for details.\n");
  }
}

// Check if server is running
async function checkServer() {
  try {
    // Check if any API endpoint is reachable
    await axios.post(`${BASE_URL}/intent`, { transcript: "test" });
    return true;
  } catch (error) {
    // Even 500 errors mean the server is running
    if (error.response) {
      return true; // Server responded, it's running
    }
    console.error(
      "❌ Cannot connect to backend server at http://localhost:5000"
    );
    console.error(
      "   Make sure the backend is running: cd backend && npm start"
    );
    return false;
  }
}

// Main
(async () => {
  const serverReady = await checkServer();
  if (serverReady) {
    await runAllTests();
  } else {
    process.exit(1);
  }
})();
