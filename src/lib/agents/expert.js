import { TavilySearchResults } from "@langchain/community/tools/tavily_search"
import { AzureChatOpenAI  } from "@langchain/openai"

export const IntentType = {
  ORIGINAL_QUESTION: "ORIGINAL_QUESTION",
  INFORMATION_REQUEST: "INFORMATION_REQUEST",
  POTENTIAL_ANSWER: "POTENTIAL_ANSWER",
  FURTHER_DETAILS: "FURTHER_DETAILS",
}

export class ExpertAgent {
  constructor(role, description) {
    this.role = role
    this.description = description
    this.model = new AzureChatOpenAI ({
      azureOpenAIApiKey: process.env.AZURE_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
      azureOpenAIApiInstanceName: process.env.AZURE_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_INSTANCE_NAME
      azureOpenAIApiDeploymentName: 'gpt-4o', 
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, 
    })
    this.searchTool = new TavilySearchResults({
      apiKey: process.env.TAVILY_API_KEY,
    })
  }

  async chooseIntent(discourseHistory) {
    const response = await this.model.invoke([
      {
        role: "system",
        content: `You are ${this.role}. Based on the discourse history, choose an intent type from: 
        ORIGINAL_QUESTION, INFORMATION_REQUEST, POTENTIAL_ANSWER, FURTHER_DETAILS.
        Consider your expertise and the conversation flow.`,
      },
      {
        role: "user",
        content: `Discourse history:\n${discourseHistory.join("\n")}\n\nChoose intent:`,
      },
    ])
    return response.content
  }

  async generateQueries(topic, question) {
    const response = await this.model.invoke([
      {
        role: "system",
        content: `Generate search queries to answer the question or support a claim.
        Format: - query 1\n- query 2\n...`,
      },
      {
        role: "user",
        content: `Topic: ${topic}\nQuestion: ${question}`,
      },
    ])
    return response.content.split("\n").map((q) => q.replace("- ", "").trim())
  }

  async generateAnswer(topic, question, information) {
    const response = await this.model.invoke([
      {
        role: "system",
        content: `You are ${this.role}. Generate an informative response using the provided information.
        Use citations in [n] format. Start with "Based on the available information..." if information is incomplete.`,
      },
      {
        role: "user",
        content: `Topic: ${topic}\nQuestion: ${question}\nInformation:\n${information}`,
      },
    ])
    return response.content
  }

  async polishUtterance(content, previousUtterance) {
    const response = await this.model.invoke([
      {
        role: "system",
        content: `As ${this.role}, make this response more conversational and engaging.
        Keep citations and maintain information accuracy.`,
      },
      {
        role: "user",
        content: `Previous utterance: ${previousUtterance}\nContent to polish: ${content}`,
      },
    ])
    return response.content
  }

  async generateUtterance(topic, discourseHistory) {
    const intent = await this.chooseIntent(discourseHistory)
    let content

    if (intent === IntentType.POTENTIAL_ANSWER || intent === IntentType.FURTHER_DETAILS) {
      const lastQuestion = discourseHistory[discourseHistory.length - 1]
      const queries = await this.generateQueries(topic, lastQuestion)
      const searchResults = []

      for (const query of queries) {
        const results = await this.searchTool.invoke(query)
        searchResults.push(...results)
      }

      content = await this.generateAnswer(topic, lastQuestion, JSON.stringify(searchResults))
    } else {
      content = await this.model.invoke([
        {
          role: "system",
          content: `As ${this.role}, generate a relevant question based on the discourse history.`,
        },
        {
          role: "user",
          content: `Discourse history:\n${discourseHistory.join("\n")}`,
        },
      ])
      content = content.content
    }

    const previousUtterance = discourseHistory[discourseHistory.length - 1] || ""
    const polishedContent = await this.polishUtterance(content, previousUtterance)

    return {
      role: this.role,
      content: polishedContent,
      intent,
      timestamp: new Date().toISOString(),
    }
  }
}

