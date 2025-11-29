# RAG (Retrieval-Augmented Generation) Module

This module handles document ingestion and embedding generation for CodeEcho's knowledge base.

## Quick Start

### Option 1: With Valid Watsonx Credentials (Recommended)

1. **Test your credentials:**

```bash
python test_watsonx_auth.py
```

2. **If successful, run ingestion:**

```bash
python ingest.py
```

### Option 2: Fallback Mode (For Testing)

If you don't have valid watsonx credentials yet:

```bash
python quick_ingest.py
```

This will use hash-based embeddings suitable for development/testing.

## Files

- **`ingest.py`** - Main ingestion script that indexes documents into Qdrant
- **`embedder.py`** - Watsonx embedding service with fallback support
- **`test_rag.py`** - Test RAG retrieval functionality
- **`test_watsonx_auth.py`** - Validate watsonx credentials
- **`quick_ingest.py`** - Fast ingestion with fallback embeddings
- **`verify_qdrant.py`** - Check Qdrant connection and data

## Configuration

Set these in `backend/.env`:

```bash
# Watsonx Configuration
WATSONX_API_KEY=your_api_key_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your_project_id
WATSONX_EMBEDDING_MODEL=sentence-transformers/all-minilm-l6-v2

# Qdrant Configuration
QDRANT_URL=http://localhost:6333  # or your Qdrant Cloud URL
QDRANT_API_KEY=your_qdrant_key    # if using Qdrant Cloud
QDRANT_COLLECTION=Hackathons
```

## Troubleshooting

### Error: "Provided API key could not be found"

**Cause:** Your watsonx API key is invalid or expired.

**Solution:**

1. Go to https://cloud.ibm.com/iam/apikeys
2. Create a new API key
3. Update `WATSONX_API_KEY` in `backend/.env`
4. Run `python test_watsonx_auth.py` to verify

**Alternative:** Use fallback mode:

```bash
python quick_ingest.py
```

### Error: Connection to Qdrant failed

**Cause:** Qdrant is not running.

**Solution:**

```bash
# Start Qdrant with Docker Compose (from project root)
docker-compose up -d qdrant

# Verify it's running
docker ps | grep qdrant
```

### Slow ingestion

- Documents are chunked and embedded in batches
- Large projects may take several minutes
- Progress is shown for each file

## How It Works

1. **Scan** - Finds all documents in `docs/` folder
2. **Chunk** - Splits documents into manageable pieces
3. **Embed** - Generates vector embeddings for each chunk
4. **Store** - Saves embeddings to Qdrant vector database
5. **Index** - Creates searchable index for retrieval

## What Gets Indexed

By default, only the `docs/` folder is indexed.

**Allowed file types:**

- `.md` - Markdown documentation
- `.txt` - Text files
- `.py` - Python code
- `.js` - JavaScript code
- `.yaml`, `.yml` - Configuration files

**Excluded directories:**

- `node_modules/`
- `.git/`
- `__pycache__/`
- `sandbox/`
- `runner/`
- Build/dist folders

## Advanced Usage

### Custom collection name:

```bash
python ingest.py --collection my_collection
```

### Custom Qdrant URL:

```bash
python ingest.py --url https://your-qdrant.cloud
```

### Test retrieval:

```bash
python test_rag.py
```

## Production Recommendations

1. ✅ Use valid watsonx credentials
2. ✅ Use Qdrant Cloud for persistence
3. ✅ Regularly re-index when docs change
4. ✅ Monitor embedding quality
5. ⚠️ Avoid fallback embeddings in production

## Getting Watsonx API Key

1. Sign up at https://www.ibm.com/watsonx
2. Create a project
3. Go to IAM (https://cloud.ibm.com/iam/apikeys)
4. Create API key
5. Copy and save it immediately (shown only once)
6. Add to `backend/.env`
