import { Box, Typography, Button, Container, TextField, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const Hero = () => {
  const navigate = useNavigate();
  const [githubUrl, setGithubUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateGithubUrl = (url) => {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+$/;
    return githubRegex.test(url);
  };

  const handleSubmit = async (e) => {
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
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/projects/import`, { repoUrl: githubUrl });
      localStorage.setItem('githubUrl', githubUrl);
      localStorage.setItem('entities', JSON.stringify(res.data.entities || []));
      navigate('/tickets');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #f5f5f5 0%, #ffffff 100%)',
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: 4,
            mb: 6,
          }}
        >
          <Box
            component="img"
            src="/assets/logo/refracto.svg"
            alt="Refracto Logo"
            sx={{
              width: { xs: '120px', md: '160px' },
              height: 'auto',
            }}
          />
          <Box>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                mb: 2,
                background: 'linear-gradient(45deg, #006BB8 30%, #005A9E 90%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Refracto — The AI Code Refactorer
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: '600px' }}
            >
              Prompt. Review. Deploy
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            maxWidth: '600px',
            mx: 'auto',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <CircularProgress size={48} thickness={4} sx={{ color: '#006BB8' }} />
              <Box sx={{ color: 'text.secondary' }}>
                Your project is being prepared...
              </Box>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="GitHub Repository URL"
                variant="outlined"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                error={!!error}
                helperText={error}
                placeholder="https://github.com/username/repository"
                sx={{ mb: 2 }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                sx={{
                  bgcolor: '#006BB8',
                  '&:hover': {
                    bgcolor: '#005A9E',
                  },
                  px: 4,
                  py: 1.5,
                }}
              >
                Continue
              </Button>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default Hero; 