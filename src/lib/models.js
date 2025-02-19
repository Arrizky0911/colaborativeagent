import axios from "axios"

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_API_BASE
const AZURE_API_KEY = process.env.AZURE_API_KEY
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION
const EMBEDDING_API_VERSION = process.env.AZURE_EMBEDDING_API_VERSION

// Rate limiter queue
const requestQueue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return;
  
  isProcessing = true;
  const { messages, resolve, reject } = requestQueue.shift();
  
  try {
    const result = await makeRequest(messages);
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    isProcessing = false;
    setTimeout(processQueue, 1000); // Delay 1 detik antara request
  }
};

const makeRequest = async (messages) => {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError;
  
  while (retryCount < maxRetries) {
    try {
      if (retryCount > 0) {
        const delay = Math.pow(2, retryCount) * 10000; // 10 detik, 20 detik, 40 detik
        console.log(`Waiting ${delay/1000} seconds before retry ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await axios.post(
        `${AZURE_OPENAI_ENDPOINT}/models/chat/completions?api-version=2024-05-01-preview`,
        {
          messages,
          max_tokens: 1000,
          model: "gpt-4o"
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": AZURE_API_KEY,
          },
        }
      );

      if (!response.data?.choices?.length) {
        throw new Error('Invalid response format from Azure OpenAI');
      }

      return response.data.choices[0].message.content;
      
    } catch (error) {
      lastError = error;
      if (error.response?.status === 429 && retryCount < maxRetries - 1) {
        retryCount++;
        continue;
      }
      throw error;
    }
  }
  
  throw lastError;
};

export const chatCompletion = async (messages) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ messages, resolve, reject });
    processQueue();
  });
};

export const generateEmbedding = async (input) => {
  try {
    const response = await axios.post(
      `${AZURE_OPENAI_ENDPOINT}/openai/deployments/text-embedding-3-small/embeddings?api-version=${EMBEDDING_API_VERSION}`,
      {
        input,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": AZURE_API_KEY,
        },
      },
    )
    return response.data
  } catch (error) {
    console.error("Error generating embedding:", error)
    throw error
  }
}