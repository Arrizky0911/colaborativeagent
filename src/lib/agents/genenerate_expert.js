import axios from 'axios';
import { chatCompletion } from '../models';

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_API_BASE
const AZURE_API_KEY = process.env.AZURE_API_KEY
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION

export const getAgents = async (topic) => {
  const messages = [
    {
      role: "system",
      content: `You need to select a group of speakers suitable for a roundtable discussion.
      Consider speakers with different perspectives and expertise.
      Format the output as:
      1. [speaker role]: [short description]
      2. [speaker role]: [short description]
      Select 3-4 experts plus a moderator. 
      Do not use a person name as [speaker role] but only a role, for example Biologist`,
    },
    {
      role: "user",
      content: `Topic: ${topic}
      Number of speakers needed: 3`,
    },
  ]

  try {
    // const response = await client.getChatCompletions(deploymentId, messages)
    const response = await chatCompletion(messages);
    
    const expertsText = Array.isArray(response) ? response[0] : response;

    console.log(experts)
    // Parse the experts text into structured data
    const experts = expertsText
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [role, description] = line.substring(3).split(": ")
        return { role: role.trim(), description: description.trim() }
      })

    // console.log(experts)



    return Response.json(experts)
  } catch (error) {
    console.error("Error:", error)
    return Response.json({ error: "Failed to generate experts" }, { status: 500 })
  }
}

