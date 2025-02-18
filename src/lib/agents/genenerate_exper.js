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
      content: `You need to select a group of speakers suitable for a roundtable discussion.
      Consider speakers with different perspectives and expertise.
      Format the output as:
      1. [speaker role]: [short description]
      2. [speaker role]: [short description]
      Select 3-4 experts plus a moderator.`,
    },
    {
      role: "user",
      content: `Topic: ${topic}
      Number of speakers needed: 4`,
    },
  ]

  try {
    const response = await client.getChatCompletions(deploymentId, messages)
    const expertsText = response.choices[0].message?.content || ""

    // Parse the experts text into structured data
    const experts = expertsText
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [role, description] = line.substring(3).split(": ")
        return { role: role.trim(), description: description.trim() }
      })

    return Response.json(experts)
  } catch (error) {
    console.error("Error:", error)
    return Response.json({ error: "Failed to generate experts" }, { status: 500 })
  }
}

