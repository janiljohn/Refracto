import { useState } from 'react';
import { 
  Box, 
  TextField, 
  IconButton,
  Paper
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

const ChatPrompt = ({ ticketId }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    // TODO: Send prompt to backend
    console.log('Sending prompt:', prompt);
    setPrompt('');
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2
      }}
    >
      <TextField
        fullWidth
        placeholder="Ask for code refinements..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        variant="standard"
        InputProps={{
          disableUnderline: true,
          sx: { px: 1 }
        }}
      />
      <IconButton 
        type="submit" 
        color="primary"
        disabled={!prompt.trim()}
      >
        <SendIcon />
      </IconButton>
    </Paper>
  );
};

export default ChatPrompt; 