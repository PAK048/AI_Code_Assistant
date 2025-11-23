#!/usr/bin/env python3
"""
Qdrant Connection Verification Script
Checks both local and cloud Qdrant instances and verifies data upload.
"""

import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest

load_dotenv()

def check_connection(url, api_key, name):
    """Check a Qdrant connection and return status."""
    print(f"\n{'='*60}")
    print(f"🔍 Checking {name}")
    print(f"{'='*60}")
    print(f"   URL: {url}")
    print(f"   API Key: {'✓ Set' if api_key else '✗ Not set'}")
    
    try:
        client = QdrantClient(url=url, api_key=api_key, timeout=10)
        print(f"   ✅ Connected successfully!")
        
        # List all collections
        collections = client.get_collections()
        print(f"\n📦 Collections ({len(collections.collections)}):")
        
        if not collections.collections:
            print(f"   ⚠️  No collections found")
            return None, None
        
        for coll in collections.collections:
            # Get full collection info to access counts
            try:
                coll_info = client.get_collection(coll.name)
                points = coll_info.points_count if hasattr(coll_info, 'points_count') else 0
                vectors = coll_info.vectors_count if hasattr(coll_info, 'vectors_count') else 0
                print(f"   - {coll.name}: {points} points, {vectors} vectors")
            except:
                print(f"   - {coll.name}: (unable to get stats)")
        
        return client, collections.collections
        
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        return None, None

def check_collection_details(client, collection_name):
    """Check details of a specific collection."""
    print(f"\n🔍 Checking collection '{collection_name}':")
    
    try:
        collection_info = client.get_collection(collection_name)
        print(f"   ✅ Collection exists!")
        print(f"\n   📊 Statistics:")
        print(f"      Total points: {collection_info.points_count}")
        
        # Try to get vector info
        try:
            vector_size = collection_info.config.params.vectors.size
            distance = collection_info.config.params.vectors.distance
            print(f"      Vector dimension: {vector_size}")
            print(f"      Distance metric: {distance}")
        except:
            print(f"      Vector info: (unable to retrieve)")
        
        # Get sample points
        if collection_info.points_count > 0:
            print(f"\n   📄 Sample data (first 3 points):")
            results = client.scroll(
                collection_name=collection_name,
                limit=3,
                with_payload=True,
                with_vectors=False
            )
            
            for idx, point in enumerate(results[0], 1):
                print(f"\n      Point {idx} (ID: {point.id}):")
                if point.payload:
                    print(f"         Path: {point.payload.get('path', 'N/A')}")
                    chunk = point.payload.get('chunk', '')
                    preview = chunk[:100].replace('\n', ' ') + "..." if len(chunk) > 100 else chunk
                    print(f"         Chunk: {preview}")
            
            return True
        else:
            print(f"   ⚠️  Collection is EMPTY (0 points)")
            return False
            
    except Exception as e:
        print(f"   ❌ Collection not found or error: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("🚀 QDRANT CONNECTION VERIFICATION")
    print("="*60)
    
    # Get configuration
    collection_name = os.getenv("QDRANT_COLLECTION", "Hackathons")
    local_url = "http://localhost:6333"
    cloud_url = os.getenv("QDRANT_URL")
    cloud_api_key = os.getenv("QDRANT_API_KEY")
    
    print(f"\n📋 Configuration from .env:")
    print(f"   QDRANT_URL: {cloud_url}")
    print(f"   QDRANT_API_KEY: {'✓ Set' if cloud_api_key else '✗ Not set'}")
    print(f"   QDRANT_COLLECTION: {collection_name}")
    
    # Check local Qdrant
    local_client, local_collections = check_connection(local_url, None, "LOCAL QDRANT (localhost:6333)")
    local_has_data = False
    
    if local_client:
        local_has_data = check_collection_details(local_client, collection_name)
    
    # Check cloud Qdrant (if different from local)
    cloud_client = None
    cloud_has_data = False
    
    if cloud_url and cloud_url != local_url:
        cloud_client, cloud_collections = check_connection(cloud_url, cloud_api_key, "CLOUD QDRANT")
        
        if cloud_client:
            cloud_has_data = check_collection_details(cloud_client, collection_name)
    else:
        print(f"\n{'='*60}")
        print(f"⚠️  CLOUD QDRANT NOT CONFIGURED")
        print(f"{'='*60}")
        print(f"   Current QDRANT_URL points to localhost")
        print(f"   To use Qdrant Cloud, update .env with:")
        print(f"   QDRANT_URL=https://YOUR-CLUSTER.cloud.qdrant.io")
        print(f"   QDRANT_API_KEY=your-api-key-here")
    
    # Summary and Recommendations
    print(f"\n{'='*60}")
    print(f"📊 SUMMARY & RECOMMENDATIONS")
    print(f"{'='*60}")
    
    if local_has_data and not cloud_has_data:
        print(f"\n✅ LOCAL: Data found ({collection_name})")
        print(f"❌ CLOUD: No data or not configured")
        print(f"\n💡 Recommendation:")
        print(f"   Your data is in LOCAL Qdrant only.")
        print(f"   Options:")
        print(f"   1. Keep using local (good for development)")
        print(f"   2. Upload to cloud for production:")
        print(f"      - Update QDRANT_URL and QDRANT_API_KEY in .env")
        print(f"      - Run: cd rag && python ingest.py")
        
    elif cloud_has_data and not local_has_data:
        print(f"\n❌ LOCAL: No data")
        print(f"✅ CLOUD: Data found ({collection_name})")
        print(f"\n💡 Recommendation:")
        print(f"   Your data is in CLOUD Qdrant.")
        print(f"   ✓ Configuration is correct for production use!")
        
    elif local_has_data and cloud_has_data:
        print(f"\n✅ LOCAL: Data found")
        print(f"✅ CLOUD: Data found")
        print(f"\n💡 Recommendation:")
        print(f"   Data exists in BOTH local and cloud.")
        print(f"   Make sure QDRANT_URL points to the one you want to use:")
        print(f"   - For development: http://localhost:6333")
        print(f"   - For production: https://YOUR-CLUSTER.cloud.qdrant.io")
        
    else:
        print(f"\n❌ LOCAL: No data")
        print(f"❌ CLOUD: No data or not configured")
        print(f"\n💡 Recommendation:")
        print(f"   No data found in either location.")
        print(f"   1. Configure your desired Qdrant instance in .env")
        print(f"   2. Run: cd rag && python ingest.py")
    
    # Test which instance .env is pointing to
    print(f"\n{'='*60}")
    print(f"🎯 CURRENT CONFIGURATION POINTS TO:")
    print(f"{'='*60}")
    
    if cloud_url == local_url or not cloud_url:
        print(f"   📍 LOCAL Qdrant (localhost:6333)")
        print(f"   ✓ Good for: Development, testing")
        print(f"   ✗ Not suitable for: Production, remote access")
    else:
        print(f"   📍 CLOUD Qdrant ({cloud_url})")
        print(f"   ✓ Good for: Production, remote access, scalability")
        print(f"   ✗ Requires: Internet connection, API key")
    
    print(f"\n{'='*60}")
    print(f"✅ Verification Complete!")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
