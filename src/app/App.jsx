import { useState, useEffect } from "react"
import { ThemeProvider, createTheme, CircularProgress, Box } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ChatInterface from './ChatInterface';
import { migrateExistingUsers } from './utils/migrateExistingUsers';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function AuthPages() {
  const [isLogin, setIsLogin] = useState(true);

  return isLogin ? (
    <Login onSwitchToSignUp={() => setIsLogin(false)} />
  ) : (
    <SignUp onSwitchToLogin={() => setIsLogin(true)} />
  );
}

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <AuthPages />;
  }

  return <ChatInterface />;
}

function App() {
  useEffect(() => {
    // Run migration when app starts
    migrateExistingUsers();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<ProtectedApp />} />
            <Route path="/auth/*" element={<AuthPages />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
