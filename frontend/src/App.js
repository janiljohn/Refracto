import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import LandingPage from './pages/LandingPage';
import TicketsPage from './pages/TicketsPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#222', // black/dark grey
      dark: '#111',
      light: '#444',
      contrastText: '#fff',
    },
    background: {
      default: '#fafafa', // light grey
      paper: '#fff',
    },
    text: {
      primary: '#111',
      secondary: '#555',
    },
    divider: '#e0e0e0',
    action: {
      selected: '#f0f0f0',
      hover: '#f5f5f5',
    },
    error: {
      main: '#e53935',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
