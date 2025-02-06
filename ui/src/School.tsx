import { useParams } from "react-router-dom"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo, useSchoolStructure } from "./DataContext"
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material"
import { useEffect, useMemo, useState } from "react"
import { CourseInfo, SchoolInfo, SchoolStructure } from "../../data/school"
import { TileButton, TileContainer } from "./Tile"
import { People, PersonAdd } from "@mui/icons-material"
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
                <TextField
                    autoComplete="off"
                    label="Course name"
                    value={name}
                    onChange={e => setName(e.target.value)}
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

function CreateYearGroupButton({ onCreate, buttonText, buttonProps }: {
    onCreate: (name: string) => void
    buttonText?: string
    buttonProps?: ButtonProps
}) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [name, setName] = useState('')

    return <>
        <Button aria-label={buttonText ?? 'New year group'} onClick={() => setDialogOpen(true)} {...buttonProps}>{buttonText ?? '+'}</Button>
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
                }}>Create</Button>
            </DialogActions>
        </Dialog>
    </>
}

export default function School() {
    const { schoolId, yearGroupId } = useParams()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const isAdministratorOrTeacher = useIsTeacherOrAdministrator(schoolInfo)
    const { createYearGroup, createCourse } = useData()
    const switchPage = useSwitchPage()

    const selectedYearGroupIndex = useMemo(() => yearGroupId ? schoolInfo?.yearGroups.findIndex(yg => yg.id === yearGroupId) ?? 0 : 0, [schoolInfo, yearGroupId])

    useSetPageTitle(schoolInfo?.name ?? 'School')

    const titleButtons = useMemo(() => {
        if (schoolInfo) {
            if (isAdministratorOrTeacher) {
                return <Tooltip title="People">
                    <IconButton aria-label="People" onClick={() => switchPage('people', schoolId)}>
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
    useSetPageTitleButtons(titleButtons)

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

    return <Stack direction="column">
        <Tabs value={selectedYearGroupIndex} onChange={(_, newValue) => {
            switchPage('', schoolId, schoolInfo.yearGroups[newValue].id, undefined, undefined, true)
        }} aria-label="Year groups">
            {schoolInfo.yearGroups.map(yearGroup => <Tab id={`year-group-tab-${yearGroup.id}`} key={yearGroup.id} label={yearGroup.name} />)}
            {isAdministratorOrTeacher && <CreateYearGroupButton onCreate={name => createYearGroup(schoolId, name)} />}
        </Tabs>
        <div role="tabpanel" aria-labelledby={`year-group-tab-${currentYearGroup.id}`}>
            <Typography variant="h5">Courses in {currentYearGroup.name}</Typography>
            <TileContainer>
                {currentYearGroup.courses.map(course =>
                    <CourseView
                        key={course.id}
                        course={course}
                        goToCourse={() => switchPage('', schoolId, currentYearGroup.id, course.id)}
                    />
                )}
                {isAdministratorOrTeacher && <CreateCourseTileButton onClick={name => createCourse(schoolId, currentYearGroup.id, name)} />}
            </TileContainer>
            <Divider />
            <Typography variant="h5">Posts to {currentYearGroup.name}</Typography>
            <Feed schoolId={schoolId} yearGroupId={currentYearGroup.id} />
        </div>
    </Stack>
}
