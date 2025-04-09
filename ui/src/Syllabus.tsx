import { useRelevantSchoolInfo } from "./DataContext"

export default function Syllabus({ schoolId, yearGroupId, courseId }: {
    schoolId: string
    yearGroupId: string
    courseId: string
}) {
    const school = useRelevantSchoolInfo(schoolId)
    const yearGroup = school?.yearGroups.find(yg => yg.id === yearGroupId)
    const course = yearGroup?.courses.find(c => c.id === courseId)

    return course?.name
}
