import os
import time
from typing import Iterable, List
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from dotenv import load_dotenv

load_dotenv()

WATSONX_URL = os.getenv("WATSONX_URL")
WATSONX_API_KEY = os.getenv("WATSONX_API_KEY")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
WATSONX_EMBEDDING_MODEL = os.getenv(
    "WATSONX_EMBEDDING_MODEL", "sentence-transformers/all-minilm-l6-v2"
)

class WatsonxEmbeddingError(RuntimeError):
    pass


def get_session_with_retries():
    """Create a requests session with retry logic."""
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def get_iam_token(api_key: str) -> str:
    """Get IAM token with retry logic."""
    if not api_key or api_key == "your_watsonx_api_key":
        raise ValueError("Invalid or missing WATSONX_API_KEY. Please set a valid API key in .env file.")
    
    url = "https://iam.cloud.ibm.com/identity/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
        "apikey": api_key.strip()
    }
    
    session = get_session_with_retries()
    max_retries = 2
    
    for attempt in range(max_retries):
        try:
            resp = session.post(url, headers=headers, data=data, timeout=30)
            resp.raise_for_status()
            return resp.json()["access_token"]
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"IAM token request failed (attempt {attempt + 1}/{max_retries}): {e}")
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                print(f"\n❌ Failed to get IAM token after {max_retries} attempts")
                print(f"   Error: {e}")
                print(f"   Please verify your WATSONX_API_KEY is valid and not expired.")
                print(f"   You can regenerate it at: https://cloud.ibm.com/iam/apikeys")
                raise WatsonxEmbeddingError(f"IAM authentication failed: {e}")


def embed_texts(texts: Iterable[str]) -> List[List[float]]:
    texts = list(texts)
    if not texts:
        return []

    if not (WATSONX_URL and WATSONX_API_KEY and WATSONX_PROJECT_ID):
        print("⚠️  watsonx.ai credentials not configured, using fallback embeddings")
        return [[(len(t) % 7) / 10] * 384 for t in texts]

    max_retries = 2
    
    for attempt in range(max_retries):
        try:
            token = get_iam_token(WATSONX_API_KEY)

            payload = {
                "inputs": texts,
                "model_id": WATSONX_EMBEDDING_MODEL,
                "project_id": WATSONX_PROJECT_ID,
            }

            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "ML-Client-App": "generativeai"
            }

            params = {"version": "2023-10-25"}

            url = f"{WATSONX_URL}/ml/v1/text/embeddings"
            
            session = get_session_with_retries()
            resp = session.post(
                url,
                json=payload,
                headers=headers,
                params=params,
                timeout=120,  # Increased timeout
                stream=False  # Disable streaming to avoid chunked encoding errors
            )

            if resp.status_code >= 400:
                raise WatsonxEmbeddingError(f"API Error {resp.status_code}: {resp.text}")

            data = resp.json()
            return [item["embedding"] for item in data["results"]]
            
        except WatsonxEmbeddingError as e:
            print(f"\n❌ Watsonx API Error: {e}")
            print("   Falling back to simple hash-based embeddings...")
            return [[(hash(t) % 1000) / 1000] * 384 for t in texts]
            
        except (requests.exceptions.ChunkedEncodingError, 
                requests.exceptions.ConnectionError,
                requests.exceptions.Timeout) as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"⚠️  Network error (attempt {attempt + 1}/{max_retries}): {type(e).__name__}")
                print(f"   Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                print(f"❌ Failed after {max_retries} attempts. Using fallback embeddings.")
                return [[(hash(t) % 1000) / 1000] * 384 for t in texts]
                return [[(len(t) % 7) / 10] * 384 for t in texts]
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            raise

    return [[(len(t) % 7) / 10] * 384 for t in texts]
