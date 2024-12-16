import { Button, createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { useUser } from './UserContext';
import { Route, Routes } from 'react-router-dom';

function App() {
  const theme = createTheme();

  const { loggedIn, login } = useUser();

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    {loggedIn ?
      <Routes>
        <Route index element={<Button>Logged in</Button>} />
      </Routes>
      :
      <Button onClick={() => login()}>Login</Button>
    }
  </ThemeProvider>
}

export default App
