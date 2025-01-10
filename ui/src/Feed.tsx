import { useRelevantSchoolInfo } from "./DataContext"

export default function Feed({ schoolId, /*yearGroupId, courseId, classId*/ }: {
    schoolId: string
    yearGroupId: string
    courseId: string
    classId?: string
}) {
    const schoolInfo = useRelevantSchoolInfo(schoolId)

    return schoolInfo?.name
}
