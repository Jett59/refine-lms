import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle, useSetPageTitleButtons } from "./PageWrapper"
import TabPanel from "./TabPanel"
import { useSwitchPage } from "./App"
import { Badge, Box, IconButton, Tooltip, Typography } from "@mui/material"
import PostsList from "./Feed"
import { NotificationImportant, People } from "@mui/icons-material"
import { getCourseNotifications } from "./Class"
import { useEffect } from "react"
import Syllabus from "./Syllabus"
// import Syllabus from "./Syllabus"

const PREFERED_TAB_LOCAL_STORAGE_PREFIX = 'course-prefered-tab-'

export default function Course({ tab }: {
    tab?: 'feed' | 'syllabus',
}) {
    const { schoolId, yearGroupId, courseId } = useParams()
    const switchPage = useSwitchPage()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const courseInfo = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)

    const notificationText = courseInfo ? getCourseNotifications(courseInfo).join(', ') : ''

    useSetPageTitle(courseInfo?.name ?? '')

    useSetPageTitleButtons(() => {
        if (schoolId && yearGroupId && courseId && courseInfo) {
            return <Tooltip title={notificationText || 'Classes'}>
                <IconButton
                    onClick={() => switchPage('classes', schoolId, yearGroupId, courseId)}
                >
                    <Badge badgeContent={getCourseNotifications(courseInfo).length > 0 ? <NotificationImportant /> : undefined}>
                        <Box padding={1}><People /></Box>
                    </Badge>
                </IconButton>
            </Tooltip>
        }
    }, [schoolId, yearGroupId, courseId, courseInfo])

    const preferredTab = localStorage.getItem(PREFERED_TAB_LOCAL_STORAGE_PREFIX + courseId)
    const tabIndex = (tab ?? preferredTab) === 'syllabus' ? 1 : 0

    useEffect(() => {
        if (tab && courseId) {
            localStorage.setItem(PREFERED_TAB_LOCAL_STORAGE_PREFIX + courseId, tab)
        }
    }, [courseId, tab])

    if (!schoolId || !yearGroupId || !courseId) {
        return <Typography>Missing some ids?</Typography>
    }
    if (!schoolInfo) {
        return <Typography>Loading...</Typography>
    }
    if (!courseInfo) {
        return <Typography>Course not found</Typography>
    }

    const enableSyllabus = false

    if (enableSyllabus) {
        return <TabPanel index={tabIndex} tabs={[
            {
                label: 'Feed',
                onSelect: () => switchPage('feed', schoolId, yearGroupId, courseId, undefined, undefined, true),
                value: <PostsList schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} listType="feed" />
            },
            {
                label: 'Syllabus',
                onSelect: () => switchPage('syllabus', schoolId, yearGroupId, courseId, undefined, undefined, true),
                value: <Syllabus schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} />
            }
        ]} />
    } else {
        return <PostsList schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} listType="feed" />
    }
}
