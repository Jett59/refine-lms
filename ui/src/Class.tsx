import { useParams } from "react-router-dom"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import { Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material"
import { ClassPeopleView } from "./People"
import { ClassInfo, CourseInfo } from "../../data/school"
import { useSwitchPage } from "./App"
import TabPanel from "./TabPanel"
import { useState } from "react"

function getClassNotificationCount(cls: ClassInfo) {
    return cls.requestingStudentIds.length
}

export function getHasNotifications(course: CourseInfo) {
    return course.classes.map(getClassNotificationCount).some(count => count > 0)
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
                <TextField label="Class Name" helperText="e.g. '12SFW1'" value={name} onChange={e => setName(e.target.value)} />
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
    const {createClass} = useData()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const course = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)
    const currentClass = course?.classes.find(cls => cls.id === classId)

    const switchPage = useSwitchPage()

    const isAdminsitratorOrTeacher = useIsTeacherOrAdministrator(schoolInfo)

    useSetPageTitle(course ? `Classes in ${course.name}` : '')

    if (!classId && course && course.classes.length > 0) {
        switchPage('', schoolId, yearGroupId, courseId, course.classes[0].id, true)
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
            label: <Badge badgeContent={getClassNotificationCount(cls) || undefined}>{cls.name}</Badge>,
            ariaLabel: getClassNotificationCount(cls) ? `${cls.name} (${getClassNotificationCount(cls)})` : cls.name,
            onSelect: () => {
                switchPage('', schoolId, yearGroupId, courseId, cls.id, true)
            },
            heading: cls.name,
            value: <ClassPeopleView schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={cls.id} />
        }))}
        endButton={isAdminsitratorOrTeacher && <AddClassButton onClick={name => {
            createClass(schoolId, yearGroupId, courseId, name)
        }} />}
    />
}
