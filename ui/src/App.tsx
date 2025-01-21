import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Banner from './Banner';
import { useUser } from './UserContext';
import Welcome from './Welcome';
import Schools from './Schools';
import School from './School';
import { useCallback } from 'react';
import { SchoolPeoplePage } from './People';
import Class from './Class'
import WithSidebar from './WithSidebar';
import PageWrapper from './PageWrapper';
import Course from './Course';

function App() {
  const theme = createTheme();

  const { loggedIn } = useUser()

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <Banner />
    <PageWrapper>
      {loggedIn ?
        <WithSidebar>
          <Routes>
            <Route index element={<Schools />} />
            <Route path="/:schoolId" element={<School />} ></Route>
            <Route path="/:schoolId/people" element={<SchoolPeoplePage />} />
            <Route path="/:schoolId/years/:yearGroupId" element={<School />} />
            <Route path="/:schoolId/years/:yearGroupId/courses/:courseId" element={<Course tabIndex={0} />} />
            <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/feed" element={<Course tabIndex={0} />} />
            <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/work" element={<Course tabIndex={1} />} />
            <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/classes" element={<Course tabIndex={2} />} />
            <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/classes/:classId" element={<Class />} />
          </Routes>
        </WithSidebar>
        :
        <Welcome />
      }
    </PageWrapper>
  </ThemeProvider>
}

export default App

export function useCurrentSchoolId() {
  // We can't use useParams because the component may not be rendered in a Route
  // Instead, we have to do this messy trick with useLocation.
  const location = useLocation()
  const parts = location.pathname.split('/')
  return parts[1]
}

export function useSwitchSchool() {
  const navigate = useNavigate()

  return useCallback((schoolId: string) => navigate(`/${schoolId}`), [navigate])
}

export function useSwitchPage(): (page: string, schoolId?: string, yearGroupId?: string, courseId?: string, classId?: string, replace?: boolean) => void {
  const navigate = useNavigate()
  return useCallback((page, schoolId, yearGroupId, courseId, classId, replace) => {
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
    navigate(`${prefix}${page}`, { replace })
  }, [navigate])
}
