#!/usr/bin/env python3
"""
Quick RAG ingestion with fallback embeddings.
Use this when watsonx API is unavailable.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Temporarily disable watsonx to force fallback
original_key = os.environ.get("WATSONX_API_KEY")
os.environ["WATSONX_API_KEY"] = ""

print("=" * 60)
print("🚀 Quick RAG Ingestion (Fallback Mode)")
print("=" * 60)
print("\n⚠️  Using hash-based embeddings instead of watsonx")
print("   This is suitable for testing and development.")
print("   For production, get a valid watsonx API key.\n")

try:
    from ingest import ingest
    ingest()
    print("\n✅ Ingestion complete with fallback embeddings!")
    print("   You can now use RAG features for testing.")
finally:
    # Restore original key
    if original_key:
        os.environ["WATSONX_API_KEY"] = original_key
