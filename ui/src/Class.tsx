import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import { Typography } from "@mui/material"
import { ClassPeopleView } from "./People"
import { ClassInfo } from "../../data/school"
import { useSwitchPage } from "./App"
import TabPanel from "./TabPanel"

export default function Class() {
    const { schoolId, yearGroupId, courseId, classId } = useParams()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const course = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)
    const currentClass = course?.classes.find(cls => cls.id === classId)

    const switchPage = useSwitchPage()

    useSetPageTitle(currentClass?.name ?? '')

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
            label: cls.name,
            onSelect: () => {
                switchPage('', schoolId, yearGroupId, courseId, cls.id)
            },
            value: <ClassPeopleView schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={cls.id} />
        }))}
    />
}

export function getClassNotificationCount(cls: ClassInfo) {
    return cls.requestingStudentIds.length
}
