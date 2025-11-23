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

/**
 * Thin wrapper around watsonx.ai text generation.
 * Falls back to a mock response if credentials are not present so the demo still runs.
 *
 * @param {string|object} prompt - Either a string prompt or structured prompt object
 * @param {object} options - Generation options (model, maxNewTokens, temperature, etc.)
 * @returns {Promise<{text: string}>}
 */
async function callWatsonx(prompt, options = {}) {
  const apiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const endpoint = process.env.WATSONX_URL;
  const model =
    options.model ||
    process.env.WATSONX_GENERATION_MODEL ||
    "ibm/granite-3-8b-instruct";

  // Handle structured prompts
  let finalPrompt = prompt;
  if (typeof prompt === "object") {
    finalPrompt = buildStructuredPrompt(prompt);
  }

  if (!apiKey || !endpoint || !projectId) {
    console.warn("[LLM Service] Missing credentials, using mock response");
    return {
      text: `Mock watsonx response for: ${finalPrompt.slice(0, 80)}...`,
    };
  }

  try {
    const token = await getIAMToken(apiKey);

    console.log(`[LLM Service] Calling model: ${model}`);
    console.log(`[LLM Service] Prompt length: ${finalPrompt.length} chars`);

    const response = await axios.post(
      `${endpoint}/ml/v1/text/generation`,
      {
        input: finalPrompt,
        parameters: {
          max_new_tokens: options.maxNewTokens || 512,
          temperature: options.temperature ?? 0.2,
          top_p: options.topP ?? 0.9,
          top_k: options.topK ?? 50,
        },
        model_id: model,
        project_id: projectId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: { version: "2024-03-19" },
      }
    );

    const generatedText = response.data?.results?.[0]?.generated_text || "";
    console.log(`[LLM Service] Generated ${generatedText.length} chars`);

    return {
      text: generatedText,
    };
  } catch (error) {
    console.error(
      "[LLM Service] Request failed:",
      error.response?.data || error.message
    );
    return {
      text: `Fallback response due to watsonx error: ${error.message}`,
    };
  }
}

/**
 * Build a structured prompt from components
 * @param {object} components - { system, context, userQuery, examples }
 */
function buildStructuredPrompt(components) {
  let prompt = "";

  if (components.system) {
    prompt += `SYSTEM:\n${components.system}\n\n`;
  }

  if (components.context && components.context.length > 0) {
    prompt += `CONTEXT:\n`;
    if (Array.isArray(components.context)) {
      components.context.forEach((ctx, idx) => {
        prompt += `[${idx + 1}] ${ctx}\n`;
      });
    } else {
      prompt += `${components.context}\n`;
    }
    prompt += `\n`;
  }

  if (components.examples && components.examples.length > 0) {
    prompt += `EXAMPLES:\n`;
    components.examples.forEach((ex, idx) => {
      prompt += `Example ${idx + 1}:\n${ex}\n\n`;
    });
  }

  if (components.userQuery) {
    prompt += `USER QUERY:\n${components.userQuery}\n\n`;
  }

  if (components.instruction) {
    prompt += `INSTRUCTION:\n${components.instruction}\n`;
  }

  return prompt;
}

module.exports = { callWatsonx, buildStructuredPrompt };
