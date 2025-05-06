import { useState } from 'react';
import { Box, TextField, Button, CircularProgress } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { refineTicket } from '../utils/api';

const ChatPrompt = ({ ticketId, onRefinementComplete }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');

    try {
      await refineTicket(ticketId, prompt);
      setPrompt('');
      onRefinementComplete && onRefinementComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Refine the code (e.g., 'Add error handling' or 'Optimize this function')"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
        error={!!error}
        helperText={error}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={loading || !prompt.trim()}
        startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
      >
        {loading ? 'Refining...' : 'Refine'}
      </Button>
    </Box>
  );
};

export default ChatPrompt; 