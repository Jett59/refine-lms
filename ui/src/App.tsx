import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { Route, Routes, useNavigate } from 'react-router-dom';
import Banner from './Banner';
import { useUser } from './UserContext';
import Welcome from './Welcome';
import NoSchool from './NoSchool';
import Classes from './Classes';
import { useCallback } from 'react';

function App() {
  const theme = createTheme();

  const { loggedIn } = useUser()

  return <ThemeProvider theme={theme}>

    <CssBaseline />
    <Banner />
    {loggedIn ?
      <Routes>
        <Route index element={<NoSchool />} />
        <Route path="/:schoolId" element={<Classes />} ></Route>
      </Routes>
      :
      <Welcome />
    }
  </ThemeProvider>
}

export default App

export function useSwitchSchool() {
  const navigate = useNavigate()
  return useCallback((schoolId: string) => navigate(`/${schoolId}`), [navigate])
}
