import { AzureKeyCredential, OpenAIClient } from "@azure/openai"

const endpoint = process.env.AZURE_OPENAI_ENDPOINT
const azureApiKey = process.env.AZURE_OPENAI_API_KEY
const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID

const client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey))

export async function POST(req) {
  const { topic } = await req.json()

  const messages = [
    {
      role: "system",
      content: `You are an expert at creating outlines. Write an outline for a deep research report regarding the given topic.
      Use "#" for section titles, "##" for subsection titles, "###" for subsubsection titles.
      Only include the outline structure, no other information.`,
    },
    {
      role: "user",
      content: `Topic: ${topic}`,
    },
  ]

  try {
    const response = await client.getChatCompletions(deploymentId, messages)
    const outline = response.choices[0].message?.content || ""

    return Response.json(outline)
  } catch (error) {
    console.error("Error:", error)
    return Response.json({ error: "Failed to generate outline" }, { status: 500 })
  }
}

