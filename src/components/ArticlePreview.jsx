import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Button,
  Typography,
  Box,
  Link
} from '@mui/material';

export default function ArticlePreview({ open, onClose, article }) {
  if (!article) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>{article.title}</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Generated from expert discussion
        </Typography>
        
        {article.sections.map((section, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {section.title}
            </Typography>
            <Typography paragraph>
              {section.content}
            </Typography>
          </Box>
        ))}

        {article.citations.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Citations
            </Typography>
            {article.citations.map((citation, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Link href={citation.url} target="_blank" rel="noopener">
                  [{index + 1}] {citation.title}
                </Link>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
} 