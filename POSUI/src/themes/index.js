import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3B5BDB',
      light: '#4C6EF5',
      dark: '#2248C7',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#12B886',
      light: '#20C997',
      dark: '#0CA678',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#2F9E44',
      light: '#40C057',
      dark: '#2B8A3E',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F59F00',
      light: '#FAB005',
      dark: '#E67700',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#E03131',
      light: '#FA5252',
      dark: '#C92A2A',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#1C7ED6',
      light: '#228BE6',
      dark: '#1864AB',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F7FB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
    },
    divider: '#E3E8EF',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h1: { fontSize: '28px', fontWeight: 700, color: '#1F2937' },
    h2: { fontSize: '24px', fontWeight: 600, color: '#1F2937' },
    h3: { fontSize: '20px', fontWeight: 600, color: '#1F2937' },
    h4: { fontSize: '18px', fontWeight: 600, color: '#1F2937' },
    h5: { fontSize: '16px', fontWeight: 600, color: '#1F2937' },
    h6: { fontSize: '14px', fontWeight: 600, color: '#1F2937' },
    body1: { fontSize: '14px', lineHeight: 1.5, color: '#1F2937' },
    body2: { fontSize: '13px', lineHeight: 1.43, color: '#6B7280' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 18px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 6px rgba(59, 91, 219, 0.2)',
          },
        },
        containedPrimary: {
          backgroundColor: '#3B5BDB',
          '&:hover': {
            backgroundColor: '#2248C7',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid #E3E8EF',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 10,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '13px',
          borderColor: '#E3E8EF',
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#F8FAFC',
          color: '#4B5563',
        },
      },
    },
  },
});
