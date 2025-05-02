import { useState } from 'react';
import { Box, Typography, Paper, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Check as CheckIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const GithubIcon = (props) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12 2C6.48 2 2 6.58 2 12.26c0 4.49 2.87 8.3 6.84 9.64.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.17-1.11-1.48-1.11-1.48-.91-.64.07-.63.07-.63 1.01.07 1.54 1.06 1.54 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85.004 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
      fill="#222"
    />
  </svg>
);

const codeSample = `/*\n * Handler to avoid updating a "closed" incident\n */\n@Before(event = CanService.EVENT_UPDATE)\npublic void ensureNoUpdateOnClosedIncidents(Incidents incident) {\n    Incidents in = db.run(Select.from(Incidents.class).where(i -> i.ID().eq(incident.getId()))).single(Incidents.class);\n    if (in.getStatusCode().equals("C")) {\n        throw new ServiceException(ErrorStatuses.CONFLICT, "Can't modify a closed incident");\n    }\n}`;

const testSample = `/**\n * Test to ensure there is an Incident created by each Customer.\n * @throws Exception\n */\n@Test\n@WithMockUser(username = "alice")\nvoid expandEntityEndpoint() throws Exception {\n    mockMvc.perform(get(expandEntityURI))\n      .andExpect(jsonPath("$.value[0].incidents[0]").isMap())\n      .andExpect(jsonPath("$.value[0].incidents[0]").isNotEmpty());\n}`;

const CodeDisplay = ({ ticket, onDelete, onUpdate, onEdit }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [desc, setDesc] = useState(ticket.description);
  const [saving, setSaving] = useState(false);

  const handleEdit = () => setEditOpen(true);
  const handleEditClose = () => setEditOpen(false);
  const handleEditSave = () => {
    setSaving(true);
    onUpdate && onUpdate({ ...ticket, description: desc });
    setSaving(false);
    setEditOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Action buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button
          startIcon={<EditIcon />}
          size="small"
          variant="outlined"
          onClick={() => onEdit && onEdit(ticket)}
        >
          Edit Description
        </Button>
        <Button
          startIcon={<DeleteIcon />}
          size="small"
          color="error"
          variant="outlined"
          onClick={() => onDelete && onDelete(ticket)}
        >
          Delete Ticket
        </Button>
      </Box>

      {/* Code and Test Case Sections */}
      <Box>
        <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <span role="img" aria-label="code">&lt;/&gt;</span> Code Implementation:
        </Typography>
        <Paper
          sx={{
            p: 2,
            bgcolor: '#181c23',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '1rem',
            overflowX: 'auto',
            mb: 2,
          }}
        >
          <pre style={{ margin: 0 }}>{ticket.generatedCode || codeSample}</pre>
        </Paper>
      </Box>
      <Box>
        <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <span role="img" aria-label="test">&#123;&#125;</span> Test case Implementation:
        </Typography>
        <Paper
          sx={{
            p: 2,
            bgcolor: '#181c23',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '1rem',
            overflowX: 'auto',
          }}
        >
          <pre style={{ margin: 0 }}>{ticket.testCases || testSample}</pre>
        </Paper>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<GithubIcon />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            px: 3,
            bgcolor: '#888',
            color: '#fff',
            '&:hover': { bgcolor: '#666' }
          }}
        >
          Approve & Apply
        </Button>
      </Box>
    </Box>
  );
};

export default CodeDisplay; 