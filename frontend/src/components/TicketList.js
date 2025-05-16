import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Tooltip
} from '@mui/material';
import { 
  FiberManualRecord as StatusIcon,
  AccessTime as TimeIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { getTickets } from '../utils/api';
import { differenceInHours, differenceInDays, differenceInWeeks } from 'date-fns';

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

const formatTimeAgo = (date) => {
  const now = new Date();
  const hours = differenceInHours(now, date);
  const days = differenceInDays(now, date);
  const weeks = differenceInWeeks(now, date);

  if (weeks > 0) return `${weeks}w`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return 'now';
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
            transition: 'all 0.2s ease-in-out',
            position: 'relative',
            background: selectedTicket?._id === ticket._id ? '#f5f5f5' : '#fff',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
              borderColor: '#222',
              background: selectedTicket?._id === ticket._id ? '#f5f5f5' : '#fafafa',
              '& .MuiCardActionArea-root': {
                background: 'rgba(34, 34, 34, 0.02)'
              }
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }
          }}
        >
          <CardActionArea 
            onClick={() => onSelectTicket(ticket)}
            sx={{
              transition: 'background-color 0.2s ease-in-out',
              '&:hover': {
                background: 'rgba(59, 130, 246, 0.02)'
              }
            }}
          >
            <CardContent sx={{ pb: '16px !important', minHeight: 70 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
                  {ticket.title}
                </Typography>
                <StatusIcon sx={{ color: getStatusColor(ticket.status), fontSize: 18 }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: 1,
                  alignItems: 'center'
                }}>
                  <Tooltip title={`Created ${new Date(ticket.createdAt).toLocaleString()}`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {formatTimeAgo(new Date(ticket.createdAt))}
                      </Typography>
                    </Box>
                  </Tooltip>
                  {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                    <Tooltip title={`Updated ${new Date(ticket.updatedAt).toLocaleString()}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EditIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {formatTimeAgo(new Date(ticket.updatedAt))}
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
};

export default TicketList; 