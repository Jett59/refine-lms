import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { Route, Routes, useNavigate } from 'react-router-dom';
import Banner from './Banner';
import { useUser } from './UserContext';
import Welcome from './Welcome';
import Schools from './Schools';
import School from './School';
import { useCallback } from 'react';
import { SchoolPeoplePage } from './People';
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
        <Route path="/:schoolId/people" element={<SchoolPeoplePage />} />
        <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/classes/:classId" element={<Class />} />
        <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/classes/:classId/feed" element={<Class defaultTab='feed' />} />
        <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/classes/:classId/work" element={<Class defaultTab='work' />} />
        <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/classes/:classId/people" element={<Class defaultTab='people' />} />
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
