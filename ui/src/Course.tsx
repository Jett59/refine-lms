import { useParams } from "react-router-dom"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import TabPanel from "./TabPanel"
import { useSwitchPage } from "./App"
import { TileButton, TileContainer } from "./Tile"
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material"
import Feed from "./Feed"
import { useState } from "react"

function AddClassTileButton({ onClick }: { onClick: (name: string) => void }) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [name, setName] = useState('')

    return <>
        <TileButton onClick={() => setDialogOpen(true)} buttonProps={{ 'aria-label': "New class" }} text="+" />
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Create a new class</DialogTitle>
            <DialogContent>
                <TextField label="Class name" value={name} onChange={e => setName(e.target.value)} />
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

export default function Course({ tabIndex }: {
    tabIndex: number
}) {
    const { schoolId, yearGroupId, courseId } = useParams()
    const switchPage = useSwitchPage()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const courseInfo = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)

    const { createClass } = useData()

    const isTeacherOrAdministrator = useIsTeacherOrAdministrator(schoolInfo)

    useSetPageTitle(courseInfo?.name ?? 'Course')

    if (!schoolId || !yearGroupId || !courseId) {
        return <Typography>Missing some ids?</Typography>
    }

    if (courseInfo) {
        return <TabPanel index={tabIndex} tabs={[
            {
                label: 'Feed',
                heading: `Posts to ${courseInfo.name}`,
                onSelect: () => switchPage('feed', schoolId, yearGroupId, courseId, undefined, true),
                value: <Feed schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} />
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
                value: <TileContainer>
                        {courseInfo?.classes.map(cls => (
                            <TileButton key={cls.id} text={cls.name} onClick={() => switchPage('', schoolId, yearGroupId, courseId, cls.id)} />
                        ))}
                        {isTeacherOrAdministrator && <AddClassTileButton onClick={name => {
                            createClass(schoolId, yearGroupId, courseId, name)
                        }} />
                        }
                    </TileContainer>
            }
        ]} />
    }
}
