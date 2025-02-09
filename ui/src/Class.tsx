import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import { Badge, Typography } from "@mui/material"
import { ClassPeopleView } from "./People"
import { ClassInfo, CourseInfo } from "../../data/school"
import { useSwitchPage } from "./App"
import TabPanel from "./TabPanel"

function getClassNotificationCount(cls: ClassInfo) {
    return cls.requestingStudentIds.length
}

export function getHasNotifications(course: CourseInfo) {
    return course.classes.map(getClassNotificationCount).some(count => count > 0)
}

export default function Class() {
    const { schoolId, yearGroupId, courseId, classId } = useParams()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const course = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)
    const currentClass = course?.classes.find(cls => cls.id === classId)

    const switchPage = useSwitchPage()

    useSetPageTitle(course ? `Classes in ${course.name}` : '')

    if (!classId && course && course.classes.length > 0) {
        switchPage('', schoolId, yearGroupId, courseId, course.classes[0].id, true)
    }

    if (!yearGroupId || !courseId) {
        return <Typography>Class not found</Typography>
    }
    if (!schoolInfo || !course) {
        return <Typography>Loading...</Typography>
    }
    if (!currentClass) {
        return <Typography>Class not found</Typography>
    }

    const tabIndex = course.classes.indexOf(currentClass)

    return <TabPanel
        index={tabIndex}
        tabs={course.classes.map(cls => ({
            label: <Badge badgeContent={getClassNotificationCount(cls) || undefined}>{cls.name}</Badge>,
            ariaLabel: getClassNotificationCount(cls) ? `${cls.name} (${getClassNotificationCount(cls)})` : cls.name,
            onSelect: () => {
                switchPage('', schoolId, yearGroupId, courseId, cls.id, true)
            },
            heading: cls.name,
            value: <ClassPeopleView schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={cls.id} />
        }))}
    />
}
