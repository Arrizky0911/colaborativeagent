import { ExpertAgent } from "../agents/expert"
import { getAgents } from "../agents/generate_expert"
import { ModeratorAgent } from "../agents/moderator"
import { chatCompletion } from "../models"
import { MindMapManager, MindMapNode } from "./mind-map-manager"

export class DiscourseManager {
  constructor(topic) {
    this.topic = topic
    this.expertAgent = new ExpertAgent()
    this.moderatorAgent = new ModeratorAgent()
    this.mindMap = {
      initialize: () => {
        return {
          id: 'root',
          topic: this.topic,
          children: []
        }
      },
      addNode: (parentId, content) => {
        // Implementasi logika untuk menambah node
      },
      getMindMap: () => {
        return this.mindMapData
      },
      getStructure: () => {
        return {
          nodes: this.mindMapData,
          history: this.discussionHistory
        }
      }
    }
    this.mindMapData = null
    this.experts = []
    this.discussionHistory = []
  }

  async initialize() {
    try {
      // Initialize experts
      this.experts = await this.expertAgent.generateExperts(this.topic)
      
      // Initialize mind map
      this.mindMapData = this.mindMap.initialize()
      
      return true
    } catch (error) {
      console.error("Error initializing DiscourseManager:", error)
      throw error
    }
  }

  async handleUserInput(input) {
    // Add user input to history
    this.discussionHistory.push({
      role: 'user',
      content: input
    })

    // Get background information first
    const backgroundInfo = await chatCompletion([
      {
        role: "system",
        content: "Provide brief background information about this topic and question. Keep it concise and informative."
      },
      {
        role: "user",
        content: `Topic: ${this.topic}\nQuestion: ${input}`
      }
    ])

    // Add background to history
    this.discussionHistory.push({
      role: 'background',
      content: backgroundInfo
    })

    // Get moderator's initial thoughts
    const moderatorThoughts = await this.moderatorAgent.generateIntervention(
      this.topic,
      this.discussionHistory
    )

    // Add moderator response to history
    this.discussionHistory.push({
      role: 'moderator',
      content: moderatorThoughts
    })

    // Get responses from each expert
    const expertResponses = await Promise.all(
      this.experts.map(expert => 
        this.expertAgent.generateResponse(this.topic, input, expert.role)
      )
    )

    // Add expert responses to history
    expertResponses.forEach((response, index) => {
      this.discussionHistory.push({
        role: 'expert',
        expert: this.experts[index],
        content: response.content,
        citations: response.citations
      })

      if (response.content) {
        this.mindMapData.children.push({
          id: `node-${Date.now()}-${index}`,
          topic: response.content.substring(0, 50) + '...',
          children: []
        })
      }
    })

    // Generate new article after adding responses
    const newArticle = await this.generateArticle();

    return {
      background: backgroundInfo,
      moderator: moderatorThoughts,
      experts: expertResponses,
      article: newArticle // Add article to response
    }
  }

  async moderatorIntervention() {
    const moderatorResponse = await this.moderatorAgent.generateIntervention(
      this.topic,
      this.discussionHistory,
      this.mindMap.getStructure()
    )

    this.discussionHistory.push({
      role: 'moderator',
      content: moderatorResponse
    })

    return moderatorResponse
  }

  async generateArticle() {
    try {
      const allCitations = this.discussionHistory
        .filter(msg => msg.role === 'expert' && msg.citations)
        .flatMap(msg => msg.citations)
        .filter((citation, index, self) => 
          index === self.findIndex(c => c.url === citation.url)
        )
        .slice(0, 10)
        .map((citation, index) => ({
          ...citation,
          id: (index + 1).toString()
        }));

      const response = await chatCompletion([
        {
          role: "system",
          content: `Create a concise article as JSON.
          IMPORTANT: Return ONLY valid JSON with this EXACT structure, no markdown:
          {
            "title": "Title",
            "sections": [{"title": "Section", "content": "Content"}],
            "citations": []
          }`
        },
        {
          role: "user", 
          content: `Topic: ${this.topic}
          History: ${JSON.stringify(this.discussionHistory
            .map(msg => ({
              role: msg.role,
              content: msg.content?.substring(0, 300)
            }))
          )}`
        }
      ]);

      // Bersihkan response dengan lebih ketat
      const cleanedResponse = response
        .replace(/```json\s*|\s*```/g, '')
        .replace(/\n\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      try {
        const article = JSON.parse(cleanedResponse);
        article.citations = allCitations;
        
        if (!article.title || !Array.isArray(article.sections)) {
          throw new Error('Invalid article structure');
        }
        
        return article;
      } catch (parseError) {
        console.error("Article parsing error:", parseError);
        console.log("Raw response:", response);
        return this.getFallbackArticle();
      }
    } catch (error) {
      console.error("Error generating article:", error);
      return this.getFallbackArticle();
    }
  }

  getFallbackArticle() {
    return {
      title: this.topic,
      sections: [
        {
          title: "Overview",
          content: "An error occurred while generating the article content."
        }
      ],
      citations: []
    };
  }

  getMindMap() {
    return this.mindMapData
  }

  async generateBackgroundDiscussion() {
    try {
      // Get initial background from moderator
      const moderatorIntro = await this.moderatorAgent.generateIntroduction(this.topic)
      
      this.discussionHistory.push({
        role: 'moderator',
        content: moderatorIntro,
        isBackground: true
      })

      // Generate initial expert responses
      const expertResponses = await Promise.all(
        this.experts.map(expert => 
          this.expertAgent.generateResponse(this.topic, moderatorIntro, expert.role)
        )
      )

      // Add expert responses to history
      expertResponses.forEach((response, index) => {
        this.discussionHistory.push({
          role: 'expert',
          expert: this.experts[index],
          content: response.content,
          citations: response.citations,
          isBackground: true
        })
      })

      // Continue discussion until completion
      let discussionComplete = false
      let iterations = 0
      const MAX_ITERATIONS = 3

      while (!discussionComplete && iterations < MAX_ITERATIONS) {
        // Get moderator's next question/insight
        const moderatorResponse = await this.moderatorAgent.generateNextQuestion(
          this.topic,
          this.discussionHistory
        )

        this.discussionHistory.push({
          role: 'moderator',
          content: moderatorResponse,
          isBackground: true
        })

        // Get expert responses
        const responses = await Promise.all(
          this.experts.map(expert =>
            this.expertAgent.generateResponse(this.topic, moderatorResponse, expert.role)
          )
        )

        responses.forEach((response, index) => {
          this.discussionHistory.push({
            role: 'expert',
            expert: this.experts[index],
            content: response.content,
            citations: response.citations,
            isBackground: true
          })
        })

        // Check if discussion is complete
        discussionComplete = await this.moderatorAgent.checkDiscussionComplete(
          this.discussionHistory
        )
        iterations++
      }

      // Generate mind map from discussion
      this.mindMapData = await this.generateMindMap()

      return {
        history: this.discussionHistory.filter(msg => msg.isBackground),
        mindMap: this.mindMapData
      }
    } catch (error) {
      console.error("Error generating background discussion:", error)
      throw error
    }
  }

  async generateMindMap() {
    try {
      const response = await chatCompletion([
        {
          role: "system",
          content: `Generate a mind map structure as JSON.
          IMPORTANT: Return ONLY valid JSON with this exact structure:
          {
            "id": "root",
            "topic": "Main Topic",
            "children": [
              {
                "id": "child-1",
                "topic": "Subtopic",
                "children": []
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Topic: ${this.topic}
          Discussion points: ${JSON.stringify(this.discussionHistory
            .slice(-5)
            .map(h => ({ 
              role: h.role,
              content: h.content?.substring(0, 200) // Batasi panjang konten
            })))}`
        }
      ]);

      // Bersihkan response
      const cleanedResponse = response.trim()
        .replace(/^```json\s*|\s*```$/g, '')
        .replace(/\n\s*/g, ' ')
        .trim();

      try {
        const mindMap = JSON.parse(cleanedResponse);
        
        // Validasi struktur
        if (!mindMap.id || !mindMap.topic || !Array.isArray(mindMap.children)) {
          throw new Error('Invalid mind map structure');
        }

        // Pastikan semua node memiliki struktur yang valid
        const validateNode = (node) => {
          if (!node.id || !node.topic || !Array.isArray(node.children)) {
            throw new Error('Invalid node structure');
          }
          node.children.forEach(validateNode);
        };
        validateNode(mindMap);

        return mindMap;
      } catch (parseError) {
        console.error("Mind map parsing error:", parseError, "Response:", response);
        return this.getFallbackMindMap();
      }
    } catch (error) {
      console.error("Error generating mind map:", error);
      return this.getFallbackMindMap();
    }
  }

  getFallbackMindMap() {
    return {
      id: "root",
      topic: this.topic,
      children: []
    };
  }
}
