import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import PageWrapper from "./PageWrapper"

export default function Classes() {
    const { schoolId } = useParams()
    const schoolInfo = useRelevantSchoolInfo(schoolId ?? 'missing id')
    console.log(schoolInfo)
    return <PageWrapper title={schoolInfo?.name ?? 'School'}>
        <span>Hi</span>
    </PageWrapper>
}
