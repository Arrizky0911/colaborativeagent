"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"

export function MindMap({ data, activeNode, onNodeClick }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set())

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const parseOutline = (outline) => {
    const lines = outline.split("\n")
    const nodes = []
    let currentPath = []

    lines.forEach((line) => {
      const level = (line.match(/^#+/) || [""])[0].length
      const title = line.replace(/^#+\s*/, "").trim()

      if (!title) return

      const id = title.toLowerCase().replace(/\s+/g, "-")
      currentPath = currentPath.slice(0, level - 1)
      currentPath[level - 1] = id

      nodes.push({
        id,
        title,
        level: level - 1,
        parentId: level > 1 ? currentPath[level - 2] : null,
      })
    })

    return nodes
  }

  const renderNode = (node) => {
    const children = data.filter((n) => n.parentId === node.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(node.id)

    return (
      <div key={node.id} style={{ marginLeft: `${node.level * 16}px` }}>
        <div
          className={`flex items-center gap-1 py-1 cursor-pointer hover:bg-accent rounded ${
            activeNode === node.id ? "bg-accent" : ""
          }`}
          onClick={() => onNodeClick(node.id)}
        >
          {hasChildren && (
            <ChevronRight
              className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.id)
              }}
            />
          )}
          <span className="text-sm">{node.title}</span>
        </div>
        {hasChildren && isExpanded && children.map((child) => renderNode(child))}
      </div>
    )
  }

  const nodes = parseOutline(data)
  const rootNodes = nodes.filter((node) => node.level === 0)

  return <div className="space-y-2">{rootNodes.map((node) => renderNode(node))}</div>
}

