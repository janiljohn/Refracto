import { Box, Typography, Container } from '@mui/material';

const TrustedBy = () => {
  const techLogos = [
    { name: 'GitHub', logo: '/assets/tech/github.svg' },
    { name: 'Google', logo: '/assets/tech/google.svg' },
    { name: 'Microsoft', logo: '/assets/tech/microsoft.svg' },
    { name: 'Amazon', logo: '/assets/tech/amazon.svg' },
    { name: 'Meta', logo: '/assets/tech/meta.svg' },
  ];

  return (
    <Box
      sx={{
        bgcolor: '#1a1a1a',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 500,
            }}
          >
            Trusted by engineers at
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {techLogos.map((tech) => (
              <Box
                key={tech.name}
                component="img"
                src={tech.logo}
                alt={`${tech.name} logo`}
                sx={{
                  height: '24px',
                  filter: 'grayscale(100%) brightness(0.7)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    filter: 'grayscale(0%) brightness(1)',
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default TrustedBy; 