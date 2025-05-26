import { Box } from '@mui/material';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Testimonials from '../components/landing/Testimonials';
import Footer from '../components/landing/Footer';

const LandingPage = () => {
  return (
    <Box>
      <Hero />
      <Features />
      <Testimonials />
      <Footer />
    </Box>
  );
};

export default LandingPage; 