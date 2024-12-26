import { Button, createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { Route, Routes } from 'react-router-dom';
import Banner from './Banner';
import { useUser } from './UserContext';
import Welcome from './Welcome';

function App() {
  const theme = createTheme();

  const { loggedIn } = useUser()

  return <ThemeProvider theme={theme}>

    <CssBaseline />
    <Banner />
    {loggedIn ?
      <Routes>
        <Route index element={<Button>TODO</Button>} />
      </Routes>
      :
      <Welcome />
    }
  </ThemeProvider>
}

export default App
