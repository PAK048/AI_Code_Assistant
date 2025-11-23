const axios = require("axios");

async function getIAMToken(apiKey) {
  const url = "https://iam.cloud.ibm.com/identity/token";
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  const data = new URLSearchParams({
    grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    apikey: apiKey,
  });

  const response = await axios.post(url, data, { headers });
  return response.data.access_token;
}

async function embedTexts(texts) {
  const apiKey = process.env.WATSONX_API_KEY;
  const endpoint = process.env.WATSONX_URL;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const model =
    process.env.WATSONX_EMBEDDING_MODEL ||
    "sentence-transformers/all-minilm-l6-v2";

  console.log(`[Embedding Service] Embedding ${texts.length} text(s)`);
  console.log(`[Embedding Service] Model: ${model}`);

  if (!apiKey || !endpoint || !projectId) {
    console.warn(
      "[Embedding Service] Missing credentials, using mock embeddings"
    );
    return texts.map((t) => Array(384).fill((t.length % 7) / 10));
  }

  try {
    const token = await getIAMToken(apiKey);

    console.log(`[Embedding Service] Calling Watsonx embedding API...`);
    const response = await axios.post(
      `${endpoint}/ml/v1/text/embeddings`,
      {
        inputs: texts,
        model_id: model,
        project_id: projectId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "ML-Client-App": "generativeai",
        },
        params: { version: "2023-10-25" },
      }
    );

    const embeddings = response.data.results.map((r) => r.embedding);
    console.log(
      `[Embedding Service] ✓ Generated ${embeddings.length} embeddings of dimension ${embeddings[0].length}`
    );
    return embeddings;
  } catch (err) {
    console.error(
      "[Embedding Service] Error:",
      err.response?.data || err.message
    );
    console.warn("[Embedding Service] Falling back to mock embeddings");
    return texts.map((t) => Array(384).fill((t.length % 7) / 10));
  }
}

module.exports = { embedTexts };
