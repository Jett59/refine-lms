import { useParams } from "react-router-dom"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import TabPanel from "./TabPanel"
import { useSwitchPage } from "./App"
import { TileButton, TileContainer } from "./Tile"
import { Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from "@mui/material"
import Feed from "./Feed"
import { useState } from "react"
import { CourseInfo, SchoolInfo } from "../../data/school"
import { getClassNotificationCount } from "./Class"

function AddClassTileButton({ onClick }: { onClick: (name: string) => void }) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [name, setName] = useState('')

    return <>
        <TileButton onClick={() => setDialogOpen(true)} buttonProps={{ 'aria-label': "Add class" }} text="+" />
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Create a new class</DialogTitle>
            <DialogContent>
                <TextField
                    autoComplete="off"
                    label="Class name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    helperText="e.g. '12SFW1'"
                />
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={() => {
                    onClick(name)
                    setDialogOpen(false)
                }}>Create</Button>
            </DialogActions>
        </Dialog>
    </>
}

function ClassesPanelValue({ onCreate, schoolInfo, courseInfo, schoolId, yearGroupId }: {
    onCreate: (name: string) => void
    schoolInfo: SchoolInfo
    courseInfo: CourseInfo
    schoolId: string
    yearGroupId: string
}) {
    const switchPage = useSwitchPage()
    const isTeacherOrAdministrator = useIsTeacherOrAdministrator(schoolInfo)

    return <TileContainer>
        {courseInfo.classes.map(cls => {
            const notificationCount = getClassNotificationCount(cls)
            let buttonAriaLabel
            if (notificationCount) {
                buttonAriaLabel = `${cls.name} (${notificationCount} join request${notificationCount !== 1 ? 's' : ''})`
            } else {
                buttonAriaLabel = cls.name
            }
            return <Badge
                key={cls.id}
                badgeContent={notificationCount ? <Typography aria-hidden>{notificationCount}</Typography> : undefined}
            >
                <TileButton
                    text={cls.name}
                    onClick={() => switchPage('', schoolId, yearGroupId, courseInfo.id, cls.id)}
                    buttonProps={{ 'aria-label': buttonAriaLabel }}
                />
            </Badge>
        })}
        {isTeacherOrAdministrator && <AddClassTileButton onClick={onCreate} />
        }
    </TileContainer>
}

export default function Course({ tab }: {
    tab: 'feed' | 'work',
}) {
    const tabIndex = tab === 'feed' ? 0 : 1

    const { schoolId, yearGroupId, courseId } = useParams()
    const switchPage = useSwitchPage()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const courseInfo = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)

    const { createClass } = useData()

    useSetPageTitle(courseInfo?.name ?? '')

    if (!schoolId || !yearGroupId || !courseId) {
        return <Typography>Missing some ids?</Typography>
    }
    if (!schoolInfo) {
        return <Typography>Loading...</Typography>
    }
    if (!courseInfo) {
        return <Typography>Course not found</Typography>
    }

    return <Stack direction="column" spacing={2}>
        <Typography variant="h4">Classes in {courseInfo.name}</Typography>
        <ClassesPanelValue onCreate={name => createClass(schoolId, yearGroupId, courseId, name)} schoolInfo={schoolInfo} courseInfo={courseInfo} schoolId={schoolId} yearGroupId={yearGroupId} />
        <Divider />
        <TabPanel index={tabIndex} tabs={[
            {
                label: 'Feed',
                onSelect: () => switchPage('feed', schoolId, yearGroupId, courseId, undefined, true),
                value: <Feed schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} />
            },
            {
                label: 'Work',
                heading: `Work for ${courseInfo.name}`,
                onSelect: () => switchPage('work', schoolId, yearGroupId, courseId, undefined, true),
                value: 'World'
            }
        ]} />
    </Stack>
}
