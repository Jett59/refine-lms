import { Box, Breadcrumbs, Paper, Stack, Typography, useTheme } from "@mui/material"
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react"
import { getLocation, useLocationParts } from "./App";
import { useRelevantSchoolInfo } from "./DataContext";
import { Link } from "react-router-dom";
import { useUser } from "./UserContext";

const paddingMargins = '10px';

function PageWrapperBreadcrumb({ schoolId, yearGroupId, courseId, classId, isLast }: {
    schoolId?: string
    yearGroupId?: string
    courseId?: string
    classId?: string
    isLast?: boolean
}) {
    const school = useRelevantSchoolInfo(schoolId)
    const yearGroup = yearGroupId ? school?.yearGroups.find(yearGroup => yearGroup.id === yearGroupId) : null
    const course = courseId ? yearGroup?.courses.find(course => course.id === courseId) : null
    const cls = classId ? course?.classes.find(cls => cls.id === classId) : null

    let text
    if (classId) {
        text = cls?.name
    } else if (courseId) {
        text = course?.name
    } else if (yearGroupId) {
        text = yearGroup?.name
    } else if (schoolId) {
        text = school?.name
    } else {
        text = 'Schools'
    }
    if (!text) {
        return <Typography>Loading...</Typography>
    }
    if (isLast) {
        return <Typography>{text}</Typography>
    }
    return <Link to={getLocation('', schoolId, yearGroupId, courseId, classId)}>{text}</Link>
}

function PageWrapperBreadcrumbs() {
    const { schoolId, yearGroupId, courseId, classId } = useLocationParts()

    if (!schoolId) {
        return null
    }

    return <Breadcrumbs aria-label="Breadcrumb">
        <PageWrapperBreadcrumb isLast={!schoolId} />
        {schoolId && <PageWrapperBreadcrumb schoolId={schoolId} isLast={!yearGroupId} />}
        {yearGroupId && <PageWrapperBreadcrumb schoolId={schoolId} yearGroupId={yearGroupId} isLast={!courseId} />}
        {courseId && <PageWrapperBreadcrumb schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} isLast={!classId} />}
        {classId && <PageWrapperBreadcrumb schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} classId={classId} isLast />}
    </Breadcrumbs>
}

interface PageWrapperContextValue {
    changeTitle: (title: string) => void
    changeTitleButtons: (buttons: ReactNode) => void
}

const PageWrapperContext = createContext<PageWrapperContextValue>({ changeTitle: () => { }, changeTitleButtons: () => { } })

export default function PageWrapper({ children }: {
    children: ReactNode
}) {
    const theme = useTheme()
    const [title, setTitle] = useState('')
    const [titleButtons, setTitleButtons] = useState<ReactNode | null>(null)

    useEffect(() => {
        document.title = title
    }, [title])

    const { loggedIn } = useUser()

    return <Box position="static">
        <Box paddingLeft={paddingMargins} paddingRight={paddingMargins} bgcolor={theme.palette.primary.light} paddingTop={'32px'} paddingBottom={'48px'}>
            <Stack direction="column" spacing={2}>
                <Stack direction="row" spacing={2}>
                    <Typography aria-live="polite" variant="h4" align="center">{title}</Typography>
                    {titleButtons}
                </Stack>
                {loggedIn && <PageWrapperBreadcrumbs />}
            </Stack>
        </Box>
        <Box paddingLeft={paddingMargins} paddingRight={paddingMargins} position={'relative'} style={{ top: '-20px' }}>
            <Paper elevation={2} sx={{ minHeight: '500px', padding: paddingMargins }}>
                <PageWrapperContext.Provider value={{
                    changeTitle: useMemo(() => setTitle, []),
                    changeTitleButtons: useMemo(() => setTitleButtons, [])
                }}>
                    {children}
                </PageWrapperContext.Provider>
            </Paper>
        </Box>
    </Box>
}

export function useSetPageTitle(title: string) {
    const { changeTitle } = useContext(PageWrapperContext)
    useEffect(() => {
        changeTitle(title)
    }, [changeTitle, title])
}

export function useSetPageTitleButtons(buttonSupplier: () => ReactNode, deps: any[]) {
    const buttons = useMemo(buttonSupplier, deps)

    const { changeTitleButtons } = useContext(PageWrapperContext)
    useEffect(() => {
        changeTitleButtons(buttons)
        return () => changeTitleButtons(null)
    }, [changeTitleButtons, buttons])
}
