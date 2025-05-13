import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Chip
} from '@mui/material';
import { FiberManualRecord as StatusIcon } from '@mui/icons-material';
import { getTickets } from '../utils/api';

const getStatusColor = (status) => {
  switch (status) {
    case 'new':
      return '#3b82f6'; // blue
    case 'in_progress':
      return '#eab308'; // yellow
    case 'completed':
      return '#22c55e'; // green
    case 'failed':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
};

const getEntityColor = (entity) => {
  const colors = [
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#06b6d4', // cyan
    '#a855f7', // violet
    '#10b981', // emerald
    '#f59e0b', // amber
    '#6366f1', // indigo
    '#ef4444', // red
    '#84cc16', // lime
    '#0ea5e9', // sky
    '#d946ef', // fuchsia
    '#22c55e', // green
    '#f43f5e', // rose
    '#06b6d4', // cyan
    '#8f3cf7', // purple
    '#e879f9', // pink
    '#2dd4bf', // teal
    '#fb923c', // orange
  ];
  
  // Improved hash function for better distribution
  const hash = entity.split('').reduce((acc, char, index) => {
    return acc + (char.charCodeAt(0) * (index + 1));
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

const TicketList = ({ onSelectTicket, selectedTicket, refresh, search }) => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    getTickets().then(setTickets);
  }, [refresh]);

  const filtered = search
    ? tickets.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.cds?.entities || []).some(entity => entity.toLowerCase().includes(search.toLowerCase()))
      )
    : tickets;

  return (
    <Box sx={{ px: 2, pt: 2, overflowY: 'auto', height: 'calc(100vh - 120px)' }}>
      {filtered.map((ticket) => (
        <Card
          key={ticket._id}
          elevation={selectedTicket?._id === ticket._id ? 6 : 1}
          sx={{
            mb: 2,
            borderRadius: 3,
            border: selectedTicket?._id === ticket._id ? '2px solid #222' : '1px solid #e0e0e0',
            boxShadow: selectedTicket?._id === ticket._id ? '0 4px 16px rgba(34,34,34,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, border 0.2s',
            position: 'relative',
            background: selectedTicket?._id === ticket._id ? '#f5f5f5' : '#fff',
          }}
        >
          <CardActionArea onClick={() => onSelectTicket(ticket)}>
            <CardContent sx={{ pb: '16px !important', minHeight: 70 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
                  {ticket.title}
                </Typography>
                <StatusIcon sx={{ color: getStatusColor(ticket.status), fontSize: 18, ml: 1 }} />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minHeight: 24 }}>
                {ticket.cds?.entities?.length > 0 && ticket.cds.entities.map(entity => (
                  <Chip 
                    key={entity} 
                    label={entity} 
                    size="small" 
                    sx={{
                      backgroundColor: `${getEntityColor(entity)}15`,
                      borderColor: getEntityColor(entity),
                      color: getEntityColor(entity),
                      '&:hover': {
                        backgroundColor: `${getEntityColor(entity)}25`,
                      }
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
};

export default TicketList; 