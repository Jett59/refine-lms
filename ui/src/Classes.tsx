import { useParams } from "react-router-dom"
import { useSchool } from "./DataContext"
import PageWrapper from "./PageWrapper"

export default function Classes() {
    const { schoolId } = useParams()
    const schoolInfo = useSchool(schoolId ?? 'missing id')

    return <PageWrapper title={schoolInfo?.name ?? 'School'}>
        <span>Hi</span>
    </PageWrapper>
}
