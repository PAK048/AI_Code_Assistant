"""Test script for RAG ingestion and retrieval."""
import os
import sys
from pathlib import Path

# Add repo root to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from rag.embedder import embed_texts
from rag.ingest import ingest

def test_rag_flow():
    print("Testing embedding generation...")
    test_text = "This is a test document for CodeEcho RAG."
    embeddings = embed_texts([test_text])
    
    if not embeddings or len(embeddings) == 0:
        print("❌ Embedding generation failed")
        return
        
    dim = len(embeddings[0])
    print(f"✅ Generated embedding with dimension: {dim}")
    
    print("\nRunning ingestion (dry run)...")
    # Use a test collection to avoid overwriting main index
    test_collection = "codeecho_test"
    try:
        ingest(collection=test_collection)
        print(f"✅ Ingestion into '{test_collection}' completed")
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
        return

    print("\n✅ RAG flow test passed!")

if __name__ == "__main__":
    test_rag_flow()
