import { useState, useMemo } from 'react';
import { Box, TextField, Button, Typography, Paper, IconButton, MenuItem, Chip, Autocomplete } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { createTicket, updateTicket } from '../utils/api';

const TRIGGER_OPTIONS = [
  'on CREATE of <entity>',
  'on UPDATE',
  'on READ',
  'action <name>',
  'function <name>'
];

const TicketForm = ({ mode, ticket, onSubmit, onCancel }) => {
  const [title, setTitle] = useState(ticket?.title || '');
  const [intent, setIntent] = useState(ticket?.intent || '');
  const [cdsEntities, setCdsEntities] = useState(ticket?.cds?.entities || []);
  const [trigger, setTrigger] = useState(ticket?.trigger || '');
  const [rules, setRules] = useState(ticket?.rules || ['']);
  const [output, setOutput] = useState(ticket?.output || '');
  const [notes, setNotes] = useState(ticket?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get entities from localStorage (set after project import)
  const entityOptions = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('entities') || '[]');
    } catch {
      return [];
    }
  }, []);

  const handleRuleChange = (idx, value) => {
    setRules(rules => rules.map((r, i) => (i === idx ? value : r)));
  };
  const handleAddRule = () => setRules(rules => [...rules, '']);
  const handleRemoveRule = idx => setRules(rules => rules.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !intent.trim() || !trigger.trim() || !output.trim()) {
      setError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const data = {
        title,
        intent,
        cds: { entities: cdsEntities },
        trigger,
        rules: rules.filter(r => r.trim()),
        output,
        notes
      };
      if (mode === 'create') {
        const githubUrl = localStorage.getItem('githubUrl') || '';
        const newTicket = await createTicket({ ...data, githubUrl });
        onSubmit && onSubmit(newTicket);
      } else if (mode === 'edit') {
        const updated = { ...ticket, ...data };
        await updateTicket(ticket._id, data);
        onSubmit && onSubmit(updated);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ maxWidth: 700, mx: 'auto', p: 4 }}>
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
          required
        />
        <TextField
          label="Intent"
          fullWidth
          multiline
          minRows={2}
          value={intent}
          onChange={e => setIntent(e.target.value)}
          sx={{ mb: 2 }}
          required
        />
        <Autocomplete
          multiple
          freeSolo
          options={entityOptions}
          value={cdsEntities}
          onChange={(_, newValue) => setCdsEntities(newValue)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
            ))
          }
          renderInput={(params) => (
            <TextField {...params} label="CDS Entities (optional)" placeholder="Add or select entities" sx={{ mb: 2 }} />
          )}
        />
        <TextField
          label="Trigger"
          fullWidth
          select
          value={trigger}
          onChange={e => setTrigger(e.target.value)}
          sx={{ mb: 2 }}
          required
        >
          {TRIGGER_OPTIONS.map(opt => (
            <MenuItem value={opt} key={opt}>{opt}</MenuItem>
          ))}
          <MenuItem value={trigger} key="custom" style={{ display: trigger && !TRIGGER_OPTIONS.includes(trigger) ? 'block' : 'none' }}>
            {trigger}
          </MenuItem>
        </TextField>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Rules
          </Typography>
          {rules.map((rule, idx) => (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TextField
                fullWidth
                value={rule}
                onChange={e => handleRuleChange(idx, e.target.value)}
                placeholder={`Rule ${idx + 1}`}
                sx={{ mr: 1 }}
              />
              <IconButton onClick={() => handleRemoveRule(idx)} disabled={rules.length === 1}>
                <RemoveIcon />
              </IconButton>
              {idx === rules.length - 1 && (
                <IconButton onClick={handleAddRule}>
                  <AddIcon />
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
        <TextField
          label="Output"
          fullWidth
          multiline
          minRows={2}
          value={output}
          onChange={e => setOutput(e.target.value)}
          sx={{ mb: 2 }}
          required
        />
        <TextField
          label="Notes (optional)"
          fullWidth
          multiline
          minRows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
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