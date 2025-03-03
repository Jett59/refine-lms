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
import PageWrapper from './PageWrapper';
import Course from './Course';
import Post from './Post';
import CreateAssignment from './CreateAssignment';

function App() {
  const theme = createTheme();

  const { loggedIn } = useUser()

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <Banner />
    <PageWrapper>
      {loggedIn ?
        <Routes>
          <Route index element={<Schools />} />
          <Route path="/:schoolId" element={<School />} ></Route>
          <Route path="/:schoolId/people" element={<SchoolPeoplePage />} />
          <Route path="/:schoolId/years/:yearGroupId" element={<School />} />
          <Route path="/:schoolId/years/:yearGroupId/posts/:postId" element={<Post />} />
          <Route path="/:schoolId/years/:yearGroupId/courses/:courseId" element={<Course tab="feed" />} />
          <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/feed" element={<Course tab="feed" />} />
          <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/work" element={<Course tab="work" />} />
          <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/create-assignment" element={<CreateAssignment />} />
          <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/posts/:postId" element={<Post />} />
          <Route path="/:schoolId/years/:yearGroupId/courses/:courseId/classes/:classId?" element={<Class />} />
        </Routes>
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

export interface LocationParts {
  schoolId?: string
  yearGroupId?: string
  courseId?: string
  classId?: string
  postId?: string
  page?: string
}

export function useLocationParts() {
  const location = useLocation()
  const rawParts = location.pathname.split('/')
  let parts: LocationParts = {}
  if (rawParts.length >= 2) {
    parts.schoolId = rawParts[1]
  }
  if (rawParts.length >= 4 && rawParts[2] === 'years') {
    parts.yearGroupId = rawParts[3]
  }
  if (rawParts.length >= 6 && rawParts[4] === 'courses') {
    parts.courseId = rawParts[5]
  }
  if (rawParts.length >= 8 && rawParts[6] === 'classes') {
    parts.classId = rawParts[7]
  }
  // This part could appear after any of the sections above
  if (rawParts.includes('posts')) {
    parts.postId = rawParts[rawParts.indexOf('posts') + 1]
  }
  // So far, this is the only trailing path component which represents a separate page
  // The feed/work tab also uses paths so we can't assume that the final part is a separate page
  // TODO: work out a way of finding these out without hardcoding them
  if (rawParts.length === 3 && rawParts[2] === 'people') {
    parts.page = 'people'
  }
  return parts
}

export function useSwitchSchool() {
  const navigate = useNavigate()

  return useCallback((schoolId: string) => navigate(`/${schoolId}`), [navigate])
}

export function getLocation(page: string, schoolId?: string, yearGroupId?: string, courseId?: string, classId?: string, postId?: string) {
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
  if (postId) {
    prefix += `posts/${postId}/`
  }
  return `${prefix}${page}`
}

export function useSwitchPage(): (page: string, schoolId?: string, yearGroupId?: string, courseId?: string, classId?: string, postId?: string, replace?: boolean) => void {
  const navigate = useNavigate()
  return useCallback((page, schoolId, yearGroupId, courseId, classId, postId, replace) => {
    navigate(getLocation(page, schoolId, yearGroupId, courseId, classId, postId), { replace })
  }, [navigate])
}
