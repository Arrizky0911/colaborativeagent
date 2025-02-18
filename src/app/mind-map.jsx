import React from "react";
import { Box, Typography, Paper, IconButton } from "@mui/material";
import { ChevronRight, ExpandMore } from "@mui/icons-material";

export function MindMap({ data, activeNode, onNodeClick }) {
  if (!data?.nodes) return null;

  const renderNode = (node) => {
    const children = data.edges.filter(edge => edge.from === node.id).map(edge => 
      data.nodes.find(n => n.id === edge.to)
    ).filter(Boolean);

    return (
      <Box key={node.id} sx={{ mb: 1 }}>
        <Paper
          elevation={activeNode === node.id ? 3 : 1}
          sx={{
            p: 1,
            cursor: 'pointer',
            transition: 'all 0.2s',
            backgroundColor: activeNode === node.id ? '#e3f2fd' : 'white',
            '&:hover': {
              backgroundColor: '#f5f5f5',
              transform: 'translateX(5px)',
            },
          }}
          onClick={() => onNodeClick?.(node.id)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {children.length > 0 && (
              <IconButton size="small" sx={{ mr: 1 }}>
                {activeNode === node.id ? <ExpandMore /> : <ChevronRight />}
              </IconButton>
            )}
            <Typography
              variant="body2"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {node.label}
            </Typography>
          </Box>
        </Paper>
        {activeNode === node.id && children.length > 0 && (
          <Box sx={{ ml: 3, mt: 1, borderLeft: '1px dashed #ccc' }}>
            {children.map(child => renderNode(child))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 1 }}>
      {data.nodes
        .filter(node => !data.edges.some(edge => edge.to === node.id))
        .map(renderNode)}
    </Box>
  );
}
