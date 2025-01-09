import { useParams } from "react-router-dom"
import { useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import TabPanel from "./TabPanel"
import { useSwitchPage } from "./App"
import { TileButton, TileContainer } from "./Tile"
import { Typography } from "@mui/material"

export default function Course({ tabIndex }: {
    tabIndex: number
}) {
    const { schoolId, yearGroupId, courseId } = useParams()
    const switchPage = useSwitchPage()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const courseInfo = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)

    useSetPageTitle(courseInfo?.name ?? 'Course')

    if (courseInfo) {
        return <TabPanel index={tabIndex} tabs={[
            {
                label: 'Feed',
                heading: `Posts to ${courseInfo.name}`,
                onSelect: () => switchPage('feed', schoolId, yearGroupId, courseId, undefined, true),
                value: 'Hello'
            },
            {
                label: 'Work',
                heading: `Work for ${courseInfo.name}`,
                onSelect: () => switchPage('work', schoolId, yearGroupId, courseId, undefined, true),
                value: 'World'
            },
            {
                label: 'Classes',
                heading: `Classes in ${courseInfo.name}`,
                onSelect: () => switchPage('classes', schoolId, yearGroupId, courseId, undefined, true),
                value: courseInfo?.classes.length > 0
                    ? <TileContainer>
                        {courseInfo?.classes.map(cls => (
                            <TileButton key={cls.id} text={cls.name} onClick={() => switchPage('', schoolId, yearGroupId, courseId, cls.id)} />
                        ))}
                    </TileContainer>
                    : <Typography>No classes</Typography>
            }
        ]} />
    }
}
