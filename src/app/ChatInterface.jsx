import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Stack,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  ListItemAvatar,
  IconButton,
  Badge,
  Checkbox,
  DialogActions,
  Snackbar,
  Chip
} from "@mui/material";
import {
  Send as SendIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Map as MapIcon,
  AccountCircle as AccountCircleIcon,
  Close as CloseIcon,
  Article as ArticleIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import { MindMap } from "./mind-map";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  onSnapshot, 
  orderBy, 
  updateDoc, 
  doc 
} from "firebase/firestore";
import { db, usersCollection, articlesCollection, notificationsCollection } from "../config/firebase";

const drawerWidth = 280;

const sidebarButtons = [
  { id: 'profile', icon: null, text: "Profile", divider: true },
  { 
    id: 'notifications', 
    icon: (
      <Badge badgeContent={0} color="error">
        <NotificationsIcon />
      </Badge>
    ), 
    text: "Notifications",
    onClick: null 
  },
  { id: 'mindmap', icon: <MapIcon />, text: "Mind Map" },
];

export default function ChatInterface() {
  const { user, logout } = useAuth();
  const [topic, setTopic] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mindMapData, setMindMapData] = useState(null);
  const [activeNode, setActiveNode] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [articleTitle, setArticleTitle] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [validatedEmails, setValidatedEmails] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const messagesEndRef = useRef(null);

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleProfileClose();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Update notification as read
      const notificationRef = doc(db, "notifications", notification.id);
      await updateDoc(notificationRef, { read: true });

      if (notification.type === 'article_share') {
        // Get the article data
        const articleRef = doc(db, "articles", notification.articleId);
        const articleSnap = await getDoc(articleRef);

        if (articleSnap.exists()) {
          const articleData = articleSnap.data();
          setMessages(articleData.content || []);
          setTopic(articleData.title || "Shared Article");
          setInitialized(true);
          setNotificationOpen(false);
        } else {
          setSnackbarMessage("Article not found or has been deleted");
          setSnackbarOpen(true);
        }
      }
    } catch (error) {
      console.error("Error handling notification:", error);
      setSnackbarMessage("Error loading article content");
      setSnackbarOpen(true);
    }
  };

  const handleNotificationClose = () => {
    setNotificationOpen(false);
    setSelectedNotification(null);
  };

  const handleNotificationSelect = (notification) => {
    setSelectedNotification(notification);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchUsers = async () => {
    const q = query(usersCollection, where("email", "!=", user?.email));
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setAvailableUsers(users);
  };

  useEffect(() => {
    if (user?.email) {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      notificationsCollection,
      where("recipientEmail", "==", user.email),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      }));
      
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user]);

  sidebarButtons[1].icon = (
    <Badge badgeContent={unreadCount} color="error">
      <NotificationsIcon />
    </Badge>
  );
  sidebarButtons[1].onClick = () => setNotificationOpen(true);

  const handleShareDialogOpen = () => {
    setShareDialogOpen(true);
    setArticleTitle(`Discussion from ${new Date().toLocaleDateString()}`);
    setPreviewMode(false);
    setRecipientEmail("");
    setEmailError("");
    setValidatedEmails([]);
  };

  const handleShareDialogClose = () => {
    setShareDialogOpen(false);
    setPreviewMode(false);
    setRecipientEmail("");
    setEmailError("");
    setValidatedEmails([]);
    setArticleTitle("");
  };

  const validateEmail = async (email) => {
    if (!email) {
      setEmailError("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Invalid email format");
      return false;
    }

    setIsCheckingEmail(true);
    try {
      const q = query(usersCollection, where("email", "==", email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setEmailError("Email is not registered");
        return false;
      }

      if (validatedEmails.includes(email)) {
        setEmailError("Email already added");
        return false;
      }

      setEmailError("");
      return true;
    } catch (error) {
      console.error("Error checking email:", error);
      setEmailError("Error validating email");
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleAddEmail = async () => {
    const isValid = await validateEmail(recipientEmail);
    if (isValid) {
      setValidatedEmails([...validatedEmails, recipientEmail]);
      setRecipientEmail("");
    }
  };

  const handleRemoveEmail = (email) => {
    setValidatedEmails(validatedEmails.filter(e => e !== email));
  };

  const handleShareArticle = async () => {
    if (validatedEmails.length === 0) {
      setEmailError("Add at least one recipient");
      return;
    }

    if (!articleTitle.trim()) {
      setEmailError("Article title is required");
      return;
    }

    if (!messages || messages.length === 0) {
      setEmailError("No content to share");
      return;
    }

    try {
      const articleContent = messages.map(msg => ({
        role: msg.role || "user",
        content: msg.content || "",
        timestamp: msg.timestamp || new Date().toISOString(),
        expert: msg.expert || null
      }));

      const articleData = {
        title: articleTitle.trim(),
        content: articleContent,
        author: user?.email || "anonymous",
        createdAt: new Date().toISOString(),
        sharedWith: validatedEmails,
        status: "shared"
      };

      const articleRef = await addDoc(articlesCollection, articleData);

      const notificationPromises = validatedEmails.map(email => {
        return addDoc(notificationsCollection, {
          recipientEmail: email,
          type: 'article_share',
          title: articleTitle,
          sender: user?.email || "anonymous",
          articleId: articleRef.id,
          message: `${user?.email || "Someone"} shared an article with you: ${articleTitle}`,
          timestamp: new Date().toISOString(),
          read: false
        });
      });

      await Promise.all(notificationPromises);
      handleShareDialogClose();
      
      setSnackbarMessage("Article shared successfully!");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error sharing article:", error);
      setSnackbarMessage("Error sharing article. Please try again.");
      setSnackbarOpen(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const handleSend = async () => {
    handleSubmit({ preventDefault: () => {} });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!initialized) {
      if (!topic.trim()) {
        alert("Please enter a topic to start");
        return;
      }

      setLoading(true);
      try {
        setInitialized(true);
        const initialMessages = [
          {
            role: "system",
            content: `Starting collaborative discourse on: ${topic}`,
            timestamp: new Date().toISOString(),
          },
          {
            role: "system",
            content: "Our panel of experts for this discussion:\nExpert Peneliti: Specialist in research methodology\nPraktisi Industri: Industry implementation expert\nAkademisi: Academic perspective provider",
            timestamp: new Date().toISOString(),
          },
        ];
        setMessages(initialMessages);
        
        setMindMapData({
          nodes: [{ id: "root", label: topic }],
          edges: []
        });
      } catch (error) {
        console.error("Error initializing discourse:", error);
        alert(`Failed to start discourse. Please try again. ${error}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!input.trim() || loading) return;

    setLoading(true);
    try {
      const userMessage = {
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      const dummyResponse = generateDummyResponse(input);
      setMessages((prev) => [...prev, dummyResponse]);

      const newNode = { id: Date.now().toString(), label: input };
      setMindMapData((prev) => ({
        nodes: [...(prev?.nodes || []), newNode],
        edges: [...(prev?.edges || []), { from: "root", to: newNode.id }]
      }));
    } catch (error) {
      console.error("Error in discourse:", error);
      alert("Failed to process message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateDummyResponse = (userInput) => {
    const experts = [
      { role: "Expert Peneliti", name: "Dr. Smith" },
      { role: "Praktisi Industri", name: "Eng. Johnson" },
      { role: "Akademisi", name: "Prof. Williams" }
    ];
    
    const randomExpert = experts[Math.floor(Math.random() * experts.length)];
    const responses = [
      `Berdasarkan analisis saya sebagai ${randomExpert.role}, ${userInput} adalah hal yang menarik untuk didiskusikan. Mari kita eksplorasi lebih dalam aspek-aspek teknisnya.`,
      `Sebagai ${randomExpert.role}, saya melihat beberapa poin penting dalam pertanyaan Anda tentang ${userInput}. Pertama, kita perlu mempertimbangkan konteks implementasinya.`,
      `${randomExpert.name} di sini. Topik ${userInput} sangat relevan dengan perkembangan terkini. Beberapa aspek yang perlu kita perhatikan adalah metodologi dan penerapannya.`
    ];
    
    return {
      role: "assistant",
      content: responses[Math.floor(Math.random() * responses.length)],
      timestamp: new Date().toISOString(),
      expert: randomExpert
    };
  };

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#f5f5f5' }}>
      <List>
        {sidebarButtons.map((item) => (
          <React.Fragment key={item.id}>
            <ListItem
              button
              onClick={item.id === 'profile' ? handleProfileClick : item.onClick}
              sx={{
                py: 1.5,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ListItemIcon>
                {item.id === 'profile' ? (
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: 'primary.main',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                  >
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                secondary={item.id === 'profile' ? user?.email : null}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
                secondaryTypographyProps={{
                  fontSize: '0.75rem',
                  noWrap: true,
                }}
              />
            </ListItem>
            {item.divider && <Divider sx={{ my: 1 }} />}
          </React.Fragment>
        ))}
      </List>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            mt: 1,
            minWidth: 200,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1,
            },
          },
        }}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Logout"
            primaryTypographyProps={{
              fontSize: '0.875rem',
            }}
          />
        </MenuItem>
      </Menu>
      <Divider />
      {initialized && mindMapData && (
        <Box sx={{ p: 2 }}>
          <MindMap
            data={mindMapData}
            activeNode={activeNode}
            onNodeClick={setActiveNode}
          />
        </Box>
      )}
    </Box>
  );

  const NotificationDialog = () => (
    <Dialog
      open={notificationOpen}
      onClose={handleNotificationClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 1
      }}>
        {selectedNotification?.article ? 'Article' : 'Notifications'}
        <IconButton onClick={handleNotificationClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {selectedNotification?.article ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              {selectedNotification.article.title}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Shared by: {selectedNotification.article.author}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              {selectedNotification.article.content.map((msg, index) => (
                <Paper key={index} elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {msg.role === 'user' ? selectedNotification.article.author : msg.expert?.name}
                  </Typography>
                  <Typography variant="body1">
                    {msg.content}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {new Date(msg.timestamp).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                button
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: notification.read ? 'inherit' : 'action.hover',
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: notification.read ? 'grey.400' : 'primary.main' }}>
                    {notification.sender?.[0]?.toUpperCase() || 'N'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {notification.sender}
                      </Typography>
                      {' — '}
                      {notification.message}
                    </>
                  }
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  {new Date(notification.timestamp).toLocaleString()}
                </Typography>
              </ListItem>
            ))}
            {notifications.length === 0 && (
              <ListItem sx={{ justifyContent: 'center' }}>
                <Typography color="text.secondary">
                  No notifications
                </Typography>
              </ListItem>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );

  const ShareDialog = () => (
    <Dialog
      open={shareDialogOpen}
      onClose={handleShareDialogClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 1
      }}>
        {previewMode ? 'Article Preview' : 'Share Conversation as Article'}
        <Box>
          {previewMode && (
            <Button
              onClick={() => setPreviewMode(false)}
              sx={{ mr: 1 }}
            >
              Back to Edit
            </Button>
          )}
          <IconButton onClick={handleShareDialogClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: previewMode ? 3 : 2 }}>
        {previewMode ? (
          <Box>
            <Typography variant="h5" gutterBottom>
              {articleTitle}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              By: {user.email}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              {messages.map((msg, index) => (
                <Paper key={index} elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {msg.role === 'user' ? 'You' : msg.expert?.name}
                  </Typography>
                  <Typography variant="body1">
                    {msg.content}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {new Date(msg.timestamp).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        ) : (
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Article Title"
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value)}
            />
            <Box>
              <TextField
                fullWidth
                label="Recipient Email"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  setEmailError("");
                }}
                error={!!emailError}
                helperText={emailError}
                InputProps={{
                  endAdornment: (
                    <Button
                      onClick={handleAddEmail}
                      disabled={isCheckingEmail || !recipientEmail}
                      sx={{ ml: 1 }}
                    >
                      Add
                    </Button>
                  ),
                }}
              />
            </Box>
            {validatedEmails.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Recipients:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {validatedEmails.map((email) => (
                    <Chip
                      key={email}
                      label={email}
                      onDelete={() => handleRemoveEmail(email)}
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleShareDialogClose}>Cancel</Button>
        {previewMode ? (
          <Button
            variant="contained"
            onClick={handleShareArticle}
            disabled={validatedEmails.length === 0 || !articleTitle.trim()}
            startIcon={<ShareIcon />}
          >
            Share Article
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => setPreviewMode(true)}
            disabled={!articleTitle.trim()}
            startIcon={<ArticleIcon />}
          >
            Preview Article
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  return (
    <Layout>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Box
          component="nav"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
          }}
        >
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': { width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {!initialized ? (
            <Box sx={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom>
                Start a Roundtable Conversation
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  bgcolor: '#f5f5f5',
                  borderRadius: 2,
                  mt: 3
                }}
              >
                <form onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    placeholder="Enter the topic (English only)"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={loading}
                    variant="outlined"
                    sx={{
                      bgcolor: 'white',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={loading}
                    sx={{
                      mt: 2,
                      borderRadius: 2,
                      textTransform: 'none',
                    }}
                  >
                    Begin
                  </Button>
                </form>
              </Paper>
            </Box>
          ) : (
            <Stack spacing={2} sx={{ flexGrow: 1, position: 'relative' }}>
              <Box sx={{ flexGrow: 1, overflow: 'auto', pr: 2 }}>
                {messages.map((message, index) => (
                  <Box
                    key={index}
                    sx={{
                      mb: 2,
                      p: 2,
                      bgcolor: 'white',
                      borderRadius: 2,
                    }}
                  >
                    {message.expert && (
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        {message.expert.name} ({message.expert.role})
                      </Typography>
                    )}
                    <Typography>{message.content}</Typography>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Box>
              <Box sx={{ 
                position: 'sticky', 
                bottom: 0, 
                bgcolor: 'background.paper',
                pt: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}>
                {messages.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<ArticleIcon />}
                    onClick={handleShareDialogOpen}
                    sx={{ alignSelf: 'flex-end' }}
                  >
                    Share as Article
                  </Button>
                )}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    variant="outlined"
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    <SendIcon />
                  </Button>
                </Box>
              </Box>
            </Stack>
          )}
        </Box>
        <NotificationDialog />
        <ShareDialog />
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
        />
      </Box>
    </Layout>
  );
}