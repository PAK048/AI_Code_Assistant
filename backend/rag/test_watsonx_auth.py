#!/usr/bin/env python3
"""
Test watsonx.ai credentials and API connectivity.
Run this before attempting RAG ingestion.
"""

import os
import sys
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

WATSONX_API_KEY = os.getenv("WATSONX_API_KEY")
WATSONX_URL = os.getenv("WATSONX_URL")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")

def test_credentials():
    """Test if watsonx credentials are valid."""
    print("=" * 60)
    print("🔐 Testing watsonx.ai Credentials")
    print("=" * 60)
    
    # Check if credentials exist
    print("\n1. Checking environment variables...")
    if not WATSONX_API_KEY:
        print("   ❌ WATSONX_API_KEY is not set")
        return False
    if not WATSONX_URL:
        print("   ❌ WATSONX_URL is not set")
        return False
    if not WATSONX_PROJECT_ID:
        print("   ❌ WATSONX_PROJECT_ID is not set")
        return False
    
    print(f"   ✅ WATSONX_API_KEY: {WATSONX_API_KEY[:10]}...")
    print(f"   ✅ WATSONX_URL: {WATSONX_URL}")
    print(f"   ✅ WATSONX_PROJECT_ID: {WATSONX_PROJECT_ID}")
    
    # Test IAM token
    print("\n2. Testing IAM authentication...")
    try:
        url = "https://iam.cloud.ibm.com/identity/token"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": WATSONX_API_KEY.strip()
        }
        
        resp = requests.post(url, headers=headers, data=data, timeout=30)
        
        if resp.status_code == 200:
            print("   ✅ IAM authentication successful!")
            token = resp.json()["access_token"]
            print(f"   ✅ Token obtained: {token[:20]}...")
            return True
        else:
            print(f"   ❌ IAM authentication failed: {resp.status_code}")
            print(f"   Response: {resp.text[:200]}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def print_help():
    """Print help information."""
    print("\n" + "=" * 60)
    print("📖 How to fix credential issues:")
    print("=" * 60)
    print("""
1. **Get a valid API Key:**
   - Go to: https://cloud.ibm.com/iam/apikeys
   - Click "Create" to generate a new API key
   - Copy the key immediately (you won't see it again)

2. **Update your .env file:**
   - Open: backend/.env
   - Set: WATSONX_API_KEY=<your-new-api-key>

3. **Verify your Project ID:**
   - Go to: https://dataplatform.cloud.ibm.com/projects
   - Open your watsonx project
   - Copy the project ID from the URL or settings

4. **Alternative: Use local embeddings (for testing):**
   - The system will automatically fall back to simple embeddings
   - These work for testing but won't be as accurate as watsonx

5. **Re-run this test:**
   cd backend/rag
   python test_watsonx_auth.py
""")

if __name__ == "__main__":
    success = test_credentials()
    
    if not success:
        print_help()
        sys.exit(1)
    else:
        print("\n✅ All checks passed! You can now run:")
        print("   python ingest.py")
        sys.exit(0)
