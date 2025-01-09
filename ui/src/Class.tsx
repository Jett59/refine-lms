import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import { Badge, Typography } from "@mui/material"
import { ClassPeopleView } from "./People"
import { useSwitchPage } from "./App"
import TabPanel from "./TabPanel"

export default function Class({ defaultTab }: {
    defaultTab?: 'feed' | 'work' | 'people'
}) {
    const { schoolId, yearGroupId, courseId, classId } = useParams()
    const switchPage = useSwitchPage()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const cls = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)?.classes.find(cls => cls.id === classId)

    const tabIndex = (!defaultTab || defaultTab === 'feed') ? 0 : defaultTab === 'work' ? 1 : 2

    useSetPageTitle(cls?.name ?? 'Class')

    if (!schoolId || !yearGroupId || !courseId || !classId) {
        return <Typography>Missing some ids?</Typography>
    }
    if (!schoolInfo) {
        return <Typography>Loading...</Typography>
    }
    if (!cls) {
        return <Typography>Class not found</Typography>
    }

    let peopleTabLabel
    let peopleTabAriaLabel
    if (cls.requestingStudentIds.length > 0) {
        peopleTabLabel = <Badge badgeContent={cls.requestingStudentIds.length}>People</Badge>
        peopleTabAriaLabel = `People (${cls.requestingStudentIds.length} join request${cls.requestingStudentIds.length === 1 ? '' : 's'})`
    } else {
        peopleTabLabel = 'People'
    }

    return <TabPanel index={tabIndex} tabs={[
        {
            label: 'Feed',
            onSelect: () => switchPage('feed', schoolId, yearGroupId, courseId, classId, true),
            value: "Hello"
        },
        {
            label: 'Work',
            onSelect: () => switchPage('work', schoolId, yearGroupId, courseId, classId, true),
            value: "World"
        },
        {
            label: peopleTabLabel,
            ariaLabel: peopleTabAriaLabel,
            onSelect: () => switchPage('people', schoolId, yearGroupId, courseId, classId, true),
            value: <ClassPeopleView schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={classId} />
        }
    ]} />
}
