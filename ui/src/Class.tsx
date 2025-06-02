import { useParams } from "react-router-dom"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import { Badge, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material"
import { ClassPeopleView } from "./People"
import { ClassInfo, CourseInfo } from "../../data/school"
import { useSwitchPage } from "./App"
import TabPanel from "./TabPanel"
import { useState } from "react"
import { NotificationImportant } from "@mui/icons-material"
import MaximumLengthTextBox from "./MaximumLengthTextBox"

function getClassHasRequestingStudents(cls: ClassInfo) {
    return cls.requestingStudentIds.length > 0
}

const REQUESTING_STUDENTS_NOTIFICATION_MESSAGE = 'Student(s) requesting to join'

export function getCourseNotifications(course: CourseInfo): string[] {
    const hasRequestingStudents = course.classes.map(getClassHasRequestingStudents).some(count => count)
    if (hasRequestingStudents) {
        return [REQUESTING_STUDENTS_NOTIFICATION_MESSAGE]
    }else {
        return []
    }
}

function AddClassButton({ onClick }: {
    onClick: (name: string) => void
}) {
    const [nameSelectorOpen, setNameSelectorOpen] = useState(false)
    const [name, setName] = useState('')

    return <>
        <Button onClick={() => setNameSelectorOpen(true)} aria-label="Add class">+</Button>
        <Dialog open={nameSelectorOpen} onClose={() => setNameSelectorOpen(false)}>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogContent>
                <Box padding={1}>
                    <MaximumLengthTextBox maximumLength={100} label="Class Name" helperText="e.g. '12SFW1'" value={name} onChange={e => setName(e.target.value)} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setNameSelectorOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={() => {
                    setNameSelectorOpen(false)
                    setName('')
                    onClick(name)
                }}>Create</Button>
            </DialogActions>
        </Dialog>
    </>
}

export default function Class() {
    const { schoolId, yearGroupId, courseId, classId } = useParams()
    const { createClass } = useData()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const course = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)
    const currentClass = course?.classes.find(cls => cls.id === classId)

    const switchPage = useSwitchPage()

    const isAdminsitratorOrTeacher = useIsTeacherOrAdministrator(schoolInfo)

    useSetPageTitle(course ? `Classes in ${course.name}` : '')

    if (!classId && course && course.classes.length > 0) {
        switchPage('', schoolId, yearGroupId, courseId, course.classes[0].id, undefined, true)
    }

    if (!schoolId || !yearGroupId || !courseId) {
        return <Typography>Invalid URL</Typography>
    }
    if (!schoolInfo || !course) {
        return <Typography>Loading...</Typography>
    }
    if (!currentClass) {
        return <Typography>Click <AddClassButton onClick={name => {
            createClass(schoolId, yearGroupId, courseId, name)
        }} /> to add the first class.</Typography>
    }

    const tabIndex = course.classes.indexOf(currentClass)

    return <TabPanel
        index={tabIndex}
        tabs={course.classes.map(cls => ({
            label: <Badge badgeContent={getClassHasRequestingStudents(cls) ? <NotificationImportant /> : undefined}><Typography padding={1}>{cls.name}</Typography></Badge>,
            ariaLabel: getClassHasRequestingStudents(cls) ? `${cls.name} (${REQUESTING_STUDENTS_NOTIFICATION_MESSAGE})` : cls.name,
            onSelect: () => {
                switchPage('', schoolId, yearGroupId, courseId, cls.id, undefined, true)
            },
            heading: cls.name,
            value: <ClassPeopleView schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={cls.id} />
        }))}
        endButton={isAdminsitratorOrTeacher && <AddClassButton onClick={name => {
            createClass(schoolId, yearGroupId, courseId, name)
        }} />}
    />
}
