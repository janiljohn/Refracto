import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress
} from '@mui/material';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const LandingPage = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom>
            Refracto
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Code Generation Platform
          </Typography>
          {loading ? (
            <Box sx={{ mt: 6, mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <CircularProgress size={48} thickness={4} />
              <Typography variant="h6" color="text.secondary">
                Your project is being prepared...
              </Typography>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
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
              >
                Continue
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default LandingPage; 