import { chatCompletion, generateEmbedding } from "../models"

export class ModeratorAgent {
  constructor() {
    this.role = "Moderator"
    this.alpha = 0.7 // Hyperparameter for reranking
  }

  async calculateSimilarity(embedding1, embedding2) {
    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0)
    const norm1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val   * val, 0))
    const norm2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (norm1 * norm2)
  }

  async rerankUnusedInformation(unusedInfo, topic) {
    const topicEmbedding = await generateEmbedding(topic)

    const rankedInfo = await Promise.all(
      unusedInfo.map(async (info) => {
        const infoEmbedding = await generateEmbedding(info.content)
        const questionEmbedding = await generateEmbedding(info.question)

        // Calculate similarities
        const topicSimilarity = await this.calculateSimilarity(infoEmbedding, topicEmbedding)
        const questionSimilarity = await this.calculateSimilarity(infoEmbedding, questionEmbedding)

        // Calculate reranking score using the formula:
        // score = cos(i,t)^α * (1-cos(i,q))^(1-α)
        const score = Math.pow(topicSimilarity, this.alpha) * Math.pow(1 - questionSimilarity, 1 - this.alpha)

        return {
          ...info,
          score,
        }
      }),
    )

    // Sort by score in descending order
    return rankedInfo.sort((a, b) => b.score - a.score)
  }

  async generateKnowledgeBaseSummary(topic, mindMap) {
    const response = await chatCompletion([
      {
        role: "system",
        content: "Generate a brief summary of the discussion based on the hierarchical structure.",
      },
      {
        role: "user",
        content: `Topic: ${topic}
Tree structure:
${JSON.stringify(mindMap, null, 2)}`,
      },
    ])

    return response
  }

  async generateGroundedQuestion(topic, summary, information, lastUtterance) {
    // Format information with citations
    const formattedInfo = information.map((info, i) => `[${i + 1}] ${info.content}`).join("\n")

    const response = await chatCompletion([
      {
        role: "system",
        content: `Generate a discussion question that:
1. Brings new perspectives
2. Avoids repetition
3. Is grounded in available information
4. Flows naturally from the last utterance
Use [n] citations to ground your question.`,
      },
      {
        role: "user",
        content: `Topic: ${topic}
Discussion history:
${summary}

Available information:
${formattedInfo}

Last utterance:
${lastUtterance}`,
      },
    ])

    return response
  }

  async generateQuestion(topic, discourseHistory, rankedInfo) {
    // Get summary of current knowledge base
    const summary = await this.generateKnowledgeBaseSummary(topic, discourseHistory)

    // Get last utterance
    const lastUtterance = discourseHistory[discourseHistory.length - 1]?.content || ""

    // Generate grounded question
    const question = await this.generateGroundedQuestion(
      topic,
      summary,
      rankedInfo.slice(0, 5), // Use top 5 ranked pieces of information
      lastUtterance,
    )

    return {
      role: this.role,
      content: question,
      intent: "ORIGINAL_QUESTION",
      timestamp: new Date().toISOString(),
    }
  }

  async updateParticipantList(topic, discourseHistory) {
    const summary = await this.generateKnowledgeBaseSummary(topic, discourseHistory)

    const response = await chatCompletion([
      {
        role: "system",
        content:
          "Based on the discussion summary, suggest updates to the expert panel to bring relevant expertise for upcoming discussion points.",
      },
      {
        role: "user",
        content: `Topic: ${topic}\nDiscussion summary: ${summary}`,
      },
    ])

    return JSON.parse(response)
  }
}

