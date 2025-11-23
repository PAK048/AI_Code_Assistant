# CodeEcho Backend - Quick Start Guide

## 🚀 Starting the Backend

```bash
cd backend
npm install  # if needed
npm start
```

Server will start on: `http://localhost:5000`

## 🧪 Testing the Multi-Agent System

### Option 1: Automated Test Suite

```bash
node test-agents.js
```

This will run 8 comprehensive tests covering all agents and scenarios.

### Option 2: Manual curl Tests

#### Test 1: RAG-based Documentation Query

```bash
curl -X POST http://localhost:5000/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do agents communicate in CodeEcho?"}'
```

**Expected:**

- Intent: `rag_answer`
- Answer based on retrieved documentation
- Sources listed from docs/

#### Test 2: Code Generation with RAG

```bash
curl -X POST http://localhost:5000/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "create a react login component"}'
```

**Expected:**

- Intent: `generate_code`
- Complete React component code
- Filename suggestion: `LoginComponent.jsx`
- Sources from RAG retrieval

#### Test 3: Intent Detection

```bash
curl -X POST http://localhost:5000/api/agents/intent \
  -H "Content-Type: application/json" \
  -d '{"transcript": "what is the architecture?"}'
```

**Expected:**

```json
{
  "type": "rag_answer",
  "confidence": 0.85,
  "original": "what is the architecture?"
}
```

#### Test 4: RAG Retrieval

```bash
curl -X POST http://localhost:5000/api/agents/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query": "agent workflow architecture", "topK": 3}'
```

**Expected:**

- 3 relevant document chunks
- Relevance scores
- Source paths

## 📊 Monitoring

Watch the terminal for detailed logs:

```
[Orchestrator] New chat request: How do agents communicate?
[Intent Agent] Processing: How do agents communicate?
[Intent Agent] Detected: rag_answer (confidence: 0.85)
[RAG Handler] Retrieving context...
[Embedding Service] Embedding query: "How do agents communicate?..."
[Embedding Service] Generated 384-dim vector
[Retrieval Agent] Searching collection: Hackathons
[Retrieval Agent] Found 5 results
[RAG Handler] Generating answer with context...
[LLM Service] Calling model: ibm/granite-3-8b-instruct
[LLM Service] Generated 423 chars
[Orchestrator] ✓ Request completed
```

## 🎯 Key Endpoints

| Endpoint                    | Purpose                             | Request Body                       |
| --------------------------- | ----------------------------------- | ---------------------------------- |
| `POST /api/agents/chat`     | **Recommended**: Full orchestration | `{ message, autoExecute? }`        |
| `POST /api/agents/intent`   | Intent detection only               | `{ transcript }`                   |
| `POST /api/agents/generate` | Code generation with RAG            | `{ prompt, context?, skipRAG? }`   |
| `POST /api/agents/retrieve` | RAG retrieval only                  | `{ query, topK? }`                 |
| `POST /api/agents/file`     | File operations                     | `{ filePath, content, operation }` |
| `POST /api/agents/run`      | Execute commands                    | `{ command }`                      |
| `POST /api/agents/git`      | Git operations                      | `{ action, ... }`                  |

## ✅ Verify Everything Works

Run this command to test all endpoints:

```bash
node test-agents.js
```

You should see:

```
╔═══════════════════════════════════════════════════════════╗
║     CodeEcho Multi-Agent Orchestration Test Suite        ║
╚═══════════════════════════════════════════════════════════╝

✅ Passed: 8
❌ Failed: 0
📊 Total:  8
📈 Success Rate: 100.0%

🎉 All tests passed! The multi-agent system is working correctly.
```

## 🐛 Troubleshooting

### Issue: "Cannot connect to backend server"

**Solution:** Make sure backend is running:

```bash
cd backend
npm start
```

### Issue: "Qdrant connection failed"

**Solution:** Check `.env` file has correct Qdrant credentials:

```
QDRANT_URL=https://...
QDRANT_API_KEY=...
QDRANT_COLLECTION=Hackathons
```

### Issue: "Intent always returns unknown"

**Solution:** This should be fixed! The heuristic system should handle most cases. Check logs for details.

### Issue: "No RAG context retrieved"

**Solution:**

1. Verify Qdrant collection exists: Check Qdrant dashboard
2. Verify embeddings are working: Check `[Embedding Service]` logs
3. Check collection name matches .env

## 📝 Example Queries to Test

**RAG Answers (Documentation Questions):**

- "How do agents communicate in CodeEcho?"
- "Explain the workflow"
- "What is the architecture?"
- "How does RAG work?"

**Code Generation:**

- "create a react login component"
- "generate a logout button"
- "make a signup form"
- "write a python function to sort"

**Debug:**

- "tests are failing"
- "fix the login error"
- "component not rendering"

## 🎉 Success Indicators

✅ **Intent Detection Working:**

- Different queries produce different intents
- Confidence scores are reasonable (> 0.5)
- No "unknown" for common patterns

✅ **RAG Integration Working:**

- Logs show `[Retrieval Agent]` activity
- Context chunks appear in responses
- Sources are cited

✅ **Multi-Agent Orchestration Working:**

- Logs show agent transitions
- Full workflow executes
- Responses use retrieved context

✅ **No Hallucinations:**

- Answers reference actual documentation
- Code follows project patterns
- Sources are real files from docs/

---

**🚀 You're all set! The multi-agent system is fully operational.**
