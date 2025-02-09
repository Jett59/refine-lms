import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle, useSetPageTitleButtons } from "./PageWrapper"
import TabPanel from "./TabPanel"
import { useSwitchPage } from "./App"
import { IconButton, Stack, Tooltip, Typography } from "@mui/material"
import Feed from "./Feed"
import { People } from "@mui/icons-material"

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
    if (schoolId && yearGroupId && courseId) {
        return <Tooltip title="Classes">
            <IconButton
            onClick={() => switchPage('classes', schoolId, yearGroupId, courseId)}
            >
                <People />
            </IconButton>
        </Tooltip>
    }
}, [schoolId, yearGroupId, courseId])

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
                onSelect: () => switchPage('feed', schoolId, yearGroupId, courseId, undefined, true),
                value: <Feed schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} />
            },
            {
                label: 'Work',
                heading: `Work for ${courseInfo.name}`,
                onSelect: () => switchPage('work', schoolId, yearGroupId, courseId, undefined, true),
                value: 'work'
            }
        ]} />
    </Stack>
}
