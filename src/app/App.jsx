import { useState } from "react"
import { User, Bot, BotIcon as Bot2 } from "lucide-react"
import { MindMap } from "./mind-map"
import { DiscourseManager } from "../lib/manager/discourse_manager"
import { Box, Button, Container, IconButton, InputBase, Paper, Stack, Typography, Avatar } from "@mui/material"
import {
  Add as AddIcon,
  Chat as ChatIcon,
  Notifications as NotificationsIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material"

export default function App() {
  const [topic, setTopic] = useState("")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [discourseManager, setDiscourseManager] = useState(null)
  const [mindMapData, setMindMapData] = useState(null)
  const [activeNode, setActiveNode] = useState(null)
  const [initialized, setInitialized] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!initialized) {
      if (!topic.trim()) {
        alert("Please enter a topic to start")
        return
      }

      setLoading(true)
      try {
        const manager = new DiscourseManager(topic)
        await manager.initialize()
        setDiscourseManager(manager)

        const mindMapStructure = await manager.mindMap.toUIFormat()
        setMindMapData(mindMapStructure)
        setInitialized(true)

        const initialMessages = [
          {
            role: "system",
            content: `Starting collaborative discourse on: ${topic}`,
            timestamp: new Date().toISOString(),
          },
          {
            role: "system",
            content: `Our panel of experts for this discussion:\n${manager.experts.map((e) => `${e.role}: ${e.description}`).join("\n")}`,
            timestamp: new Date().toISOString(),
          },
        ]
        setMessages(initialMessages)
      } catch (error) {
        console.error("Error initializing discourse:", error)
        alert(`Failed to start discourse. Please try again. ${error}`)
      } finally {
        setLoading(false)
      }
      return
    }

    if (!input.trim() || loading) return

    setLoading(true)
    try {
      const userMessage = {
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInput("")

      await discourseManager.handleUserInput(input)
      const utterance = await discourseManager.generateNextUtterance()
      setMessages((prev) => [...prev, utterance])

      const updatedMindMap = await discourseManager.mindMap.toUIFormat()
      setMindMapData(updatedMindMap)
    } catch (error) {
      console.error("Error in discourse:", error)
      alert("Failed to process message. Please try again.")
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const getAvatarIcon = (role) => {
    if (role === "user") return <User />
    if (role === "Moderator") return <Bot2 />
    return <Bot />
  }

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* Left Sidebar */}
      <Paper
        elevation={0}
        sx={{
          width: 280,
          borderRight: 1,
          borderColor: "divider",
          overflowY: "auto",
        }}
      >
        <Stack p={2} spacing={2}>
          <Button startIcon={<AddIcon />} variant="text" sx={{ justifyContent: "flex-start" }}>
            New Conversation
          </Button>

          <Button startIcon={<ChatIcon fontSize="small" />} variant="text" sx={{ justifyContent: "flex-start" }}>
            My Conversations
          </Button>

          <Button startIcon={<NotificationsIcon />} variant="text" sx={{ justifyContent: "flex-start" }}>
            Notifications
          </Button>

          <Typography variant="subtitle2" color="text.secondary">
            Mind Map
          </Typography>
          <Box sx={{ minHeight: 200 }}>
            {mindMapData && <MindMap data={mindMapData} activeNode={activeNode} onNodeClick={setActiveNode} />}
          </Box>
        </Stack>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: 3,
            py: 2,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Human-Steerable Collaborative Conversation</Typography>

            <Avatar sx={{ bgcolor: "grey.800" }}>Y</Avatar>
          </Stack>
        </Paper>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
          <Container maxWidth="md">
            <Stack spacing={3}>
              {messages.map((message, i) => (
                <Stack key={i} direction="row" spacing={2}>
                  <Avatar sx={{ bgcolor: "grey.100" }}>{getAvatarIcon(message.role)}</Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Typography variant="subtitle2">{message.role === "user" ? "You" : message.role}</Typography>
                      <Button
                        size="small"
                        sx={{
                          opacity: 0,
                          "&:hover": { opacity: 1 },
                          minWidth: "auto",
                          px: 1,
                        }}
                      >
                        Eval
                      </Button>
                    </Stack>

                    <Typography variant="body2" whiteSpace="pre-wrap">
                      {message.content}
                    </Typography>

                    {message.citations && (
                      <Typography variant="caption" color="text.secondary" mt={1}>
                        Citations: {message.citations.join(", ")}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Container>
        </Box>

        {/* Input */}
        <Paper
          elevation={0}
          sx={{
            borderTop: 1,
            borderColor: "divider",
            p: 2,
          }}
        >
          <Container maxWidth="md">
            <form onSubmit={handleSubmit}>
              <Stack direction="row" spacing={1}>
                <Paper
                  variant="outlined"
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    px: 2,
                    borderRadius: "full",
                  }}
                >
                  <InputBase
                    fullWidth
                    value={initialized ? input : topic}
                    onChange={(e) => (initialized ? setInput(e.target.value) : setTopic(e.target.value))}
                    placeholder={initialized ? "Join their conversation..." : "Enter a topic to start..."}
                    disabled={loading}
                  />
                </Paper>

                {initialized && (
                  <Button
                    startIcon={<AutoAwesomeIcon />}
                    onClick={() => {
                      /* Handle generate */
                    }}
                  >
                    Generate
                  </Button>
                )}

                <IconButton type="submit" disabled={loading} sx={{ bgcolor: "grey.100" }}>
                  <KeyboardArrowUpIcon />
                </IconButton>
              </Stack>
            </form>
          </Container>
        </Paper>
      </Box>
    </Box>
  )
}

