import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import { Typography } from "@mui/material"
import { ClassPeopleView } from "./People"

export default function Class() {
    const { schoolId, yearGroupId, courseId, classId } = useParams()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const cls = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)?.classes.find(cls => cls.id === classId)

    useSetPageTitle(cls?.name ?? 'Class')

    if (!yearGroupId || !courseId || !classId) {
        return <Typography>Class not found</Typography>
    }
    if (!schoolInfo) {
        return <Typography>Loading...</Typography>
    }
    if (!cls) {
        return <Typography>Class not found</Typography>
    }

    return <ClassPeopleView schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={classId} />
}
