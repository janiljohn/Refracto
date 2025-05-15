import { useState } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton,
  Button,
  Paper,
  Divider,
  TextField,
  InputAdornment
} from '@mui/material';
import { Add as AddIcon, Menu as MenuIcon, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import TicketList from '../components/TicketList';
import CodeDisplay from '../components/CodeDisplay';
import ChatPrompt from '../components/ChatPrompt';
import CreateTicketModal from '../components/CreateTicketModal';
import TicketForm from '../components/TicketForm';
import { deleteTicket, updateTicket } from '../utils/api';

const drawerWidth = 320;

const TicketsPage = () => {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'create', 'edit'
  const [refreshTickets, setRefreshTickets] = useState(0);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleTicketCreated = (ticket) => {
    setMode('view');
    setRefreshTickets((c) => c + 1);
    setSelectedTicket(ticket);
  };

  const handleDelete = async (ticket) => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      await deleteTicket(ticket._id);
      setSelectedTicket(null);
      setRefreshTickets((c) => c + 1);
    }
  };

  const handleUpdate = async (updatedTicket) => {
    await updateTicket(updatedTicket._id, {
      description: updatedTicket.description,
      generatedCode: updatedTicket.generatedCode,
      testCases: updatedTicket.testCases
    });
    setSelectedTicket((prev) => ({
      ...prev,
      description: updatedTicket.description,
      generatedCode: updatedTicket.generatedCode,
      testCases: updatedTicket.testCases
    }));
    setMode('view');
    setRefreshTickets((c) => c + 1);
  };

  const handleStartCreate = () => {
    setSelectedTicket(null);
    setMode('create');
  };

  const handleStartEdit = () => {
    setMode('edit');
  };

  const handleCancel = () => {
    setMode('view');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" elevation={1} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', zIndex: 1201 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', userSelect: 'none' }} onClick={() => navigate('/')}> 
            <img src="/ricon.png" alt="Logo" style={{ height: 32, width: 32, marginRight: 8 }} />
            <Typography
              variant="h5"
              fontWeight={700}
              color="primary"
              sx={{ letterSpacing: 1 }}
            >
              Refracto
            </Typography>
          </Box>
          <TextField
            size="small"
            placeholder="Search tickets or entities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ width: 320 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: { borderRadius: 2 }
            }}
          />
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default'
            },
          }}
        >
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              Tickets
            </Typography>
          </Toolbar>
          <Divider />
          <TicketList
            onSelectTicket={setSelectedTicket}
            selectedTicket={selectedTicket}
            refresh={refreshTickets}
            search={search}
          />
          <Box sx={{ p: 2, mt: 'auto' }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleStartCreate}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                py: 1.5
              }}
            >
              Create New Scenario
            </Button>
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
            {mode === 'create' && (
              <TicketForm mode="create" onSubmit={handleTicketCreated} onCancel={handleCancel} />
            )}
            {mode === 'edit' && selectedTicket && (
              <TicketForm mode="edit" ticket={selectedTicket} onSubmit={handleUpdate} onCancel={handleCancel} />
            )}
            {mode === 'view' && selectedTicket && (
              <CodeDisplay ticket={selectedTicket} onDelete={handleDelete} onEdit={handleStartEdit} onUpdate={handleUpdate} />
            )}
            {mode === 'view' && !selectedTicket && (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography color="text.secondary">
                  Select a ticket to view its details
                </Typography>
              </Box>
            )}
          </Box>

          {mode === 'view' && selectedTicket && (
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <ChatPrompt ticketId={selectedTicket._id} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TicketsPage; 