import { Button, createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { useUser } from './UserContext';
import { Route, Routes } from 'react-router-dom';
import { useAuthenticatedAPIs } from './api';

function App() {
  const theme = createTheme();

  const { loggedIn, login } = useUser();

const authenticatedAPIs = useAuthenticatedAPIs()

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <Button onClick={() => {
      authenticatedAPIs.call("GET", "try-it", undefined).then(console.log)
    }}>Try it</Button>
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
