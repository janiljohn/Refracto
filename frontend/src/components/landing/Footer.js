import { Box, Container, IconButton, Typography } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box
            component="img"
            src="/assets/logo/refracto.svg"
            alt="Refracto Logo"
            sx={{
              height: '32px',
              width: 'auto',
            }}
          />
          
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: { xs: 'center', sm: 'left' } }}
          >
            © {currentYear} Refracto. All rights reserved.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 1,
            }}
          >
            <IconButton
              color="inherit"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: '#006BB8',
                },
              }}
            >
              <GitHubIcon />
            </IconButton>
            <IconButton
              color="inherit"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: '#006BB8',
                },
              }}
            >
              <TwitterIcon />
            </IconButton>
            <IconButton
              color="inherit"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: '#006BB8',
                },
              }}
            >
              <LinkedInIcon />
            </IconButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 