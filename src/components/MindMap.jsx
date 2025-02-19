import { Box, List, ListItem, ListItemText, Collapse } from '@mui/material'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { useState } from 'react'

const MindMapNode = ({ node, depth = 0 }) => {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  return (
    <>
      <ListItem 
        onClick={() => setOpen(!open)}
        sx={{ 
          pl: depth * 2,
          cursor: 'pointer'
        }}
      >
        {hasChildren && (open ? <ExpandLess /> : <ExpandMore />)}
        <ListItemText 
          primary={node.topic || node.title} 
          sx={{ 
            '& .MuiListItemText-primary': {
              fontWeight: depth === 0 ? 'bold' : 'normal',
              fontSize: `${1 - depth * 0.1}rem`
            }
          }}
        />
      </ListItem>
      {hasChildren && (
        <Collapse in={open}>
          <List>
            {node.children.map((child, index) => (
              <MindMapNode key={child.id || index} node={child} depth={depth + 1} />
            ))}
          </List>
        </Collapse>
      )}
    </>
  )
}

export const MindMap = ({ data }) => {
  if (!data) return null

  return (
    <Box sx={{ width: 300, bgcolor: 'background.paper' }}>
      <List component="nav">
        <MindMapNode node={data} />
      </List>
    </Box>
  )
} 