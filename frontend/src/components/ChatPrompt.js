import { useState } from 'react';
import { Box, TextField, Button, CircularProgress } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { refineTicket, getTicket } from '../utils/api';

const ChatPrompt = ({ ticketId, onRefinementComplete, onLoadingChange }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshTicket = async () => {
    try {
      console.log('ChatPrompt: Refreshing ticket data');
      const updatedTicket = await getTicket(ticketId);
      console.log('ChatPrompt: Received updated ticket:', updatedTicket);
      onRefinementComplete && onRefinementComplete(updatedTicket);
    } catch (err) {
      console.error('ChatPrompt: Error refreshing ticket:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    console.log('ChatPrompt: Starting submit with prompt:', prompt);
    setLoading(true);
    setError('');
    onLoadingChange?.(true);

    try {
      // Send the message and get immediate response with updated ticket
      console.log('ChatPrompt: Calling refineTicket API');
      const response = await refineTicket(ticketId, prompt);
      console.log('ChatPrompt: Received API response:', response);
      
      setPrompt('');
      
      // Update the UI with the new ticket data immediately
      if (response.ticket) {
        console.log('ChatPrompt: Updating UI with new ticket data:', response.ticket);
        onRefinementComplete(response.ticket);
      } else {
        console.warn('ChatPrompt: No ticket data in response:', response);
      }
      
      // Implement exponential backoff polling
      let pollCount = 0;
      const maxPollCount = 100; // Maximum number of polls
      const baseDelay = 2000; // Start with 2 seconds
      const maxDelay = 10000; // Max delay of 10 seconds
      
      const pollForUpdates = async () => {
        try {
          const updatedTicket = await getTicket(ticketId);
          console.log('ChatPrompt: Polling for updates:', {
            pollCount,
            hasLoadingMessage: updatedTicket.chatHistory?.some(m => m.type === 'loading'),
            lastMessageType: updatedTicket.chatHistory?.[updatedTicket.chatHistory.length - 1]?.type
          });
          
          // If no loading message and we have a new message, update UI
          if (!updatedTicket.chatHistory?.some(m => m.type === 'loading')) {
            console.log('ChatPrompt: Loading complete, updating UI');
            onRefinementComplete(updatedTicket);
            return true; // Stop polling
          }
          
          // Calculate next delay using exponential backoff
          pollCount++;
          if (pollCount >= maxPollCount) {
            console.log('ChatPrompt: Max polls reached, forcing final update');
            onRefinementComplete(updatedTicket);
            return true; // Stop polling
          }
          
          const nextDelay = Math.min(baseDelay * Math.pow(1.5, pollCount), maxDelay);
          console.log('ChatPrompt: Scheduling next poll in', nextDelay, 'ms');
          setTimeout(pollForUpdates, nextDelay);
          return false; // Continue polling
        } catch (err) {
          console.error('ChatPrompt: Error checking for updates:', err);
          return true; // Stop polling on error
        }
      };

      // Start polling
      console.log('ChatPrompt: Starting polling with exponential backoff');
      pollForUpdates();
      
    } catch (err) {
      console.error('ChatPrompt: Error during submit:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
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