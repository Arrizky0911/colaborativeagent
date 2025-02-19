import { Box, CircularProgress, Typography, Fade } from '@mui/material';

// Loading untuk diskusi
export const DiscussionLoading = () => (
  <Fade in timeout={800}>
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      p: 4 
    }}>
      <CircularProgress size={40} thickness={4} />
      <Typography variant="body1" color="text.secondary">
        Memuat diskusi...
      </Typography>
    </Box>
  </Fade>
);

// Loading untuk respons expert
export const ExpertResponseLoading = () => (
  <Fade in timeout={600}>
    <Box sx={{ 
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 2,
      bgcolor: 'rgba(156, 39, 176, 0.05)',
      borderRadius: 1
    }}>
      <CircularProgress size={24} thickness={4} sx={{ color: 'secondary.main' }} />
      <Typography variant="body2" color="text.secondary">
        Expert sedang menyusun respons...
      </Typography>
    </Box>
  </Fade>
);

// Loading untuk mind map
export const MindMapLoading = () => (
  <Fade in timeout={700}>
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      p: 3,
      height: '100%',
      justifyContent: 'center'
    }}>
      <CircularProgress size={32} thickness={4} sx={{ color: 'primary.main' }} />
      <Typography variant="body2" color="text.secondary">
        Menyusun mind map...
      </Typography>
    </Box>
  </Fade>
);

// Loading untuk background generation
export const BackgroundLoading = () => (
  <Fade in timeout={500}>
    <Box sx={{ 
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 2,
      bgcolor: 'rgba(33, 150, 243, 0.05)',
      borderRadius: 1
    }}>
      <CircularProgress size={20} thickness={4} sx={{ color: 'info.main' }} />
      <Typography variant="body2" color="text.secondary">
        Mengumpulkan informasi latar belakang...
      </Typography>
    </Box>
  </Fade>
); 