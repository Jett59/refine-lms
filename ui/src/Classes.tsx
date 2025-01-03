import { useParams } from "react-router-dom"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import PageWrapper from "./PageWrapper"
import { Button, CardActions, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Tab, Tabs, TextField, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import { CourseInfo } from "../../data/school"
import { TileButton, TileCard } from "./Tile"
import { Expand } from "@mui/icons-material"

function CourseView({ course }: { course: CourseInfo }) {
    const [expanded, setExpanded] = useState(false)

    return <TileCard>
        <CardContent>
            <Typography variant="h6">{course.name}</Typography>
        </CardContent>
        <CardActions>
            <IconButton aria-label={expanded ? 'Show classes' : 'Hide classes'} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
                <Expand /> {/* TODO: Flip upside down when already expanded */}
            </IconButton>
        </CardActions>
    </TileCard>
}

function CreateCourseTileButton({ onClick }: { onClick: (name: string) => void }) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [name, setName] = useState('')

useEffect(() => {
    if (dialogOpen) {
        setName('')
    }
}, [dialogOpen])

    return <>
        <TileButton onClick={() => setDialogOpen(true)} text="+" buttonProps={{"aria-label": 'New course'}} />
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Create a new course</DialogTitle>
            <DialogContent>
                <TextField label="Course name" value={name} onChange={e => setName(e.target.value)} />
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

function CreateYearGroupButton({ onCreate, buttonText }: { onCreate: (name: string) => void, buttonText?: string }) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [name, setName] = useState('')

    return <>
        <Button aria-label={buttonText ?? 'New year group'} onClick={() => setDialogOpen(true)}>{buttonText ?? '+'}</Button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Create a new year group</DialogTitle>
            <DialogContent>
                <TextField label="Year group name" value={name} onChange={e => setName(e.target.value)} />
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={() => {
                    onCreate(name)
                    setDialogOpen(false)
                }}>Create</Button>
            </DialogActions>
        </Dialog>
    </>
}

export default function Classes() {
    const { schoolId } = useParams()
    const schoolInfo = useRelevantSchoolInfo(schoolId ?? 'missing id')
    const isAdministratorOrTeacher = useIsTeacherOrAdministrator(schoolInfo)
    const { createYearGroup, createCourse } = useData()

    const [selectedYearGroupIndex, setSelectedYearGroupIndex] = useState<number>(0)

    if (!schoolId) {
        return <PageWrapper title="School">
            <Typography>No school chosen?</Typography>
        </PageWrapper>
    }
    if (!schoolInfo) {
        return <PageWrapper title="School">
            <Typography>Loading...</Typography>
        </PageWrapper>
    }

    if (schoolInfo?.yearGroups.length === 0) {
        if (isAdministratorOrTeacher) {
            return <PageWrapper title={schoolInfo?.name ?? 'School'}>
                <CreateYearGroupButton onCreate={name => createYearGroup(schoolId, name)} buttonText="Create a year group to get started" />
            </PageWrapper>
        }
        return <PageWrapper title={schoolInfo?.name ?? 'School'}>
            <Typography>You are not currently a member of a class</Typography>
        </PageWrapper>
    }

    const currentYearGroup = schoolInfo.yearGroups[selectedYearGroupIndex]

    return <PageWrapper title={schoolInfo?.name ?? 'School'}>
        <Tabs value={selectedYearGroupIndex} onChange={(_e, newValue) => setSelectedYearGroupIndex(newValue)} aria-label="Year groups">
            {schoolInfo.yearGroups.map(yearGroup => <Tab id={`year-group-tab-${yearGroup.id}`} key={yearGroup.id} label={yearGroup.name} />)}
            {isAdministratorOrTeacher && <CreateYearGroupButton onCreate={name => createYearGroup(schoolId, name)} />}
        </Tabs>
        <div role="tabpanel" aria-labelledby={`year-group-tab-${currentYearGroup.id}`}>
            <Typography variant="h5">{currentYearGroup.name}</Typography>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                {currentYearGroup.courses.map(course => <CourseView key={course.id} course={course} />)}
                {isAdministratorOrTeacher && <CreateCourseTileButton onClick={name => createCourse(schoolId, currentYearGroup.id, name)} />}
            </Stack>
        </div>
    </PageWrapper>
}
