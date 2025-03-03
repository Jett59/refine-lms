import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle, useSetPageTitleButtons } from "./PageWrapper"
import TabPanel from "./TabPanel"
import { useSwitchPage } from "./App"
import { Badge, Box, IconButton, Stack, Tooltip, Typography } from "@mui/material"
import PostsList from "./Feed"
import { NotificationImportant, People } from "@mui/icons-material"
import { getHasNotifications } from "./Class"

export default function Course({ tab }: {
    tab: 'feed' | 'work',
}) {
    const tabIndex = tab === 'feed' ? 0 : 1

    const { schoolId, yearGroupId, courseId } = useParams()
    const switchPage = useSwitchPage()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const courseInfo = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)

    useSetPageTitle(courseInfo?.name ?? '')

    useSetPageTitleButtons(() => {
        if (schoolId && yearGroupId && courseId && courseInfo) {
            return <Tooltip title={"Classes" + (getHasNotifications(courseInfo) ? ' (has notifications)' : '')}>
                <IconButton
                    onClick={() => switchPage('classes', schoolId, yearGroupId, courseId)}
                >
                    <Badge badgeContent={getHasNotifications(courseInfo) ? <NotificationImportant /> : undefined}>
                        <Box padding={1}><People /></Box>
                    </Badge>
                </IconButton>
            </Tooltip>
        }
    }, [schoolId, yearGroupId, courseId, courseInfo])

    if (!schoolId || !yearGroupId || !courseId) {
        return <Typography>Missing some ids?</Typography>
    }
    if (!schoolInfo) {
        return <Typography>Loading...</Typography>
    }
    if (!courseInfo) {
        return <Typography>Course not found</Typography>
    }

    return <Stack direction="column" spacing={2}>
        <TabPanel index={tabIndex} tabs={[
            {
                label: 'Feed',
                onSelect: () => switchPage('feed', schoolId, yearGroupId, courseId, undefined, undefined, true),
                value: <PostsList schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} listType="feed" />
            },
            {
                label: 'Work',
                onSelect: () => switchPage('work', schoolId, yearGroupId, courseId, undefined, undefined, true),
                value: <PostsList schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} listType="work" />
            }
        ]} />
    </Stack>
}
