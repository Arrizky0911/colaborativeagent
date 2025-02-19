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
    this.searchTool = {
      search: async (topic, question) => {
        // Batasi panjang topic dan question sebelum digabung
        const truncatedTopic = topic.substring(0, 150);
        const truncatedQuestion = question.substring(0, 150);
        const query = `${truncatedTopic}: ${truncatedQuestion}`;
        
        const results = await searchTavily(query)
        
        return results
          .filter(result => result.score > 0.7)
          .slice(0, 5)
          .map((result, index) => ({
            id: index + 1,
            title: result.title,
            content: result.content.substring(0, 300) + "...",
            url: result.url
          }))
      }
    }
  }

  async generateExperts(topic) {
    const response = await chatCompletion([
      {
        role: "system",
        content: `You are an expert at generating expert panels.
        Generate 3-4 relevant expert roles for the topic: "${topic}".
        Return ONLY a valid JSON array with this exact format:
        [{"role":"Expert Title","description":"Brief description"}]`
      },
      {
        role: "user",
        content: `Topic: ${topic}`
      }
    ]);

    try {
      // Bersihkan response dari karakter yang bisa merusak JSON
      const cleanResponse = response.trim().replace(/[\r\n\t]/g, '');
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error("Error parsing expert response:", error);
      // Fallback experts jika parsing gagal
      return [
        {
          role: "General Expert",
          description: "Expert in the general topic area"
        }
      ];
    }
  }

  async generateResponse(topic, question, role) {
    try {
      const searchResults = await this.searchTool.search(topic, question)
      
      const numberedResults = searchResults.map((result, index) => ({
        ...result,
        id: index + 1
      }))

      const response = await chatCompletion([
        {
          role: "system",
          content: `You are an expert ${role}.
          IMPORTANT INSTRUCTIONS:
          1. Use [n] citations for EVERY statement you make
          2. Each citation should be in format [n] where n is the source number
          3. Make sure to use multiple sources to support your claims
          4. Write in a formal academic style
          5. If information is not directly supported by sources, start with "Based on available information..."
          6. Structure your response in clear paragraphs
          7. EVERY paragraph must have at least one citation
          8. Citations should be clickable numbers in [n] format`
        },
        {
          role: "user",
          content: `Topic: ${topic}
          Question: ${question}
          Available Sources:
          ${numberedResults.map(r => `[${r.id}] ${r.title}\n${r.content}\nURL: ${r.url}`).join('\n\n')}`
        }
      ])

      // Extract citations
      const citations = []
      const citationRegex = /\[(\d+)\]/g
      let match
      
      while ((match = citationRegex.exec(response)) !== null) {
        const citationId = match[1]
        const source = numberedResults.find(r => r.id === parseInt(citationId))
        if (source && !citations.some(c => c.id === citationId)) {
          citations.push({
            id: citationId,
            title: source.title,
            url: source.url
          })
        }
      }

      return {
        content: response,
        citations: citations.sort((a, b) => parseInt(a.id) - parseInt(b.id))
      }
    } catch (error) {
      console.error("Error in generateResponse:", error)
      throw error
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

