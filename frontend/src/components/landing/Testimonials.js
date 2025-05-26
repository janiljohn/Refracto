import { Box, Typography, Container, Avatar } from '@mui/material';
import { useRef } from 'react';

const testimonials = [
  {
    quote: "Refracto has transformed how we handle code refactoring. It's like having a senior engineer review every line of code.",
    author: "Sarah Chen",
    role: "Lead Developer",
    company: "TechCorp",
    avatar: "/assets/avatars/sarah.svg"
  },
  {
    quote: "The AI's understanding of our codebase is incredible. It suggests refactoring patterns we hadn't even considered.",
    author: "Michael Rodriguez",
    role: "Engineering Manager",
    company: "DevFlow",
    avatar: "/assets/avatars/michael.svg"
  },
  {
    quote: "What used to take days now takes minutes. Refracto has become an essential part of our development workflow.",
    author: "Emma Thompson",
    role: "Senior Developer",
    company: "CodeCraft",
    avatar: "/assets/avatars/emma.svg"
  },
  {
    quote: "The natural language interface makes it so easy to describe what we want to achieve. It's like pair programming with an AI.",
    author: "David Kim",
    role: "Full Stack Developer",
    company: "WebScale",
    avatar: "/assets/avatars/david.svg"
  }
];

const TestimonialCard = ({ testimonial, isActive }) => {
  return (
    <Box
      sx={{
        minWidth: { xs: '280px', sm: '320px' },
        p: 4,
        bgcolor: 'white',
        borderRadius: '12px',
        boxShadow: isActive 
          ? '0 8px 32px rgba(0, 107, 184, 0.15)'
          : '0 4px 16px rgba(0, 0, 0, 0.05)',
        transform: isActive ? 'translateY(-4px)' : 'none',
        transition: 'all 0.3s ease',
        mx: 2,
        cursor: 'pointer',
      }}
    >
      <Typography
        variant="body1"
        sx={{
          mb: 3,
          color: 'text.primary',
          fontStyle: 'italic',
          lineHeight: 1.6,
        }}
      >
        "{testimonial.quote}"
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Avatar
          src={testimonial.avatar}
          alt={testimonial.author}
          sx={{ width: 48, height: 48 }}
        />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {testimonial.author}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {testimonial.role} at {testimonial.company}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const Testimonials = () => {
  const scrollContainerRef = useRef(null);

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340; // card width + margin
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <Box sx={{ py: 8, bgcolor: '#f8f9fa' }}>
      <Container maxWidth="lg">
        <Typography
          variant="h3"
          component="h2"
          align="center"
          sx={{
            mb: 6,
            fontWeight: 700,
            color: '#006BB8',
          }}
        >
          What Developers Say
        </Typography>
        
        <Box
          ref={scrollContainerRef}
          sx={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            pb: 4,
          }}
        >
          {testimonials.map((testimonial, index) => (
            <Box
              key={index}
              sx={{
                scrollSnapAlign: 'center',
                flexShrink: 0,
              }}
            >
              <TestimonialCard
                testimonial={testimonial}
                isActive={index === 0}
              />
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default Testimonials; 