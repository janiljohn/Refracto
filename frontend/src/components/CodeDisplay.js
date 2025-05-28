import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Paper, Button, IconButton, CircularProgress, Modal, Fade, Snackbar, Alert, Tooltip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, FiberManualRecord as StatusIcon, Save as SaveIcon, Cancel as CancelIcon, Terminal as TerminalIcon, ContentCopy as CopyIcon, Check as CheckIcon, Stop as StopIcon, GitHub as GitHubIcon } from '@mui/icons-material';
import { getStatusColor } from '../utils/statusUtils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as darkTheme } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MonacoEditor from '@monaco-editor/react';
import ChatPrompt from './ChatPrompt';
import { approveTicket, terminateTicket } from '../utils/api';

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



const MonacoWrapper = ({ value, onChange, language = "java" }) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const observerRef = useRef(null);

  const handleEditorDidMount = useCallback((editor) => {
    editorRef.current = editor;
    if (containerRef.current) {
      observerRef.current = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          editor.layout();
        });
      });
      observerRef.current.observe(containerRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  return (
    <Box ref={containerRef} sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <MonacoEditor
        height="100%"
        width="100%"
        defaultLanguage={language}
        theme="vs-dark"
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible'
          },
          automaticLayout: false // Disable built-in layout
        }}
      />
    </Box>
  );
};

const CodeDisplay = ({ ticket, onDelete, onUpdate, onEdit, onStatusChange }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [desc, setDesc] = useState(ticket.description);
  const [saving, setSaving] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(ticket);
  const [codeEdit, setCodeEdit] = useState(ticket.generatedCode || codeSample);
  const [testEdit, setTestEdit] = useState(ticket.testCases || testSample);
  const [editingCode, setEditingCode] = useState(false);
  const [editingTest, setEditingTest] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const editorRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const [copyFeedback, setCopyFeedback] = useState({ open: false, message: '' });
  const [copyState, setCopyState] = useState({ code: false, test: false });
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState(null);

  useEffect(() => {
    setCurrentTicket(ticket);
    setCodeEdit(ticket.generatedCode || codeSample);
    setTestEdit(ticket.testCases || testSample);
    console.log('Ticket data:', {
      status: ticket.status,
      hasReasoning: !!ticket.agentReasoning,
      reasoning: ticket.agentReasoning
    });
  }, [ticket]);

  const handleApproveAndApply = async () => {
    try {
      setIsApproving(true);
      setApproveError(null);
      const updatedTicket = await approveTicket(currentTicket._id);
      setCurrentTicket(updatedTicket);
      if (onStatusChange) {
        onStatusChange(updatedTicket.status);
      }
    } catch (error) {
      console.error('Error approving and applying:', error);
      setApproveError(error.message || 'Failed to approve and apply changes');
      setCopyFeedback({
        open: true,
        message: error.message || 'Failed to approve and apply changes',
        severity: 'error'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRefinementComplete = async () => {
    try {
      const response = await fetch(`/api/tickets/${currentTicket._id}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const updatedTicket = await response.json();
      setCurrentTicket(updatedTicket);
      setCodeEdit(updatedTicket.generatedCode || codeSample);
      setTestEdit(updatedTicket.testCases || testSample);
    } catch (error) {
      console.error('Error refreshing ticket:', error);
    } finally {
      setIsRefining(false);
    }
  };

  // Handle editor mount
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    // Initial resize
    editor.layout();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Handle resize with debounce
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  const handleEdit = () => setEditOpen(true);
  const handleEditClose = () => setEditOpen(false);
  const handleEditSave = () => {
    setSaving(true);
    onUpdate && onUpdate({ ...ticket, description: desc });
    setSaving(false);
    setEditOpen(false);
  };

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(prev => ({ ...prev, [type]: true }));
      setCopyFeedback({ open: true, message: `${type === 'code' ? 'Code' : 'Test'} copied to clipboard` });
      setTimeout(() => setCopyState(prev => ({ ...prev, [type]: false })), 2000);
    } catch (err) {
      setCopyFeedback({ open: true, message: 'Failed to copy' });
    }
  };

  const handleCloseFeedback = () => {
    setCopyFeedback({ open: false, message: '' });
  };

  const handleTerminate = async () => {
    if (window.confirm('Are you sure you want to terminate this ticket? This will stop all generation tasks and mark the ticket as failed.')) {
      try {
        const updatedTicket = await terminateTicket(currentTicket._id);
        setCurrentTicket(updatedTicket);
        if (onStatusChange) {
          onStatusChange(updatedTicket.status);
        }
      } catch (error) {
        console.error('Error terminating ticket:', error);
        setCopyFeedback({
          open: true,
          message: 'Failed to terminate ticket. Please try again.',
          severity: 'error'
        });
      }
    }
  };

  const handleOpenPR = () => {
    if (currentTicket.prUrl) {
      window.open(currentTicket.prUrl, '_blank');
    }
  };

  const renderLoadingState = () => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100%',
      gap: 2,
      p: 4,
      position: 'relative'
    }}>
      <Button
        startIcon={<StopIcon />}
        color="error"
        variant="outlined"
        onClick={handleTerminate}
        sx={{ 
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1
        }}
      >
        Terminate
      </Button>
      <CircularProgress size={60} thickness={4} />
      <Typography variant="h6" color="text.secondary">
        Agent is working...
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, textAlign: 'center' }}>
        Please wait while our AI agent processes your request. This may take a few moments.
      </Typography>
    </Box>
  );

  // If ticket is pending, in progress, or new, show loading state
  if (currentTicket.status === 'pending' || currentTicket.status === 'in_progress' || currentTicket.status === 'new') {
    return renderLoadingState();
  }

  const renderTerminal = () => {
    if (!currentTicket.agentReasoning) return null;

    return (
      <Modal
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        closeAfterTransition
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
      >
        <Fade in={terminalOpen}>
          <Paper sx={{
            width: '90%',
            maxWidth: 800,
            maxHeight: '80vh',
            bgcolor: '#1e1e1e',
            color: '#00ff00',
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Terminal Header */}
            <Box sx={{
              bgcolor: '#2d2d2d',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #3d3d3d'
            }}>
              <Typography variant="subtitle2" sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <TerminalIcon sx={{ fontSize: 16 }} />
                Agent Logs
              </Typography>
              <IconButton size="small" onClick={() => setTerminalOpen(false)} sx={{ color: '#fff' }}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Terminal Content */}
            <Box sx={{
              p: 2,
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              '& pre': { 
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }
            }}>
              {currentTicket.agentReasoning.codeGeneration && (
                <>
                  <Typography sx={{ color: '#00ff00', mb: 1 }}>=== Code Generation Reasoning ===</Typography>
                  <pre style={{ 
                    color: '#fff', 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'inherit',
                    marginBottom: '1rem'
                  }}>
                    {currentTicket.agentReasoning.codeGeneration.replace(/\\n/g, '\n')}
                  </pre>
                </>
              )}
              {currentTicket.agentReasoning.testGeneration && (
                <>
                  <Typography sx={{ color: '#00ff00', mt: 2, mb: 1 }}>=== Test Generation Reasoning ===</Typography>
                  <pre style={{ 
                    color: '#fff', 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'inherit',
                    marginBottom: '1rem'
                  }}>
                    {currentTicket.agentReasoning.testGeneration.replace(/\\n/g, '\n')}
                  </pre>
                </>
              )}
              {currentTicket.agentReasoning.error && (
                <>
                  <Typography sx={{ color: '#ff4444', mt: 2, mb: 1 }}>=== Error Logs ===</Typography>
                  <pre style={{ 
                    color: '#ff4444', 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'inherit'
                  }}>
                    {currentTicket.agentReasoning.error.replace(/\\n/g, '\n')}
                  </pre>
                </>
              )}
              <Typography sx={{ color: '#888', mt: 2, fontSize: '0.8rem' }}>
                Generated at: {new Date(currentTicket.agentReasoning.timestamp).toLocaleString()}
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Modal>
    );
  };

  const renderCodeBlock = (content, type, isEditing, onEdit, onSave, onCancel) => (
    <Paper
      sx={{
        height: 'calc((100vh - 180px) / 2)',
        maxWidth: '100%',
        bgcolor: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '0.95rem',
        border: '1px solid #333',
        borderRadius: 2,
        boxShadow: 'none',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '400px'
      }}
    >
      {isEditing ? (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <MonacoWrapper
              value={content}
              onChange={v => {
                if (type === 'code') {
                  setCodeEdit(v);
                } else {
                  setTestEdit(v);
                }
              }}
              language="java"
            />
          </Box>
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            p: 1, 
            justifyContent: 'flex-end', 
            bgcolor: '#23272e',
            borderTop: '1px solid #333'
          }}>
            <Button
              startIcon={<SaveIcon />}
              variant="contained"
              size="small"
              onClick={() => {
                setEditingCode(false);
                setEditingTest(false);
                onSave();
              }}
              sx={{ bgcolor: '#388e3c', color: '#fff', '&:hover': { bgcolor: '#256029' } }}
            >
              Save
            </Button>
            <Button
              startIcon={<CancelIcon />}
              variant="outlined"
              size="small"
              onClick={() => {
                setEditingCode(false);
                setEditingTest(false);
                onCancel();
              }}
              sx={{ color: '#fff', borderColor: '#888' }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ height: '100%', position: 'relative' }}>
          <Box sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            zIndex: 2,
            bgcolor: 'rgba(30,30,30,0.85)',
            borderRadius: 1,
            display: 'flex',
            gap: 1
          }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleCopy(content, type)}
              startIcon={copyState[type] ? <CheckIcon /> : <CopyIcon />}
              sx={{ 
                color: copyState[type] ? '#4caf50' : '#fff', 
                borderColor: copyState[type] ? '#4caf50' : '#888',
                minWidth: 'auto',
                px: 1
              }}
            >
              {copyState[type] ? 'Copied' : 'Copy'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={onEdit}
              startIcon={<EditIcon />}
              sx={{ color: '#fff', borderColor: '#888' }}
            >
              Edit
            </Button>
          </Box>
          <Box sx={{ 
            height: '100%', 
            overflow: 'hidden',
            '& .syntax-highlighter': {
              margin: 0,
              height: '100%',
              '& pre': {
                margin: 0,
                height: '100%',
                overflow: 'auto'
              }
            }
          }}>
            <SyntaxHighlighter
              language="java"
              style={darkTheme}
              showLineNumbers
              customStyle={{ 
                margin: 0, 
                background: 'none', 
                fontSize: '0.95rem', 
                borderRadius: 0,
                height: '100%'
              }}
              lineNumberStyle={{ 
                minWidth: 32, 
                color: '#858585', 
                background: '#23272e', 
                borderRight: '1px solid #222', 
                padding: '0 8px',
                position: 'sticky',
                left: 0
              }}
            >
              {content}
            </SyntaxHighlighter>
          </Box>
        </Box>
      )}
    </Paper>
  );

  const renderStatusBadges = () => (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Box className="status-badge">
        <StatusIcon sx={{ fontSize: 16 }} />
        {currentTicket.status.replace('_', ' ')}
      </Box>
      {currentTicket.status === 'pr_created' && (
        <Tooltip title="Pull Request Created">
          <Box className="status-badge" sx={{ bgcolor: '#2e7d3215', color: '#2e7d32', borderColor: '#2e7d3240' }}>
            <GitHubIcon sx={{ fontSize: 16 }} />
            PR Created
          </Box>
        </Tooltip>
      )}
    </Box>
  );

  const renderContent = () => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3,
      height: '100%',
      position: 'relative',
      pb: '100px'
    }}>
      {/* Status indicator and Action buttons */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2,
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
        {renderStatusBadges()}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {(currentTicket.status === 'pending' || currentTicket.status === 'in_progress') && (
            <Button
              startIcon={<StopIcon />}
              size="small"
              color="error"
              variant="outlined"
              onClick={handleTerminate}
              disabled={isApproving}
            >
              Terminate
            </Button>
          )}
          <Button
            startIcon={<EditIcon />}
            size="small"
            variant="outlined"
            onClick={() => onEdit && onEdit(ticket)}
            disabled={isApproving}
          >
            Edit Description
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            size="small"
            color="error"
            variant="outlined"
            onClick={() => onDelete && onDelete(ticket)}
            disabled={isApproving}
          >
            Delete Ticket
          </Button>
        </Box>
      </Box>

      {/* Code and Test Case Sections */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3,
        maxWidth: '1800px', 
        mx: 'auto',
        width: '100%',
        '& > div': {
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column'
        }
      }}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span role="img" aria-label="code">&lt;/&gt;</span> Code Implementation:
            {isRefining && <CircularProgress size={16} sx={{ ml: 1 }} />}
          </Typography>
          {renderCodeBlock(
            codeEdit,
            'code',
            editingCode,
            () => setEditingCode(true),
            () => { setEditingCode(false); onUpdate && onUpdate({ ...ticket, generatedCode: codeEdit }); },
            () => { setEditingCode(false); setCodeEdit(ticket.generatedCode || codeSample); }
          )}
        </Box>

        <Box>
          <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span role="img" aria-label="test">&#123;&#125;</span> Test case Implementation:
            {isRefining && <CircularProgress size={16} sx={{ ml: 1 }} />}
          </Typography>
          {renderCodeBlock(
            testEdit,
            'test',
            editingTest,
            () => setEditingTest(true),
            () => { setEditingTest(false); onUpdate && onUpdate({ ...ticket, testCases: testEdit }); },
            () => { setEditingTest(false); setTestEdit(ticket.testCases || testSample); }
          )}
        </Box>
      </Box>
      
      {/* Chat Prompt */}
      <Box sx={{ 
        position: 'fixed',
        bottom: 0,
        left: '320px',
        right: 0,
        p: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        zIndex: 1000,
        boxShadow: '0px -2px 4px rgba(0,0,0,0.05)'
      }}>
        <Box sx={{ maxWidth: '1800px', mx: 'auto', px: 3 }}>
          <ChatPrompt 
            key={currentTicket._id}
            ticketId={currentTicket._id}
            onRefinementComplete={handleRefinementComplete}
            onLoadingChange={setIsRefining}
          />
        </Box>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'flex-end', 
        gap: 1,
        mt: 2,
        width: '100%',
        pr: 2
      }}>
        {currentTicket.status === 'pr_created' ? (
          <Button
            variant="contained"
            onClick={handleOpenPR}
            startIcon={<GitHubIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 2,
              bgcolor: '#2e7d32',
              color: '#fff',
              '&:hover': { 
                bgcolor: '#1b5e20'
              }
            }}
          >
            View Pull Request
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleApproveAndApply}
            disabled={isApproving || currentTicket.status === 'failed'}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 2,
              minWidth: '48px',
              width: '48px',
              transition: 'all 0.3s ease',
              bgcolor: '#b0b0b0',
              color: '#fff',
              '&:hover': { 
                bgcolor: '#9e9e9e',
                width: '220px',
                '& .button-text': {
                  opacity: 1,
                  width: 'auto',
                  ml: 1
                }
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(176,176,176,0.5)',
                color: 'rgba(255,255,255,0.7)'
              }
            }}
          >
            {isApproving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <>
                <GithubIcon />
                <Typography 
                  className="button-text"
                  sx={{ 
                    opacity: 0,
                    width: 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.3s ease',
                    fontSize: '0.9rem'
                  }}
                >
                  Approve & Apply
                </Typography>
              </>
            )}
          </Button>
        )}

        {currentTicket.agentReasoning && (
          <Button
            variant="outlined"
            onClick={() => setTerminalOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 2,
              minWidth: '48px',
              width: '48px',
              transition: 'all 0.3s ease',
              borderColor: '#b0b0b0',
              color: '#b0b0b0',
              '&:hover': { 
                borderColor: '#9e9e9e',
                color: '#9e9e9e',
                bgcolor: 'rgba(176,176,176,0.04)',
                width: '220px',
                '& .button-text': {
                  opacity: 1,
                  width: 'auto',
                  ml: 1
                }
              },
              '& .MuiSvgIcon-root': {
                color: '#000'
              }
            }}
          >
            <TerminalIcon />
            <Typography 
              className="button-text"
              sx={{ 
                opacity: 0,
                width: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease',
                fontSize: '0.9rem'
              }}
            >
              View Agent Logs
            </Typography>
          </Button>
        )}
      </Box>

      {renderTerminal()}

      <Snackbar
        open={copyFeedback.open}
        autoHideDuration={2000}
        onClose={handleCloseFeedback}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseFeedback} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {copyFeedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );

  return renderContent();
};

export default CodeDisplay; 