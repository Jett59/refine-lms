import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import { useEffect, useState } from "react"
import { Badge, Stack, Tab, Tabs, Typography } from "@mui/material"
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
        setTabIndex(defaultTabIndex)
    }, [defaultTabIndex])

    useEffect(() => {
        switch (tabIndex) {
            case 0:
                switchPage('feed', schoolId, yearGroupId, courseId, classId, true)
                break
            case 1:
                switchPage('work', schoolId, yearGroupId, courseId, classId, true)
                break
            case 2:
                switchPage('people', schoolId, yearGroupId, courseId, classId, true)
                break
        }
    }, [tabIndex, schoolId, yearGroupId, courseId, classId, switchPage])

useSetPageTitle(cls?.name ?? 'Class')

    if (!schoolId || !yearGroupId || !courseId || !classId) {
        return <Typography>Missing some ids?</Typography>
    }
    if (!schoolInfo) {
        return <Typography>Loading...</Typography>
    }
    if (!cls) {
        return <Typography>Class not found</Typography>
    }

    let peopleTab
    if (cls.requestingStudentIds.length > 0) {
        peopleTab = <Tab
        aria-label={`PEOPLE (${cls.requestingStudentIds.length} join request${cls.requestingStudentIds.length !== 1 ? 's' : ''})`}
        label={<Badge badgeContent={cls.requestingStudentIds.length}>People</Badge>}
        id="tab-2"
        />
} else {
        peopleTab = <Tab label="People" id="tab-2" />
    }

    return <Stack direction="column">
        <Tabs value={tabIndex} onChange={(_, newValue) => setTabIndex(newValue)}>
            <Tab label="Feed" id="tab-0" />
            <Tab label="Work" id="tab-1" />
            {peopleTab}
        </Tabs>
        <div role="tabpanel" aria-labelledby={`tab-${tabIndex}`}>
            {tabIndex === 0 && "Hello"}
            {tabIndex === 1 && "World"}
            {tabIndex === 2 && <ClassPeopleView schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={classId} />}
        </div>
    </Stack>
}
