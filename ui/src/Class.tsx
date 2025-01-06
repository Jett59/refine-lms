import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import PageWrapper from "./PageWrapper"
import { useState } from "react"
import { Tab, Tabs } from "@mui/material"

export default function Class() {
    const { schoolId, yearGroupId, courseId, classId } = useParams()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const cls = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)?.classes.find(cls => cls.id === classId)

    const [tabIndex, setTabIndex] = useState(0)

    if (!schoolInfo) {
        return <PageWrapper title="Class">Loading...</PageWrapper>
    }
    if (!cls) {
        return <PageWrapper title="Class">Class not found</PageWrapper>
    }

    return <PageWrapper title={cls?.name}>
        <Tabs value={tabIndex} onChange={(_, newValue) => setTabIndex(newValue)}>
            <Tab label="Feed" id="tab-0" />
            <Tab label="Work" id="tab-1" />
            <Tab label="People" id="tab-2" />
        </Tabs>
        <div role="tabpanel" aria-labelledby={`tab-${tabIndex}`}>
            yes
        </div>
    </PageWrapper>
}
