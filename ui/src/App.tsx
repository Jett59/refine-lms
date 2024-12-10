import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';

function App() {
  const theme = createTheme();
  const [info, setInfo] = useState('');

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <p>{info}</p>
    <GoogleLogin onSuccess={res => setInfo(JSON.stringify(res))} onError={console.error} />
  </ThemeProvider>
}

export default App
