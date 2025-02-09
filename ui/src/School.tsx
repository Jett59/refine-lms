import { useParams } from "react-router-dom"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo, useSchoolStructure } from "./DataContext"
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, List, ListItem, Stack, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material"
import { useEffect, useMemo, useState } from "react"
import { CourseInfo, SchoolInfo, SchoolStructure } from "../../data/school"
import { TileButton, TileContainer } from "./Tile"
import { People, PersonAdd, Remove } from "@mui/icons-material"
import { useSwitchPage } from "./App"
import { SimpleTreeView, TreeItem } from "@mui/x-tree-view"
import { useUser } from "./UserContext"
import { useSetPageTitle, useSetPageTitleButtons } from "./PageWrapper"
import Feed from "./Feed"

function JoinClassButton({ schoolInfo, }: {
    schoolInfo: SchoolInfo
}) {
    const { requestToJoinClass } = useData()
    const schoolStructure = useSchoolStructure(schoolInfo.id)
    const { userId } = useUser()

    const [selectDialogOpen, setSelectDialogOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<string | null>(null)
    const selectedClass: { yearGroupId: string, courseId: string, classId: string, name: string } | undefined = schoolStructure?.yearGroups.flatMap(yg =>
        yg.courses.flatMap(course =>
            course.classes.flatMap(cls => ({ yearGroupId: yg.id, courseId: course.id, classId: cls.id, name: cls.name })
            )
        )
    ).find(cls => cls.classId === selectedItem)

    if (schoolStructure) {
        const filteredSchoolStructure: SchoolStructure = {
            id: schoolStructure.id,
            name: schoolStructure.name,
            yearGroups: schoolStructure.yearGroups.map(yg => ({
                id: yg.id,
                name: yg.name,
                courses: yg.courses.filter(course => course.classes.length > 0)
            })).filter(yg => yg.courses.length > 0)
        }

        return <>
            <Tooltip title="Request to Join Class">
                <IconButton onClick={() => setSelectDialogOpen(true)}><PersonAdd /></IconButton>
            </Tooltip>
            <Dialog open={selectDialogOpen} onClose={() => setSelectDialogOpen(false)}>
                <DialogTitle>Request to Join a Class</DialogTitle>
                <DialogContent>
                    <SimpleTreeView selectedItems={selectedItem} onSelectedItemsChange={(_, item) => setSelectedItem(item)} >
                        {filteredSchoolStructure.yearGroups.map(yearGroup => (
                            <TreeItem key={yearGroup.id} itemId={yearGroup.id} label={yearGroup.name}>
                                {yearGroup.courses.map(course => (
                                    <TreeItem key={course.id} itemId={course.id} label={course.name}>
                                        {course.classes.map(cls => (
                                            <TreeItem
                                                key={cls.id}
                                                itemId={cls.id}
                                                label={cls.name}
                                                disabled={Boolean(schoolInfo.yearGroups.find(yg => yg.id === yearGroup.id)?.courses.find(c => c.id === course.id)?.classes.find(c => c.id === cls.id)?.studentIds.find(studentId => studentId === userId))}
                                            />
                                        ))}
                                    </TreeItem>
                                ))}
                            </TreeItem>
                        ))}
                    </SimpleTreeView>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setSelectDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" disabled={!selectedClass} onClick={() => {
                        if (selectedClass) {
                            requestToJoinClass(schoolInfo.id, selectedClass.yearGroupId, selectedClass.courseId, selectedClass.classId)
                            setSelectDialogOpen(false)
                        }
                    }}>Request to join {selectedClass?.name ?? ''}</Button>
                </DialogActions>
            </Dialog>
        </>
    } else {
        return null
    }
}

function CourseView({ course, goToCourse }: {
    course: CourseInfo
    goToCourse: () => void
}) {
    return <TileButton onClick={goToCourse} text={course.name} />
}

function CreateCourseTileButton({ onClick }: { onClick: (courseName: string, classNames: string[]) => void }) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [courseName, setCourseName] = useState('')

    const [newClassName, setNewClassName] = useState('')
    const [classNames, setClassNames] = useState<string[]>([])

    useEffect(() => {
        if (dialogOpen) {
            setCourseName('')
        }
    }, [dialogOpen])

    return <>
        <TileButton onClick={() => setDialogOpen(true)} text="+" buttonProps={{ "aria-label": 'Add course' }} />
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Create a new course</DialogTitle>
            <DialogContent>
                <TextField
                    autoComplete="off"
                    label="Course name"
                    value={courseName}
                    onChange={e => setCourseName(e.target.value)}
                    helperText="e.g. 'Software Engineering'"
                />
                <Divider />
                <TextField
                    autoComplete="off"
                    label="Class name"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    helperText="e.g. '12SFW1'"
                    onKeyPress={e => {
                        if (e.key === 'Enter') {
                            if (newClassName.trim() !== '') {
                                setClassNames([...classNames, newClassName.trim()])
                                setNewClassName('')
                            }
                        }
                    }}
                />
                <Button onClick={() => {
                    if (newClassName.trim() !== '') {
                        setClassNames([...classNames, newClassName.trim()])
                        setNewClassName('')
                    }
                }}>Add class</Button>
                <List>
                    {classNames.map(className =>
                        <ListItem key={className} secondaryAction={
                            <IconButton edge="end" onClick={() => {
                                setClassNames(classNames.filter(cn => cn !== className))
                            }} aria-label={`Remove ${className}`}>
                                <Remove />
                            </IconButton>
                        }>
                            <Typography>{className}</Typography>
                        </ListItem>
                    )}
                </List>
                <Typography aria-live="polite" color={classNames.length === 0 ? 'error' : 'inherit'} sx={classNames.length !== 0 ? {
                    // Hide the message visually, but leave it visible to screen readers
                    position: 'absolute',
                    width: '1px',
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0 0 0 0)'
                } : undefined}>
                    {classNames.length === 0
                        ? 'Please add at least one class'
                        : `${classNames.length} class${classNames.length === 1 ? '' : 'es'} added`
                    }
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        onClick(courseName, classNames)
                        setDialogOpen(false)
                    }}
                    disabled={courseName.trim() === '' || classNames.length === 0}
                >Create</Button>
            </DialogActions>
        </Dialog>
    </>
}

function CreateYearGroupButton({ onCreate, buttonText, buttonProps }: {
    onCreate: (name: string) => void
    buttonText?: string
    buttonProps?: ButtonProps
}) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [name, setName] = useState('')

    return <>
        <Button aria-label={buttonText ?? 'Add year group'} onClick={() => setDialogOpen(true)} {...buttonProps}>{buttonText ?? '+'}</Button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Create a new year group</DialogTitle>
            <DialogContent>
                <TextField
                    autoComplete="off"
                    label="Year group name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    helperText="e.g. 'Year 12'"
                />
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={() => {
                    onCreate(name)
                    setDialogOpen(false)
                    setName('')
                }}>Create</Button>
            </DialogActions>
        </Dialog>
    </>
}

export default function School() {
    const { schoolId, yearGroupId } = useParams()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const isAdministratorOrTeacher = useIsTeacherOrAdministrator(schoolInfo)
    const { userId } = useUser()
    const { createYearGroup, createCourse } = useData()
    const switchPage = useSwitchPage()

    const selectedYearGroupIndex = useMemo(() => yearGroupId ? schoolInfo?.yearGroups.findIndex(yg => yg.id === yearGroupId) ?? 0 : 0, [schoolInfo, yearGroupId])

    useSetPageTitle(schoolInfo?.name ?? '')

    useSetPageTitleButtons(() => {
        if (schoolInfo) {
            if (isAdministratorOrTeacher) {
                return <Tooltip title="People">
                    <IconButton onClick={() => switchPage('people', schoolId)}>
                        <People />
                    </IconButton>
                </Tooltip>
            } else {
                return <JoinClassButton schoolInfo={schoolInfo} />
            }
        } else {
            return null
        }
    }, [isAdministratorOrTeacher, schoolInfo, switchPage, schoolId])

if (!schoolId) {
    return <Typography>No school chosen?</Typography>
}
if (!schoolInfo) {
    return <Typography>Loading...</Typography>
}

if (schoolInfo?.yearGroups.length === 0) {
    if (isAdministratorOrTeacher) {
        return <Box display="flex" sx={{ height: '500px' }} justifyContent="center" alignItems="center">
            <CreateYearGroupButton onCreate={name => createYearGroup(schoolId, name)} buttonText="Create a year group to get started" buttonProps={{ variant: "contained" }} />
        </Box>
    }
    return <Typography>You are not currently a member of a class</Typography>
}

const currentYearGroup = schoolInfo.yearGroups[selectedYearGroupIndex]

const coursesContainingUser = currentYearGroup.courses.filter(course => course.classes.some(cls => {
    if (!userId) {
        return false
    }
    if (isAdministratorOrTeacher) {
        return cls.teacherIds.includes(userId)
    } else {
        return cls.studentIds.includes(userId)
    }
}))

return <Stack direction="column" spacing={2}>
    <Tabs value={selectedYearGroupIndex} onChange={(_, newValue) => {
        switchPage('', schoolId, schoolInfo.yearGroups[newValue].id, undefined, undefined, true)
    }} aria-label="Year groups">
        {schoolInfo.yearGroups.map(yearGroup => <Tab id={`year-group-tab-${yearGroup.id}`} key={yearGroup.id} label={yearGroup.name} />)}
        {isAdministratorOrTeacher && <CreateYearGroupButton onCreate={name => createYearGroup(schoolId, name)} />}
    </Tabs>
    <div role="tabpanel" aria-labelledby={`year-group-tab-${currentYearGroup.id}`}>
        {coursesContainingUser.length > 0 && isAdministratorOrTeacher && <>
            <Typography variant="h5">My Courses in {currentYearGroup.name}</Typography>
            <TileContainer>
                {currentYearGroup.courses.map(course =>
                    <CourseView
                        key={course.id}
                        course={course}
                        goToCourse={() => switchPage('', schoolId, currentYearGroup.id, course.id)}
                    />
                )}
            </TileContainer>
            <Divider />
        </>}
        <Typography variant="h5">{coursesContainingUser.length > 0 && isAdministratorOrTeacher && 'All '}Courses in {currentYearGroup.name}</Typography>
        <TileContainer>
            {currentYearGroup.courses.map(course =>
                <CourseView
                    key={course.id}
                    course={course}
                    goToCourse={() => switchPage('', schoolId, currentYearGroup.id, course.id)}
                />
            )}
            {isAdministratorOrTeacher && <CreateCourseTileButton onClick={(name, initialClassNames) => createCourse(schoolId, currentYearGroup.id, name, initialClassNames)} />}
        </TileContainer>
        <Divider />
        <Feed schoolId={schoolId} yearGroupId={currentYearGroup.id} />
    </div>
</Stack>
}
