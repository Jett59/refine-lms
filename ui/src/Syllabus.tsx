import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, List, ListItem, Stack, Typography } from "@mui/material"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import { useState } from "react"
import { Remove } from "@mui/icons-material"
import MaximumLengthTextBox from "./MaximumLengthTextBox"

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
                    <MaximumLengthTextBox
                        maximumLength={350}
                        autoComplete="off"
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

function AddOutcomeButton({ callback }: {
    callback: (name: string, description: string) => Promise<void>
}) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [callingApi, setCallingApi] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')

    return <>
        <Button
            aria-label='Add'
            onClick={() => setDialogOpen(true)}
        >+</Button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Add Syllabus Outcome</DialogTitle>
            <DialogContent >
                <Box padding={1}>
                    <Stack direction="row" spacing={2}>
                        <MaximumLengthTextBox
                            maximumLength={50}
                            autoComplete="off"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            label="Name"
                            disabled={callingApi}
                        />
                        <MaximumLengthTextBox
                            maximumLength={350}
                            autoComplete="off"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            label="Description"
                            disabled={callingApi}
                        />
                    </Stack>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={callingApi}>
                    Cancel
                </Button>
                <Button variant="contained" disabled={callingApi} onClick={async () => {
                    setCallingApi(true)
                    await callback(name, description)
                    setCallingApi(false)
                    setName('')
                    setDescription('')
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
    const { addSyllabusContent, removeSyllabusContent, addSyllabusOutcome, removeSyllabusOutcome } = useData()
    const school = useRelevantSchoolInfo(schoolId)
    const yearGroup = school?.yearGroups.find(yg => yg.id === yearGroupId)
    const course = yearGroup?.courses.find(c => c.id === courseId)

    const isTeacherOrAdministrator = useIsTeacherOrAdministrator(school)

    const [removingContent, setRemovingContent] = useState(false)
    const [removingOutcome, setRemovingOutcome] = useState(false)

    return <Stack direction="column">
        <Typography variant="h6">Content</Typography>
        <List>
            {course?.syllabusContent.map((content, index) => (
                <ListItem
                    key={index}
                    secondaryAction={isTeacherOrAdministrator && <IconButton
                        aria-label={`Remove '${content.content}'`}
                        disabled={removingContent}
                        onClick={async () => {
                            setRemovingContent(true)
                            await removeSyllabusContent(schoolId, yearGroupId, courseId, content.id)
                            setRemovingContent(false)
                        }}
                    >
                        <Remove />
                    </IconButton>
                    }
                >{content.content}</ListItem>
            ))}
        </List>
        {isTeacherOrAdministrator &&
            <AddContentButton callback={async content => {
                await addSyllabusContent(schoolId, yearGroupId, courseId, content)
            }} />
        }
        <Divider />
        <Typography variant="h6">Outcomes</Typography>
        <List>
            {course?.syllabusOutcomes.map((outcome, index) => (
                <ListItem
                    key={index}
                    secondaryAction={isTeacherOrAdministrator && <IconButton
                        aria-label={`Remove '${outcome.name}'`}
                        disabled={removingOutcome}
                        onClick={async () => {
                            setRemovingOutcome(true)
                            await removeSyllabusOutcome(schoolId, yearGroupId, courseId, outcome.id)
                            setRemovingOutcome(false)
                        }}
                    >
                        <Remove />
                    </IconButton>
                    }
                >{`${outcome.name}: ${outcome.description}`}</ListItem>
            ))}
        </List>
        {isTeacherOrAdministrator &&
            <AddOutcomeButton callback={async (name, description) => {
                await addSyllabusOutcome(schoolId, yearGroupId, courseId, name, description)
            }} />
        }
    </Stack>
}
