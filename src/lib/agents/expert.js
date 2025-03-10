import { chatCompletion } from "../models"
import { searchTavily } from '../search/tavily'

export const IntentType = {
  ORIGINAL_QUESTION: "ORIGINAL_QUESTION",
  INFORMATION_REQUEST: "INFORMATION_REQUEST",
  POTENTIAL_ANSWER: "POTENTIAL_ANSWER",
  FURTHER_DETAILS: "FURTHER_DETAILS",
}

export class ExpertAgent {
  constructor() {
    this.role = "Expert"
  }

  async generateExperts(topic) {
    const response = await chatCompletion([
      {
        role: "system",
        content: `Generate 3-4 relevant expert roles for the given topic.
        Each expert should have complementary expertise to facilitate comprehensive discussion.
        Format output as JSON array:
        [
          {
            "role": "Expert Title",
            "description": "Brief description of expertise"
          }
        ]`
      },
      {
        role: "user",
        content: `Topic: ${topic}`
      }
    ]);

    return JSON.parse(response);
  }

  async generateResponse(topic, question, expertRole) {
    const response = await chatCompletion([
      {
        role: "system",
        content: `You are an expert ${expertRole}.
        Generate a detailed, informative response about ${topic} related to the given question.
        Use your expertise to provide insights and analysis.
        Format:
        - Clear, structured paragraphs
        - Professional academic tone
        - Include theoretical and practical perspectives
        - Draw from your domain knowledge`
      },
      {
        role: "user",
        content: `Topic: ${topic}\nQuestion: ${question}`
      }
    ]);

    return {
      content: response,
      citations: [] // Kosong karena tidak menggunakan search
    }
  }

  async generateQueries(topic, question) {
    const response = await chatCompletion([
      {
        role: "system",
        content: `Generate 3-5 academic search queries to find relevant information.
        Format: - query 1\n- query 2\n...`
      },
      {
        role: "user",
        content: `Topic: ${topic}\nQuestion: ${question}`
      }
    ]);

    return response.split("\n")
      .map(q => q.replace("- ", "").trim())
      .filter(q => q.length > 0);
  }

  async chooseIntent(discourseHistory) {
    const response = await chatCompletion([
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
    return response
  }

  async generateAnswer(topic, question, information) {
    const response = await chatCompletion([
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
    return response
  }

  async polishUtterance(content, previousUtterance) {
    const response = await chatCompletion([
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
    return response
  }

  async generateUtterance(topic, discourseHistory) {
    const intent = await this.chooseIntent(discourseHistory)
    let content

    if (intent === IntentType.POTENTIAL_ANSWER || intent === IntentType.FURTHER_DETAILS) {
      const lastQuestion = discourseHistory[discourseHistory.length - 1]
      const queries = await this.generateQueries(topic, lastQuestion)
      const searchResults = []

      for (const query of queries) {
        const results = await this.searchTool.search(topic, query)
        searchResults.push(...results)
      }

      content = await this.generateAnswer(topic, lastQuestion, JSON.stringify(searchResults))
    } else {
      content = await chatCompletion([
        {
          role: "system",
          content: `As ${this.role}, generate a relevant question based on the discourse history.`,
        },
        {
          role: "user",
          content: `Discourse history:\n${discourseHistory.join("\n")}`,
        },
      ])
      content = content
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

  async generateArticle(topic, discussionHistory, mindMap) {
    const response = await chatCompletion([
      {
        role: "system",
        content: `Generate a comprehensive article based on the discussion history and mind map structure.
        The article should:
        1. Have a clear introduction, body, and conclusion
        2. Synthesize different expert perspectives
        3. Be well-structured and engaging
        4. Include relevant citations from the discussion
        5. Be written in a professional tone`
      },
      {
        role: "user",
        content: `Topic: ${topic}
Discussion history: ${JSON.stringify(discussionHistory, null, 2)}
Mind map structure: ${JSON.stringify(mindMap, null, 2)}`
      }
    ])

    return response
  }
}

