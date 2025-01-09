import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import TabPanel from "./TabPanel"
import { useSwitchPage } from "./App"

export default function Course({tabIndex}: {
    tabIndex: number
}) {
    const { schoolId, yearGroupId, courseId } = useParams()
    const switchPage = useSwitchPage()
const schoolInfo = useRelevantSchoolInfo(schoolId)
const courseInfo = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)

useSetPageTitle(courseInfo?.name ?? 'Course')

    return <TabPanel index={tabIndex} tabs={[
        {
            label: 'Feed',
            onSelect: () => switchPage('feed', schoolId, yearGroupId, courseId, undefined, true),
            value: 'Hello'
        },
        {
            label: 'Work',
            onSelect: () => switchPage('work', schoolId, yearGroupId, courseId, undefined, true),
            value: 'World'
        },
        {
            label: 'Classes',
            onSelect: () => switchPage('classes', schoolId, yearGroupId, courseId, undefined, true),
            value: '!'
        }
    ]} />
}
