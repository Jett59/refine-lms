import { useParams } from "react-router-dom"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo, useSchoolStructure } from "./DataContext"
import PageWrapper from "./PageWrapper"
import { Button, CardActions, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Tab, Tabs, TextField, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import { CourseInfo, SchoolInfo } from "../../data/school"
import { TileButton, TileCard } from "./Tile"
import { ExpandMore, People } from "@mui/icons-material"
import { useSwitchPage } from "./App"

function JoinClassButton({schoolInfo, /*onSelect*/ }: {
    schoolInfo: SchoolInfo
    onSelect: (yearGroupId: string, courseId: string, classId: string) => void
}) {
const schoolStructure = useSchoolStructure(schoolInfo.id)

    const [selectDialogOpen, setSelectDialogOpen] = useState(false)

    return <>
        <Button onClick={() => setSelectDialogOpen(true)}>Join class</Button>
        <Dialog open={selectDialogOpen} onClose={() => setSelectDialogOpen(false)}>
            <DialogTitle>Join a class</DialogTitle>
            <DialogContent>
                {schoolStructure?.name}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setSelectDialogOpen(false)}>Cancel</Button>
            </DialogActions>
        </Dialog>
    </>
}

function AddClassButton({ onClick }: { onClick: (name: string) => void }) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [name, setName] = useState('')

    return <>
        <Button onClick={() => setDialogOpen(true)} aria-label="New class">+</Button>
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

function CourseView({ course, isAdministratorOrTeacher, newClass, goToClass }: {
    course: CourseInfo
    isAdministratorOrTeacher: boolean
    newClass: (name: string) => void
    goToClass: (classId: string) => void
}) {
    const [expanded, setExpanded] = useState(false)

    return <>
        <TileCard>
            <CardContent>
                <Typography variant="h6">{course.name}</Typography>
            </CardContent>
            <CardActions>
                {isAdministratorOrTeacher && <AddClassButton onClick={newClass} />}
                <IconButton aria-label={expanded ? 'Hide classes' : 'Show classes'} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
                    <ExpandMore sx={expanded ? { transform: 'rotate(180deg)' } : {}} />
                </IconButton>
            </CardActions>
        </TileCard>
        {expanded && course.classes.map(cls => (
            <TileButton
                key={cls.id}
                text={cls.name}
                onClick={() => goToClass(cls.id)}
            />
        ))}
    </>
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
        <TileButton onClick={() => setDialogOpen(true)} text="+" buttonProps={{ "aria-label": 'New course' }} />
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

export default function School() {
    const { schoolId } = useParams()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const isAdministratorOrTeacher = useIsTeacherOrAdministrator(schoolInfo)
    const { createYearGroup, createCourse, createClass } = useData()
    const switchPage = useSwitchPage()

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

    let title
    if (isAdministratorOrTeacher) {
        title = <Stack direction="row">
            <Typography>{schoolInfo.name}</Typography>
            <IconButton aria-label="People" onClick={() => switchPage('people', schoolId)}>
                <People />
            </IconButton>
        </Stack>
    } else {
        title = <Stack direction="row">
            <Typography>{schoolInfo.name}</Typography>
            <JoinClassButton schoolInfo={schoolInfo} onSelect={(/*yearGroupId, courseId, classId*/) => { }} />
        </Stack>
    }

    const currentYearGroup = schoolInfo.yearGroups[selectedYearGroupIndex]

    return <PageWrapper title={title}>
        <Tabs value={selectedYearGroupIndex} onChange={(_e, newValue) => setSelectedYearGroupIndex(newValue)} aria-label="Year groups">
            {schoolInfo.yearGroups.map(yearGroup => <Tab id={`year-group-tab-${yearGroup.id}`} key={yearGroup.id} label={yearGroup.name} />)}
            {isAdministratorOrTeacher && <CreateYearGroupButton onCreate={name => createYearGroup(schoolId, name)} />}
        </Tabs>
        <div role="tabpanel" aria-labelledby={`year-group-tab-${currentYearGroup.id}`}>
            <Typography variant="h5">{currentYearGroup.name}</Typography>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                {currentYearGroup.courses.map(course =>
                    <CourseView
                        key={course.id}
                        isAdministratorOrTeacher={isAdministratorOrTeacher}
                        course={course}
                        newClass={name => createClass(schoolId, currentYearGroup.id, course.id, name)}
                        goToClass={classId => switchPage('', schoolId, currentYearGroup.id, course.id, classId)}
                    />
                )}
                {isAdministratorOrTeacher && <CreateCourseTileButton onClick={name => createCourse(schoolId, currentYearGroup.id, name)} />}
            </Stack>
        </div>
    </PageWrapper>
}
