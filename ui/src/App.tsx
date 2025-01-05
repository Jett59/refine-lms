import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { Route, Routes, useNavigate } from 'react-router-dom';
import Banner from './Banner';
import { useUser } from './UserContext';
import Welcome from './Welcome';
import Schools from './Schools';
import School from './School';
import { useCallback } from 'react';
import People from './People';
import Class from './Class';

function App() {
  const theme = createTheme();

  const { loggedIn } = useUser()

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <Banner />
    {loggedIn ?
      <Routes>
        <Route index element={<Schools />} />
        <Route path="/:schoolId" element={<School />} ></Route>
        <Route path="/:schoolId/people" element={<People />} />
        <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/classes/:classId" element={<Class />} />
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

export function useSwitchPage(): (page: string, schoolId?: string, yearGroupId?: string, courseId?: string, classId?: string) => void {
  const navigate = useNavigate()
  return useCallback((page, schoolId, yearGroupId, courseId, classId) => {
    let prefix = '/'
    if (schoolId) {
      prefix += `${schoolId}/`
    }
    if (yearGroupId) {
      prefix += `years/${yearGroupId}/`
    }
    if (courseId) {
      prefix += `courses/${courseId}/`
    }
    if (classId) {
      prefix += `classes/${classId}/`
    }
    navigate(`${prefix}${page}`)
  }, [navigate])
}
