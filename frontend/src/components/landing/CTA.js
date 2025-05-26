import { Box, Typography, Button, Container } from '@mui/material';

const CTA = () => {
  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        py: 2,
        zIndex: 1000,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: '#1a1a1a',
            }}
          >
            Ready to refactor at lightspeed?
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#006BB8',
              '&:hover': {
                bgcolor: '#005A9E',
              },
              px: 4,
              py: 1.5,
              minWidth: { xs: '100%', sm: 'auto' },
            }}
          >
            Get Refracto
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default CTA; 