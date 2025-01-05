import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import PageWrapper from "./PageWrapper"

export default function Class() {
const {schoolId, yearGroupId, courseId, classId} = useParams()
const schoolInfo = useRelevantSchoolInfo(schoolId)
const cls = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)?.classes.find(cls => cls.id === classId)

if (!schoolInfo) {
    return <PageWrapper title="Class">Loading...</PageWrapper>
}
if (!cls) {
    return <PageWrapper title="Class">Class not found</PageWrapper>
}

    return <PageWrapper title={cls?.name}>yes</PageWrapper>
}
