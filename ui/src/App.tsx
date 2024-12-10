import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { GoogleLogin } from '@react-oauth/google';
import { useEffect, useState } from 'react';
import { callApi } from './api';

function App() {
  const theme = createTheme();
  const [info, setInfo] = useState('');

  const [stuff, setStuff] = useState(null)

  useEffect(() => {
    callApi<any>('blah', "GET", '/').then(setStuff)
  }, [])

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <p>{info}</p>
    <p>{JSON.stringify(stuff)}</p>
    <GoogleLogin onSuccess={res => setInfo(JSON.stringify(res))} onError={console.error} />
  </ThemeProvider>
}

export default App
