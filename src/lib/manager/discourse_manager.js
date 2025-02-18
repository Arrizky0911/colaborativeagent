import { ExpertAgent, IntentType } from "../agents/expert"
import { getAgents } from "../agents/genenerate_expert"
import { ModeratorAgent } from "../agents/moderator"
import { chatCompletion } from "../models"
import { MindMapManager, MindMapNode } from "./mind-map-manager"

export class DiscourseManager {
  constructor(topic) {
    this.topic = topic
    this.moderator = new ModeratorAgent()
    this.discourseHistory = []
    this.unusedInformation = []
    this.currentExpertIndex = 0
    this.consecutiveAnswerTurns = 0
    this.L = 2
    this.mindMap = new MindMapManager()
    this.lastModeratorTurn = 0
  }

  async initialize() {
    await this.initializeMindMap(this.topic)
    await this.generateExperts()
  }

  async initializeMindMap(topic) {
    this.mindMap.root = new MindMapNode("root", topic);

    const response = await chatCompletion([
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
    ]);

    const textResponse = Array.isArray(response) ? response[0] : response;
    const sections = textResponse.split("\n").filter(Boolean);

    console.log(sections)

    // for (const section of sections) {
    //     await this.mindMap.insertInformation("", section, this.mindMap.root);
    // }
  }


  async generateExperts() {
    try {
        const response = await getAgents(this.topic);

        console.log(response)

        this.experts = response.map((e) => new ExpertAgent(e.role, e.description))
        

        console.log(experts)
        this.experts = experts.map(e => new ExpertAgent(e.role, e.description));
    } catch (error) {
      console.error("Error generating experts:", error)
      // Fallback to default experts if generation fails
      this.experts = [
        new ExpertAgent("AI Expert", "Specialist in artificial intelligence and machine learning"),
        new ExpertAgent("Domain Expert", "Specialist in the topic area"),
        new ExpertAgent("Critic", "Provides critical analysis and alternative viewpoints"),
      ]
    }
  }

  async handleUserInput(input) {
    this.discourseHistory.push({
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    })

    // Update experts based on user input
    const updatedExperts = await this.moderator.updateParticipantList(this.topic, this.discourseHistory)
    this.experts = updatedExperts.map((e) => new ExpertAgent(e.role, e.description))

    // Reset consecutive answer counter
    this.consecutiveAnswerTurns = 0
  }

  async generateNextUtterance() {
    // Check if moderator should intervene
    if (this.consecutiveAnswerTurns >= this.L) {
      const rankedInfo = await this.moderator.rerankUnusedInformation(this.unusedInformation, this.topic)
      const moderatorUtterance = await this.moderator.generateQuestion(this.topic, this.discourseHistory, rankedInfo)
      this.discourseHistory.push(moderatorUtterance)
      this.consecutiveAnswerTurns = 0
      return moderatorUtterance
    }

    // Get next expert in sequence
    const expert = this.experts[this.currentExpertIndex]
    this.currentExpertIndex = (this.currentExpertIndex + 1) % this.experts.length

    // Generate expert utterance
    const utterance = await expert.generateUtterance(
      this.topic,
      this.discourseHistory.map((u) => u.content),
    )

    // Update consecutive answer counter
    if (utterance.intent === IntentType.POTENTIAL_ANSWER || utterance.intent === IntentType.FURTHER_DETAILS) {
      this.consecutiveAnswerTurns++
    } else {
      this.consecutiveAnswerTurns = 0
    }

    await this.handleUtterance(utterance) // Handle the generated utterance

    return utterance
  }

  async handleUtterance(utterance) {
    this.discourseHistory.push(utterance)

    // If this is an answer with retrieved information
    if (utterance.intent === IntentType.POTENTIAL_ANSWER || utterance.intent === IntentType.FURTHER_DETAILS) {
      // Store unused information
      if (utterance.retrievedInfo) {
        const usedCitations = (utterance.content.match(/\[\d+\]/g) || []).map((c) => Number.parseInt(c.slice(1, -1)))

        const unused = utterance.retrievedInfo.filter((_, i) => !usedCitations.includes(i + 1))

        this.unusedInformation.push(
          ...unused.map((info) => ({
            content: info,
            question: this.findRelatedQuestion(utterance),
          })),
        )
      }

      // Update mind map
      const questionUtterance = this.findRelatedQuestion(utterance)
      if (questionUtterance) {
        await this.mindMap.insertInformation(utterance.content, questionUtterance.content, this.mindMap.root)
      }
    }

    // Check if moderator should intervene
    if (this.shouldModeratorIntervene()) {
      const rankedInfo = await this.moderator.rerankUnusedInformation(this.unusedInformation, this.topic)

      const moderatorUtterance = await this.moderator.generateQuestion(this.topic, this.discourseHistory, rankedInfo)

      // Update expert panel based on new direction
      const updatedExperts = await this.moderator.updateParticipantList(this.topic, this.discourseHistory)
      this.experts = updatedExperts.map((e) => new ExpertAgent(e.role, e.description))

      this.discourseHistory.push(moderatorUtterance)
      this.lastModeratorTurn = this.discourseHistory.length
      this.consecutiveAnswerTurns = 0
      this.unusedInformation = [] // Clear unused information after moderator turn

      return moderatorUtterance
    }

    return this.mindMap.toUIFormat()
  }

  findRelatedQuestion(utterance) {
    return this.discourseHistory
      .slice(0, this.discourseHistory.indexOf(utterance))
      .reverse()
      .find((u) => u.intent === IntentType.ORIGINAL_QUESTION || u.intent === IntentType.INFORMATION_REQUEST)
  }

  shouldModeratorIntervene() {
    // Intervene if:
    // 1. Too many consecutive answer turns
    // 2. Enough unused information has accumulated
    // 3. It's been a while since last moderator turn
    return (
      this.consecutiveAnswerTurns >= this.L ||
      this.unusedInformation.length >= 5 ||
      this.discourseHistory.length - this.lastModeratorTurn >= 10
    )
  }
}

