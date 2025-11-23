const { QdrantClient } = require("@qdrant/js-client-rest");

let client;

function getQdrantClient() {
  if (client) {
    return client;
  }

  client = new QdrantClient({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY || undefined,
  });

  return client;
}

module.exports = getQdrantClient;
