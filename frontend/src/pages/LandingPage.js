import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper,
  useTheme,
  alpha
} from '@mui/material';

const LandingPage = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  const validateGithubUrl = (url) => {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+$/;
    return githubRegex.test(url);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!githubUrl) {
      setError('Please enter a GitHub URL');
      return;
    }

    if (!validateGithubUrl(githubUrl)) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    localStorage.setItem('githubUrl', githubUrl);
    navigate('/tickets');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 2,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom
              sx={{
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Refracto
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary"
              sx={{ 
                mb: 1,
                fontWeight: 500
              }}
            >
              Code Generation Platform
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                maxWidth: '80%',
                mx: 'auto',
                opacity: 0.8
              }}
            >
              Transform your GitHub repository with AI-powered code generation
            </Typography>
          </Box>

          <Box 
            component="form" 
            onSubmit={handleSubmit}
            sx={{
              '& .MuiTextField-root': {
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    }
                  }
                }
              }
            }}
          >
            <TextField
              fullWidth
              label="GitHub Repository URL"
              variant="outlined"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              error={!!error}
              helperText={error}
              placeholder="https://github.com/username/repository"
              InputProps={{
                sx: { 
                  height: 56,
                  fontSize: '1.1rem'
                }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              sx={{
                height: 56,
                borderRadius: 2,
                fontSize: '1.1rem',
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none',
                  transform: 'translateY(-1px)',
                  transition: 'transform 0.2s'
                }
              }}
            >
              Continue
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LandingPage; 