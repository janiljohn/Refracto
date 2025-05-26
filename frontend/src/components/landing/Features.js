import { Box, Typography, Container, useTheme, useMediaQuery } from '@mui/material';
import { useInView } from 'react-intersection-observer';

const Feature = ({ title, description, image, alt, reverse }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <Box
      ref={ref}
      sx={{
        display: 'flex',
        flexDirection: {
          xs: 'column',
          md: reverse ? 'row-reverse' : 'row',
        },
        alignItems: 'center',
        gap: 6,
        py: 8,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s ease-out',
      }}
    >
      <Box
        sx={{
          flex: 1,
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        <Typography
          variant="h4"
          component="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: '#006BB8',
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: '500px', mx: { xs: 'auto', md: 0 } }}
        >
          {description}
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -20,
            left: -20,
            right: 20,
            bottom: 20,
            background: 'linear-gradient(45deg, #006BB8 0%, #005A9E 100%)',
            borderRadius: '12px',
            zIndex: 0,
            opacity: 0.1,
          },
        }}
      >
        <Box
          component="img"
          src={image}
          alt={alt}
          sx={{
            width: '100%',
            height: 'auto',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            zIndex: 1,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'transform 0.6s ease-out',
          }}
        />
      </Box>
    </Box>
  );
};

const Features = () => {
  const features = [
    {
      title: 'One-click refactors',
      description: 'Transform your codebase with a single click. Our AI analyzes your code and suggests optimal refactoring solutions.',
      image: '/assets/screenshots/overall.png',
      alt: 'Overall Refracto interface overview',
    },
    {
      title: 'Understands your codebase',
      description: 'Our AI deeply analyzes your code structure and dependencies to provide context-aware refactoring suggestions.',
      image: '/assets/screenshots/reasoning.png',
      alt: 'AI reasoning tab showing step-by-step refactor plan',
      reverse: true,
    },
    {
      title: 'Create tasks in natural language',
      description: 'Describe your refactoring needs in plain English. Our AI understands and converts your requirements into actionable tasks.',
      image: '/assets/screenshots/create.png',
      alt: 'Ticket creation workflow inside Refracto',
    },
    {
      title: 'Inline editing with AI hints',
      description: 'Edit generated code directly in your browser. Save changes and commit them to GitHub with a single click.',
      image: '/assets/screenshots/editor.png',
      alt: 'In-app code editor with live refactor preview',
      reverse: true,
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {features.map((feature, index) => (
        <Feature key={index} {...feature} />
      ))}
    </Container>
  );
};

export default Features; 