import { Box, Typography, Paper, Avatar, useTheme, Accordion, AccordionSummary, AccordionDetails, IconButton, CircularProgress } from '@mui/material';
import { Person as UserIcon, SmartToy as AIIcon, ExpandMore as ExpandMoreIcon, Chat as ChatIcon, Error as ErrorIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';

const MessageBubble = ({ message, isAI }) => {
  const theme = useTheme();
  const isQuestion = message.type === 'question';
  const isLoading = message.type === 'loading';
  const isError = message.type === 'error';

  console.log('ChatHistory: Rendering message:', {
    role: message.role,
    type: message.type,
    contentLength: message.content?.length
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isAI ? 'row' : 'row-reverse',
        gap: 1,
        mb: 2,
        maxWidth: '80%',
        ml: isAI ? 0 : 'auto',
        mr: isAI ? 'auto' : 0
      }}
    >
      <Avatar
        sx={{
          bgcolor: isAI 
            ? isError 
              ? theme.palette.error.main 
              : theme.palette.primary.main 
            : theme.palette.secondary.main,
          width: 32,
          height: 32
        }}
      >
        {isAI 
          ? isError 
            ? <ErrorIcon /> 
            : <AIIcon />
          : <UserIcon />
        }
      </Avatar>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: isAI 
              ? isQuestion 
                ? theme.palette.info.light 
                : isError
                  ? theme.palette.error.light
                  : theme.palette.background.paper
              : theme.palette.secondary.light,
            color: isAI 
              ? isQuestion 
                ? theme.palette.info.contrastText
                : isError
                  ? theme.palette.error.contrastText
                  : theme.palette.text.primary
              : theme.palette.secondary.contrastText,
            border: isQuestion 
              ? `1px solid ${theme.palette.info.main}`
              : isError
                ? `1px solid ${theme.palette.error.main}`
                : 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {isLoading && (
            <CircularProgress 
              size={16} 
              thickness={4}
              sx={{ 
                color: theme.palette.primary.main,
                mr: 1
              }} 
            />
          )}
          <Typography variant="body2">
            {message.content}
          </Typography>
        </Paper>
        
        {!isLoading && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              alignSelf: isAI ? 'flex-start' : 'flex-end',
              fontSize: '0.75rem'
            }}
          >
            {format(new Date(message.timestamp), 'MMM d, h:mm a')}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const ChatHistory = ({ messages = [] }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Auto-expand when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      setExpanded(true);
      // Scroll to bottom after a short delay to ensure content is rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom when expanded
  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [expanded]);

  useEffect(() => {
    console.log('ChatHistory: Received messages update:', {
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 50) + '...',
      hasLoadingMessage: messages.some(m => m.type === 'loading')
    });
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{
        '&.MuiAccordion-root': {
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px !important',
          '&:before': {
            display: 'none',
          },
        },
        '&.Mui-expanded': {
          margin: 0,
        }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: '48px !important',
          bgcolor: 'background.default',
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: 'divider',
          '& .MuiAccordionSummary-content': {
            margin: '8px 0',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChatIcon color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            Chat History {messages.length > 0 && `(${messages.length})`}
          </Typography>
          {messages.length > prevMessagesLengthRef.current && (
            <Box 
              sx={{ 
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontSize: '0.75rem'
              }}
            >
              New
            </Box>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <Box
          sx={{
            height: '300px',
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgba(0,0,0,0.3)',
            }
          }}
        >
          {messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary'
            }}>
              <Typography variant="body2">
                No messages yet
              </Typography>
            </Box>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  isAI={message.role === 'ai'}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default ChatHistory; 