import { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import { createTicket, updateTicket } from '../utils/api';

const TicketForm = ({ mode, ticket, onSubmit, onCancel }) => {
  const [title, setTitle] = useState(ticket?.title || '');
  const [description, setDescription] = useState(ticket?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'create') {
        const githubUrl = localStorage.getItem('githubUrl') || '';
        const newTicket = await createTicket({ title, description, githubUrl });
        onSubmit && onSubmit(newTicket);
      } else if (mode === 'edit') {
        const updated = { ...ticket, title, description };
        await updateTicket(ticket._id, { title, description });
        onSubmit && onSubmit(updated);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ maxWidth: 600, mx: 'auto', p: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {mode === 'create' ? 'Create New Scenario' : 'Edit Ticket'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Title"
          fullWidth
          value={title}
          onChange={e => setTitle(e.target.value)}
          sx={{ mb: 2 }}
          disabled={mode === 'edit'}
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          minRows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />
        {error && <Box color="error.main" sx={{ mb: 2 }}>{error}</Box>}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={loading} variant="outlined">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : (mode === 'create' ? 'Create' : 'Save')}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default TicketForm; 