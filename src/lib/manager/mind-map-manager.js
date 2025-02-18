import { AzureChatOpenAI, AzureOpenAIEmbeddings } from "@langchain/openai"

export class MindMapNode {
  constructor(id, title, level = 0) {
    this.id = id
    this.title = title
    this.level = level
    this.children = []
    this.information = [] // Each item: { content, question }
    this.parent = null
  }
}

export class MindMapManager {
  constructor() {
    this.model = new AzureChatOpenAI({
      azureOpenAIApiKey: process.env.AZURE_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
      azureOpenAIApiInstanceName: process.env.AZURE_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_INSTANCE_NAME
      azureOpenAIApiDeploymentName: 'gpt-4o', 
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
    })
    this.embeddings = new AzureOpenAIEmbeddings()
    this.root = null
    this.K = 10 // Maximum information pieces per concept
  }

  async calculateSimilarity(text1, text2) {
    const [embedding1, embedding2] = await Promise.all([
      this.embeddings.embedQuery(text1),
      this.embeddings.embedQuery(text2),
    ])

    // Calculate cosine similarity
    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0)
    const norm1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0))
    const norm2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0))

    return dotProduct / (norm1 * norm2)
  }

  async findCandidatePlacements(question, node = this.root, candidates = []) {
    if (!node) return candidates

    // Calculate similarity between question and current node
    const similarity = await this.calculateSimilarity(question, node.title)
    candidates.push({ node, similarity })

    // Recursively check children
    for (const child of node.children) {
      await this.findCandidatePlacements(question, child, candidates)
    }

    return candidates
  }

  async choosePlacement(question, candidates) {
    // Format candidates for LLM
    const candidatesList = candidates
      .map((c, i) => `${i}. ${c.node.title} (similarity: ${c.similarity.toFixed(3)})`)
      .join("\n")

    const response = await this.model.invoke([
      {
        role: "system",
        content: `Choose the best placement for the information based on the question and candidates.
        Output format: "Best placement: [index]" or "No reasonable choice"`,
      },
      {
        role: "user",
        content: `Question: ${question}\nCandidates:\n${candidatesList}`,
      },
    ])

    const match = response.content.match(/Best placement: (\d+)/)
    return match ? Number.parseInt(match[1]) : null
  }

  async insertInformation(info, question, currentNode = this.root) {
    const response = await this.model.invoke([
      {
        role: "system",
        content: `Decide how to insert the information into the knowledge base.
        Output must be one of:
        - insert
        - step: [child node name]
        - create: [new child node name]`,
      },
      {
        role: "user",
        content: `Question: ${question}\nInformation: ${info}\nCurrent node: ${currentNode.title}\nChildren: ${currentNode.children.map((c) => c.title).join(", ")}`,
      },
    ])

    const decision = response.content.trim()

    if (decision === "insert") {
      currentNode.information.push({ content: info, question })
      if (currentNode.information.length > this.K) {
        await this.reorganize(currentNode)
      }
      return currentNode
    } else if (decision.startsWith("step: ")) {
      const childName = decision.substring(6)
      const childNode = currentNode.children.find((c) => c.title === childName)
      if (childNode) {
        return this.insertInformation(info, question, childNode)
      }
    } else if (decision.startsWith("create: ")) {
      const newNodeTitle = decision.substring(8)
      const newNode = new MindMapNode(
        `${currentNode.id}-${currentNode.children.length}`,
        newNodeTitle,
        currentNode.level + 1,
      )
      newNode.parent = currentNode
      currentNode.children.push(newNode)
      newNode.information.push({ content: info, question })
      return newNode
    }
  }

  async reorganize(node) {
    // Generate subtopics based on the information
    const response = await this.model.invoke([
      {
        role: "system",
        content: "Generate a list of subtopics that organize the given information pieces.",
      },
      {
        role: "user",
        content: `Information:\n${node.information.map((i) => i.content).join("\n")}`,
      },
    ])

    const subtopics = response.content.split("\n").filter(Boolean)

    // Create new nodes for subtopics
    const oldInformation = [...node.information]
    node.information = []
    node.children = subtopics.map((title, i) => {
      const newNode = new MindMapNode(`${node.id}-${i}`, title, node.level + 1)
      newNode.parent = node
      return newNode
    })

    // Redistribute information to new subtopics
    for (const info of oldInformation) {
      await this.insertInformation(info.content, info.question, node)
    }

    // Clean up
    await this.cleanUp(node)
  }

  async cleanUp(node = this.root) {
    if (!node) return

    // Recursively clean up children
    for (const child of [...node.children]) {
      await this.cleanUp(child)
    }

    // Remove nodes with no information and no children
    node.children = node.children.filter((child) => child.information.length > 0 || child.children.length > 0)

    // Collapse nodes with only one child
    if (node.children.length === 1 && node.information.length === 0) {
      const onlyChild = node.children[0]
      node.title = `${node.title} - ${onlyChild.title}`
      node.information = onlyChild.information
      node.children = onlyChild.children
      node.children.forEach((child) => (child.parent = node))
    }
  }

  // Helper method to convert mind map to a format suitable for UI rendering
  toUIFormat() {
    const convertNode = (node) => {
      return {
        id: node.id,
        title: node.title,
        level: node.level,
        information: node.information,
        children: node.children.map(convertNode),
      }
    }

    return this.root ? convertNode(this.root) : null
  }
}

