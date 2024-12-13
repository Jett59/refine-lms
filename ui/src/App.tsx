import { Button, createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { useUser } from './UserContext';

function App() {
  const theme = createTheme();

  const { login, name, profile_picture_url } = useUser();

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <p>{name}</p>
    {profile_picture_url && <img src={profile_picture_url}></img>}
    <Button onClick={() => login()}>Log in</Button>
  </ThemeProvider>
}

export default App
