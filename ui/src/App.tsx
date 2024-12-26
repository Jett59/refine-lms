import { Button, createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { Route, Routes } from 'react-router-dom';
import Banner from './Banner';

function App() {
  const theme = createTheme();

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <Banner />
      <Routes>
        <Route index element={<Button>TODO</Button>} />
      </Routes>
  </ThemeProvider>
}

export default App
