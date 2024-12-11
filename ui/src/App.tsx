import { Button, createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { useUser } from './UserContext';

function App() {
  const theme = createTheme();

  const { login } = useUser();

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <Button onClick={() => login()}>Log in</Button>
  </ThemeProvider>
}

export default App
