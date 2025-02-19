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
      Format the output as JSON array:
      [
        {
          "role": "Expert Title",
          "description": "Brief description of expertise"
        }
      ]
      Select 3-4 experts.`
    },
    {
      role: "user",
      content: `Topic: ${topic}`
    }
  ];

  try {
    const response = await chatCompletion(messages);
    return JSON.parse(response);
  } catch (error) {
    console.error("Error generating experts:", error);
    return [];
  }
};

