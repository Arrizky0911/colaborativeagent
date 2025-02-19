import { useState } from "react"
import { Card, CardContent, TextField, Button, Box, Typography, CircularProgress, Tabs, Tab, Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Link } from "@mui/material"
import { DiscourseManager } from "../lib/manager/discourse_manager"
import InfoIcon from '@mui/icons-material/Info'
import PersonIcon from '@mui/icons-material/Person'
import GroupsIcon from '@mui/icons-material/Groups'
import SchoolIcon from '@mui/icons-material/School'
import { MindMap } from "../components/MindMap"
import ArticlePreview from '../components/ArticlePreview'

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const MessageCard = ({ message }) => {
  const getMessageStyle = (role) => {
    const baseStyle = {
      marginBottom: 2,
      padding: 2,
      borderRadius: 2,
    }

    switch (role) {
      case 'background':
        return {
          ...baseStyle,
          backgroundColor: '#f5f5f5',
          borderLeft: '4px solid #9e9e9e'
        }
      case 'moderator':
        return {
          ...baseStyle,
          backgroundColor: '#e3f2fd',
          borderLeft: '4px solid #2196f3'
        }
      case 'expert':
        return {
          ...baseStyle,
          backgroundColor: '#f3e5f5',
          borderLeft: '4px solid #9c27b0'
        }
      default:
        return baseStyle
    }
  }

  const getIcon = (role) => {
    switch (role) {
      case 'background':
        return <InfoIcon />
      case 'moderator':
        return <GroupsIcon />
      case 'expert':
        return <SchoolIcon />
      default:
        return <PersonIcon />
    }
  }

  return (
    <Card sx={getMessageStyle(message.role)}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Avatar sx={{ bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main' }}>
            {getIcon(message.role)}
          </Avatar>
          <Typography variant="subtitle1" fontWeight="bold">
            {message.role === 'expert' ? message.expert?.role : message.role.charAt(0).toUpperCase() + message.role.slice(1)}
          </Typography>
        </Box>
        
        {/* Render content with clickable citations */}
        <Typography variant="body1" component="div">
          {message.content.split(/(\[\d+\])/).map((part, index) => {
            const citationMatch = part.match(/\[(\d+)\]/)
            if (citationMatch) {
              const citationId = citationMatch[1]
              const citation = message.citations?.find(c => c.id === citationId)
              if (citation) {
                return (
                  <Link 
                    key={index}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: 'primary.main' }}
                  >
                    {part}
                  </Link>
                )
              }
            }
            return part
          })}
        </Typography>

        {/* References section */}
        {message.citations && message.citations.length > 0 && (
          <Box mt={2} bgcolor="grey.100" p={2} borderRadius={1}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              References:
            </Typography>
            {message.citations.map((citation, index) => (
              <Typography key={index} variant="caption" display="block" color="text.secondary" gutterBottom>
                [{citation.id}] {citation.title} - <Link href={citation.url} target="_blank" rel="noopener noreferrer">{citation.url}</Link>
              </Typography>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default function App() {
  const [topic, setTopic] = useState("")
  const [input, setInput] = useState("")
  const [backgroundMessages, setBackgroundMessages] = useState([])
  const [userMessages, setUserMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [discourseManager, setDiscourseManager] = useState(null)
  const [mindMap, setMindMap] = useState(null)
  const [tabValue, setTabValue] = useState(0)
  const [loadingStates, setLoadingStates] = useState({
    discussion: false,
    expert: false,
    mindMap: false,
    background: false
  });
  const [article, setArticle] = useState(null);
  const [articleOpen, setArticleOpen] = useState(false);

  const initializeDiscourse = async (newTopic) => {
    setLoadingStates(prev => ({
      ...prev,
      discussion: true
    }));
    
    try {
      const manager = new DiscourseManager(newTopic)
      await manager.initialize()
      
      // Generate background discussion
      const { history, mindMap } = await manager.generateBackgroundDiscussion()
      
      const article = await manager.generateArticle();
      setArticle(article);
      
      setDiscourseManager(manager)
      setBackgroundMessages(history)
      setMindMap(mindMap)
      
    } catch (error) {
      console.error("Error initializing discourse:", error)
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        discussion: false
      }));
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!discourseManager || !input.trim()) return

    setLoadingStates(prev => ({...prev, expert: true}));
    
    try {
      // Add user message
      setUserMessages(prev => [...prev, { role: 'user', content: input }]);

      // Get expert responses
      const responses = await discourseManager.handleUserInput(input);
      
      // Add background
      setBackgroundMessages(prev => [...prev, { 
        role: 'background',
        content: responses.background 
      }]);

      // Add moderator thoughts
      setBackgroundMessages(prev => [...prev, {
        role: 'moderator',
        content: responses.moderator
      }]);

      // Add expert responses
      responses.experts.forEach((response, index) => {
        setUserMessages(prev => [...prev, {
          role: 'expert',
          expert: responses.experts[index].expert,
          content: response.content,
          citations: response.citations
        }]);
      });

      // Update mind map
      setMindMap(discourseManager.getMindMap());

      // Update article with new content
      const newArticle = await discourseManager.generateArticle();
      setArticle(newArticle);

    } catch (error) {
      console.error("Error processing input:", error)
    } finally {
      setLoadingStates(prev => ({...prev, expert: false}));
      setInput("")
    }
  }

  const handleModeratorPrompt = async () => {
    if (!discourseManager || loading) return

    setLoading(true)
    try {
      const moderatorResponse = await discourseManager.moderatorIntervention()
      setBackgroundMessages(prev => [...prev, {
        role: 'moderator',
        content: moderatorResponse
      }])
    } catch (error) {
      console.error("Error getting moderator prompt:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar with mind map */}
      <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider' }}>
        <MindMap data={mindMap} />
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Topic input */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            label="Enter topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={!!discourseManager}
          />
          <Button
            onClick={() => initializeDiscourse(topic)}
            disabled={!topic || loading}
          >
            Start Discussion
          </Button>
        </Box>

        {/* Background discussion */}
        <Box sx={{ flex: 1, p: 2, bgcolor: 'grey.50', overflowY: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Background Discussion
          </Typography>
          
          {loadingStates.discussion ? (
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              p: 3 
            }}>
              {[1, 2, 3].map((item) => (
                <Box
                  key={item}
                  sx={{
                    backgroundColor: 'white',
                    p: 2,
                    borderRadius: 1,
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': {
                        opacity: 1,
                      },
                      '50%': {
                        opacity: 0.5,
                      },
                      '100%': {
                        opacity: 1,
                      },
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'grey.200',
                      }}
                    />
                    <Box
                      sx={{
                        width: 120,
                        height: 20,
                        borderRadius: 1,
                        backgroundColor: 'grey.200',
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      height: 60,
                      borderRadius: 1,
                      backgroundColor: 'grey.100',
                    }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            backgroundMessages.map((message, index) => (
              <MessageCard key={index} message={message} />
            ))
          )}
        </Box>

        {/* User conversation */}
        <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Continue Discussion
          </Typography>
          
          {loadingStates.expert ? (
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              p: 3 
            }}>
              {[1, 2].map((item) => (
                <Box
                  key={item}
                  sx={{
                    backgroundColor: 'white',
                    p: 2,
                    borderRadius: 1,
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                      '100%': { opacity: 1 },
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: '#f3e5f5',
                      }}
                    />
                    <Box
                      sx={{
                        width: 150,
                        height: 20,
                        borderRadius: 1,
                        backgroundColor: '#f3e5f5',
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      height: 80,
                      borderRadius: 1,
                      backgroundColor: '#f3e5f5',
                      opacity: 0.7
                    }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            userMessages.map((message, index) => (
              <MessageCard key={index} message={message} />
            ))
          )}
        </Box>

        {/* Input area */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            label="Your message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!discourseManager || loadingStates.expert}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input || loadingStates.expert || !discourseManager}
          >
            Send
          </Button>
          <Button
            onClick={handleModeratorPrompt}
            disabled={loadingStates.expert || !discourseManager}
          >
            Get Moderator Prompt
          </Button>
          <Button
            onClick={() => setArticleOpen(true)}
            disabled={!article}
            sx={{ ml: 1 }}
          >
            Preview Article
          </Button>
        </Box>
      </Box>
      <ArticlePreview 
        open={articleOpen}
        onClose={() => setArticleOpen(false)}
        article={article}
      />
    </Box>
  )
}

