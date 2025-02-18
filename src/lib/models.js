import axios from "axios"

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_API_BASE
const AZURE_API_KEY = process.env.AZURE_API_KEY
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION
const EMBEDDING_API_VERSION = process.env.AZURE_EMBEDDING_API_VERSION

export const chatCompletion = async (messages) => {
    try {
      const response = await axios.post(
        `${AZURE_OPENAI_ENDPOINT}/models/chat/completions?api-version=${API_VERSION}`,
        {
          messages,
          max_tokens: 2000,
          model: "gpt-4o",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": AZURE_API_KEY,
          },
        }
      )
  
      const choices = response.data.choices || []
      const completions = choices.map(choice => choice.message?.content || "")
  
      return completions
    } catch (error) {
      console.error("Error in chat completion:", error)
      throw error
    }
  }

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