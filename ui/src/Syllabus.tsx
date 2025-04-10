import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, Stack, TextField, Typography } from "@mui/material"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import { useState } from "react"

function AddContentButton({ callback }: {
    callback: (content: string) => Promise<void>
}) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [callingApi, setCallingApi] = useState(false)
    const [content, setContent] = useState('')

    return <>
        <Button
            aria-label='Add'
            onClick={() => setDialogOpen(true)}
        >+</Button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Add Syllabus Content</DialogTitle>
            <DialogContent >
                <Box padding={1}>
                    <TextField
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        label="Content"
                        disabled={callingApi}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={callingApi}>
                    Cancel
                </Button>
                <Button variant="contained" disabled={callingApi} onClick={async () => {
                    setCallingApi(true)
                    await callback(content)
                    setCallingApi(false)
                    setContent('')
                    setDialogOpen(false)
                }}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    </>
}

export default function Syllabus({ schoolId, yearGroupId, courseId }: {
    schoolId: string
    yearGroupId: string
    courseId: string
}) {
    const { addSyllabusContent } = useData()
    const school = useRelevantSchoolInfo(schoolId)
    const yearGroup = school?.yearGroups.find(yg => yg.id === yearGroupId)
    const course = yearGroup?.courses.find(c => c.id === courseId)

    const isTeacherOrAdministrator = useIsTeacherOrAdministrator(school)

    return <Stack direction="column">
        <Typography variant="h6">Content</Typography>
        <List>
            {course?.syllabusContent.map((content, index) => (
                <ListItem key={index}>{content}</ListItem>
            ))}
        </List>
        {isTeacherOrAdministrator &&
            <AddContentButton callback={async content => {
                await addSyllabusContent(schoolId, yearGroupId, courseId, content)
            }} />
        }
    </Stack>
}
