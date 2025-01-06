import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import PageWrapper from "./PageWrapper"
import { useEffect, useState } from "react"
import { Tab, Tabs } from "@mui/material"
import { ClassPeopleView } from "./People"
import { useSwitchPage } from "./App"

export default function Class({ defaultTab }: {
    defaultTab?: 'feed' | 'work' | 'people'
}) {
    const { schoolId, yearGroupId, courseId, classId } = useParams()
    const switchPage = useSwitchPage()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const cls = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)?.classes.find(cls => cls.id === classId)

    const defaultTabIndex = (!defaultTab || defaultTab === 'feed') ? 0 : defaultTab === 'work' ? 1 : 2
    const [tabIndex, setTabIndex] = useState(defaultTabIndex)

useEffect(() => {
    switch (tabIndex) {
        case 0:
            switchPage('feed', schoolId, yearGroupId, courseId, classId)
            break
        case 1:
            switchPage('work', schoolId, yearGroupId, courseId, classId)
            break
        case 2:
            switchPage('people', schoolId, yearGroupId, courseId, classId)
            break
    }
}, [tabIndex, schoolId, yearGroupId, courseId, classId, switchPage])

    if (!schoolId || !yearGroupId || !courseId || !classId) {
        return <PageWrapper title="Class">Missing some ids?</PageWrapper>
    }
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
            {tabIndex === 0 && "Hello"}
            {tabIndex === 1 && "World"}
            {tabIndex === 2 && <ClassPeopleView schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={classId} />}
        </div>
    </PageWrapper>
}
