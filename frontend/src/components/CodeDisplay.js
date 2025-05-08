import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, IconButton } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, FiberManualRecord as StatusIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { getStatusColor } from '../utils/statusUtils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as darkTheme } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MonacoEditor from '@monaco-editor/react';

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
  const [currentTicket, setCurrentTicket] = useState(ticket);
  const [codeEdit, setCodeEdit] = useState(ticket.generatedCode || codeSample);
  const [testEdit, setTestEdit] = useState(ticket.testCases || testSample);
  const [editingCode, setEditingCode] = useState(false);
  const [editingTest, setEditingTest] = useState(false);

  useEffect(() => {
    setCurrentTicket(ticket);
    setCodeEdit(ticket.generatedCode || codeSample);
    setTestEdit(ticket.testCases || testSample);
  }, [ticket]);

  // Poll for updates when status is in_progress
  useEffect(() => {
    let interval;
    if (currentTicket.status === 'in_progress') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/tickets/${currentTicket._id}`);
          const updatedTicket = await response.json();
          setCurrentTicket(updatedTicket);
          if (updatedTicket.status !== 'in_progress') {
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Error polling ticket status:', error);
        }
      }, 2000); // Poll every 2 seconds
    }
    return () => clearInterval(interval);
  }, [currentTicket._id, currentTicket.status]);

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
      {/* Status indicator and Action buttons */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 3,
        '& .status-badge': {
          px: 2,
          py: 0.5,
          borderRadius: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'capitalize',
          backgroundColor: `${getStatusColor(currentTicket.status)}15`,
          color: getStatusColor(currentTicket.status),
          border: `1px solid ${getStatusColor(currentTicket.status)}40`,
        }
      }}>
        <Box className="status-badge">
          <StatusIcon sx={{ fontSize: 16 }} />
          {currentTicket.status.replace('_', ' ')}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
      </Box>

      {/* Code and Test Case Sections */}
      <Box>
        <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <span role="img" aria-label="code">&lt;/&gt;</span> Code Implementation:
        </Typography>
        <Paper
          sx={{
            p: 0,
            bgcolor: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '0.95rem',
            overflowX: 'auto',
            mb: 2,
            border: '1px solid #333',
            borderRadius: 2,
            boxShadow: 'none',
            position: 'relative',
          }}
        >
          {editingCode ? (
            <Box>
              <MonacoEditor
                height="300px"
                defaultLanguage="java"
                theme="vs-dark"
                value={codeEdit}
                onChange={v => setCodeEdit(v)}
                options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }}
              />
              <Box sx={{ display: 'flex', gap: 1, p: 1, justifyContent: 'flex-end', bgcolor: '#23272e' }}>
                <Button
                  startIcon={<SaveIcon />}
                  variant="contained"
                  size="small"
                  onClick={() => { setEditingCode(false); onUpdate && onUpdate({ ...ticket, generatedCode: codeEdit }); }}
                  sx={{ bgcolor: '#388e3c', color: '#fff', '&:hover': { bgcolor: '#256029' } }}
                >
                  Save
                </Button>
                <Button
                  startIcon={<CancelIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => { setEditingCode(false); setCodeEdit(ticket.generatedCode || codeSample); }}
                  sx={{ color: '#fff', borderColor: '#888' }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setEditingCode(true)}
                  startIcon={<EditIcon />}
                  sx={{ color: '#fff', borderColor: '#888', background: 'rgba(30,30,30,0.85)' }}
                >
                  Edit
                </Button>
              </Box>
              <SyntaxHighlighter
                language="java"
                style={darkTheme}
                showLineNumbers
                customStyle={{ margin: 0, background: 'none', fontSize: '0.95rem', borderRadius: 0 }}
                lineNumberStyle={{ minWidth: 32, color: '#858585', background: '#23272e', borderRight: '1px solid #222', padding: '0 8px' }}
              >
                {codeEdit}
              </SyntaxHighlighter>
            </Box>
          )}
        </Paper>
      </Box>
      <Box>
        <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <span role="img" aria-label="test">&#123;&#125;</span> Test case Implementation:
        </Typography>
        <Paper
          sx={{
            p: 0,
            bgcolor: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '0.95rem',
            overflowX: 'auto',
            border: '1px solid #333',
            borderRadius: 2,
            boxShadow: 'none',
            position: 'relative',
          }}
        >
          {editingTest ? (
            <Box>
              <MonacoEditor
                height="300px"
                defaultLanguage="java"
                theme="vs-dark"
                value={testEdit}
                onChange={v => setTestEdit(v)}
                options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }}
              />
              <Box sx={{ display: 'flex', gap: 1, p: 1, justifyContent: 'flex-end', bgcolor: '#23272e' }}>
                <Button
                  startIcon={<SaveIcon />}
                  variant="contained"
                  size="small"
                  onClick={() => { setEditingTest(false); onUpdate && onUpdate({ ...ticket, testCases: testEdit }); }}
                  sx={{ bgcolor: '#388e3c', color: '#fff', '&:hover': { bgcolor: '#256029' } }}
                >
                  Save
                </Button>
                <Button
                  startIcon={<CancelIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => { setEditingTest(false); setTestEdit(ticket.testCases || testSample); }}
                  sx={{ color: '#fff', borderColor: '#888' }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setEditingTest(true)}
                  startIcon={<EditIcon />}
                  sx={{ color: '#fff', borderColor: '#888', background: 'rgba(30,30,30,0.85)' }}
                >
                  Edit
                </Button>
              </Box>
              <SyntaxHighlighter
                language="java"
                style={darkTheme}
                showLineNumbers
                customStyle={{ margin: 0, background: 'none', fontSize: '0.95rem', borderRadius: 0 }}
                lineNumberStyle={{ minWidth: 32, color: '#858585', background: '#23272e', borderRight: '1px solid #222', padding: '0 8px' }}
              >
                {testEdit}
              </SyntaxHighlighter>
            </Box>
          )}
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