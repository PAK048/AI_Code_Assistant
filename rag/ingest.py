"""RAG ingestion script for CodeEcho.

Scans project files, chunks them, sends chunks to a vector DB (Qdrant), and
persists metadata for downstream retrieval agents.
"""

from __future__ import annotations

import argparse
import os
import time
from pathlib import Path
from typing import Iterable, List

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest
from embedder import embed_texts as watson_embed

from langchain_text_splitters import RecursiveCharacterTextSplitter


load_dotenv()

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_COLLECTION = os.getenv("QDRANT_COLLECTION", "Hackathons")

# Configure source directory for indexing (only docs folder)
SOURCE_DIR = REPO_ROOT / "docs"

# Allowed file extensions - ONLY meaningful documentation and code
ALLOWED_EXT = [".md", ".txt", ".py", ".js", ".yaml", ".yml"]

# Directories to skip completely
SKIP_DIRS = [
    "node_modules",
    "sandbox",
    "runner",
    ".git",
    "__pycache__",
    "venv",
    ".env",
    "backend",
    "frontend",
    "chat_gpt",
    "Generated_Content",
    "tests",
    ".next",
    "dist",
    "build",
]

# Files to skip (by name)
SKIP_FILES = [
    "package-lock.json",
    "package.json",
    ".gitignore",
    ".env",
]

# Detect vector dimension from embeddings
print("🔍 Detecting embedding dimension...")
try:
    VECTOR_DIM = len(watson_embed(["dimension probe"])[0])
    print(f"✓ Using dimension: {VECTOR_DIM}")
except Exception as e:
    print(f"⚠️  Could not detect dimension ({e}), using default: 384")
    VECTOR_DIM = 384


def iter_source_files(root: Path) -> Iterable[Path]:
    """Yield only meaningful documentation and orchestration files."""
    skipped_dirs = 0
    skipped_files = 0
    allowed_files = 0
    
    print(f"\n📂 Scanning directory: {root}")
    print(f"   Allowed extensions: {', '.join(ALLOWED_EXT)}")
    print(f"   Skipping directories: {', '.join(SKIP_DIRS[:5])}... (and {len(SKIP_DIRS)-5} more)")
    
    for path in root.rglob("*"):
        # Skip if it's a directory
        if path.is_dir():
            continue
        
        # Check if path contains any skip directory
        path_str = str(path)
        if any(skip_dir in path_str for skip_dir in SKIP_DIRS):
            skipped_dirs += 1
            continue
        
        # Check if filename should be skipped
        if path.name in SKIP_FILES:
            skipped_files += 1
            continue
        
        # Check if extension is allowed
        if path.suffix.lower() not in ALLOWED_EXT:
            skipped_files += 1
            continue
        
        allowed_files += 1
        yield path
    
    print(f"\n📊 Scan complete:")
    print(f"   ✓ Files to index: {allowed_files}")
    print(f"   ⊗ Skipped (in excluded dirs): {skipped_dirs}")
    print(f"   ⊗ Skipped (wrong type/name): {skipped_files}")
    print(f"   Total scanned: {allowed_files + skipped_dirs + skipped_files}")


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Call watsonx.ai embeddings with a deterministic fallback."""
    return watson_embed(texts)


def ingest(collection: str = DEFAULT_COLLECTION, url: str | None = None, api_key: str | None = None) -> None:
    print("🚀 Starting CodeEcho RAG ingestion...")
    
    # Ensure docs directory exists
    if not SOURCE_DIR.exists():
        print(f"\n📁 Creating docs directory: {SOURCE_DIR}")
        SOURCE_DIR.mkdir(parents=True, exist_ok=True)
        print(f"   ℹ️  Please place your documentation files in: {SOURCE_DIR.relative_to(REPO_ROOT)}")
        print(f"   ℹ️  Allowed file types: {', '.join(ALLOWED_EXT)}")
        print(f"\n⚠️  No files to index yet. Add files to {SOURCE_DIR.relative_to(REPO_ROOT)} and run again.")
        return
    
    # Create Qdrant client with increased timeout
    client = QdrantClient(
        url=url or os.getenv("QDRANT_URL", "http://localhost:6333"), 
        api_key=api_key or os.getenv("QDRANT_API_KEY"),
        timeout=300  # 5 minutes timeout for cloud operations
    )

    if collection not in {c.name for c in client.get_collections().collections}:
        print(f"📦 Creating new collection '{collection}' with dimension {VECTOR_DIM}")
        client.recreate_collection(
            collection_name=collection,
            vectors_config=rest.VectorParams(size=VECTOR_DIM, distance=rest.Distance.COSINE),
        )
    else:
        print(f"📦 Using existing collection '{collection}'")

    splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)

    batch_points: list[rest.PointStruct] = []
    point_id = 0
    files_processed = 0
    files_skipped = 0
    total_chunks = 0

    # Collect all files first to show progress
    all_files = list(iter_source_files(SOURCE_DIR))
    
    if not all_files:
        print(f"\n⚠️  No files found in {SOURCE_DIR.relative_to(REPO_ROOT)}")
        print(f"   Add .md, .txt, .py, .js, .yaml, or .yml files to index")
        return
    
    print(f"\n{'='*60}")
    print(f"📚 Starting indexing of {len(all_files)} files...")
    print(f"{'='*60}")

    for file_idx, file_path in enumerate(all_files, 1):
        try:
            relative_path = file_path.relative_to(REPO_ROOT)
            print(f"\n[{file_idx}/{len(all_files)}] 📄 {relative_path}")
            
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            chunks = splitter.split_text(text)
            
            if not chunks:
                print(f"   ⊗ Skipped (no content)")
                files_skipped += 1
                continue
            
            print(f"   ✂️  Split into {len(chunks)} chunks")
            
            # Process chunks in smaller batches to avoid API limits and timeouts
            batch_size = 5  # Small batches for reliability
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i + batch_size]
                chunk_range = f"{i+1}-{min(i+batch_size, len(chunks))}"
                print(f"   🔄 Embedding chunks {chunk_range}...", end=" ", flush=True)
                
                try:
                    embeds = embed_texts(batch_chunks)
                    print("✓")
                except Exception as e:
                    print(f"❌")
                    print(f"      Error: {e}")
                    print(f"      Skipping this batch")
                    continue

                for chunk, vector in zip(batch_chunks, embeds, strict=True):
                    point = rest.PointStruct(
                        id=point_id,
                        vector=vector,
                        payload={
                            "path": str(relative_path),
                            "chunk": chunk,
                        },
                    )
                    batch_points.append(point)
                    point_id += 1
                    total_chunks += 1

                # Upsert in smaller batches to Qdrant
                if len(batch_points) >= 10:  # Much smaller batches for cloud (reduced from 32)
                    print(f"   💾 Uploading {len(batch_points)} points to Qdrant...", end=" ", flush=True)
                    try:
                        client.upsert(collection_name=collection, wait=False, points=batch_points)  # Don't wait for confirmation
                        print("✓")
                        time.sleep(0.5)  # Small delay to avoid overwhelming cloud API
                    except Exception as upload_error:
                        print(f"   ❌ Error: {upload_error}")
                        # Retry with even smaller batch
                        if len(batch_points) > 5:
                            print(f"   🔄 Retrying with smaller batches...")
                            for mini_batch_start in range(0, len(batch_points), 5):
                                mini_batch = batch_points[mini_batch_start:mini_batch_start + 5]
                                try:
                                    client.upsert(collection_name=collection, wait=False, points=mini_batch)
                                    print(f"      ✓ Uploaded {len(mini_batch)} points")
                                    time.sleep(0.3)  # Small delay between retries
                                except Exception as e:
                                    print(f"      ❌ Failed: {e}")
                    batch_points = []

            files_processed += 1
            print(f"   ✅ File indexed successfully")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            files_skipped += 1
            continue

    # Upload any remaining points
    if batch_points:
        print(f"\n💾 Uploading final {len(batch_points)} points to Qdrant...", end=" ", flush=True)
        try:
            # Upload in small batches for reliability
            for i in range(0, len(batch_points), 5):
                mini_batch = batch_points[i:i + 5]
                client.upsert(collection_name=collection, wait=False, points=mini_batch)
                print(".", end="", flush=True)
            print(" ✓")
        except Exception as e:
            print(f"\n   ❌ Error uploading final batch: {e}")

    print(f"\n{'='*60}")
    print(f"✅ Ingestion Complete!")
    print(f"{'='*60}")
    print(f"   📊 Summary:")
    print(f"      Files processed: {files_processed}")
    print(f"      Files skipped: {files_skipped}")
    print(f"      Total files: {len(all_files)}")
    print(f"      Total chunks indexed: {total_chunks}")
    print(f"      Collection: '{collection}'")
    print(f"      Vector dimension: {VECTOR_DIM}")
    print(f"{'='*60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest CodeEcho repo docs into Qdrant.")
    parser.add_argument("--collection", default=DEFAULT_COLLECTION)
    parser.add_argument("--url", default=os.getenv("QDRANT_URL"))
    parser.add_argument("--api-key", default=os.getenv("QDRANT_API_KEY"))
    args = parser.parse_args()

    ingest(collection=args.collection, url=args.url, api_key=args.api_key)
