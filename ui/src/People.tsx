import { useParams } from "react-router-dom";
import { Avatar, Box, Button, Dialog, DialogActions, DialogContent, Grid, IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { lookupUser, useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo, useRole } from "./DataContext";
import { UserInfo } from "../../data/user";
import { Add, PersonAdd, Remove } from "@mui/icons-material";
import { ClassInfo, Role, SchoolInfo } from "../../data/school";
import { ReactNode, useRef, useState } from "react";
import { useUser } from "./UserContext";
import AccessibleAutocomplete from "./Autocomplete";
import { useSetPageTitle } from "./PageWrapper";
import { useConfirmationDialog } from "./ConfirmationDialog";
import MaximumLengthTextBox from "./MaximumLengthTextBox";

// REF: https://stackoverflow.com/a/46181
const validateEmail = (email: string) => {
    return email
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

function RemoveUserButton({ schoolInfo, userInfo }: { schoolInfo: SchoolInfo, userInfo: UserInfo }) {
    const { removeUser } = useData()

    const createConfirmationDialog = useConfirmationDialog()

    return <Button startIcon={<Remove />} onClick={async () => {
        createConfirmationDialog(`Remove ${userInfo.name}`, 'Remove', () => {
            removeUser(schoolInfo.id, userInfo.id)
        })
    }}>Remove</Button>
}

function RemoveUserFromClassMenuItem({ schoolInfo, yearGroupId, courseId, classId, userId, closeMenu }: {
    schoolInfo: SchoolInfo
    yearGroupId: string
    courseId: string
    classId: string
    userId: string
    closeMenu: () => void
}) {
    const { removeFromClass } = useData()

    return <Button startIcon={<Remove />} onClick={() => {
        removeFromClass(schoolInfo.id, yearGroupId, courseId, classId, userId)
        closeMenu()
    }}>Remove</Button>
}

function Person({ userInfo, schoolInfo, showRemove, removeButton }: {
    userInfo: UserInfo
    schoolInfo: SchoolInfo
    showRemove: boolean
    removeButton?: ReactNode // Defaults to RemoveUserMenuItem
}) {
    return <Stack direction="row" spacing={2}>
        <Avatar aria-hidden src={userInfo.picture} />
        <Typography>{userInfo.name} (<a href={`mailto:${userInfo.email}`}>{userInfo.email}</a>)</Typography>
        {showRemove && (
            removeButton ?? <RemoveUserButton key="remove" schoolInfo={schoolInfo} userInfo={userInfo} />
        )}
    </Stack>
}

function PendingPerson({ email }: { email: string }) {
    return <Typography color="textDisabled">{email} (pending)</Typography>
}

function InviteToSchoolButton({ category, schoolInfo }: {
    category: Role
    schoolInfo: SchoolInfo
}) {
    const { invite } = useData()

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [emailHasError, setEmailHasError] = useState(false)

    const relevantIndefiniteArticle = category === 'administrator' ? 'an' : 'a'

    const emailRef = useRef<HTMLElement>()

    return <>
        <Tooltip title={`Invite ${category}`}>
            <IconButton
                onClick={() => setInviteDialogOpen(true)}
            >
                <PersonAdd />
            </IconButton>
        </Tooltip>
        <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
            <DialogContent>
                <Typography variant="h4">Invite {relevantIndefiniteArticle} {category} to {schoolInfo.name}</Typography>
                <Box padding={1}>
                    <MaximumLengthTextBox maximumLength={254} inputRef={emailRef} type="email" autoComplete="off" error={emailHasError} label="Email" value={email} onChange={e => setEmail(e.target.value)} />
                    {emailHasError && <Typography color="error">Please enter a valid email</Typography>}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={() => {
                    if (validateEmail(email)) {
                        setEmailHasError(false)
                        setEmail('')
                        invite(schoolInfo?.id, category, email)
                        setInviteDialogOpen(false)
                    } else {
                        setEmailHasError(true)
                        emailRef.current?.focus?.()
                    }
                }}>
                    Invite
                </Button>
            </DialogActions>
        </Dialog>
    </>
}

function AddToClassButton({ schoolInfo, yearGroupId, courseId, classId, classInfo, role }: {
    schoolInfo: SchoolInfo
    yearGroupId: string
    courseId: string
    classId: string
    classInfo: ClassInfo
    role: 'teacher' | 'student'
}) {
    const { addToClass } = useData()

    const [addDialogOpen, setAddDialogOpen] = useState(false)

    const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null)

    const userSelectorRef = useRef<HTMLElement>(null)
    const [userSelectorHasError, setUserSelectorHasError] = useState(false)

    const existingMembers = role === 'teacher' ? classInfo.teacherIds : classInfo.studentIds

    return <>
        <Tooltip title={`Add ${role}`}>
            <IconButton
                onClick={() => setAddDialogOpen(true)}
            >
                <Add />
            </IconButton>
        </Tooltip>
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
            <DialogContent>
                <Typography variant="h4">Add to class</Typography>
                <Box padding={1}>
                    <AccessibleAutocomplete
                        options={(role === 'teacher'
                            ? schoolInfo.teachers.concat(schoolInfo.administrators)
                            : schoolInfo.students
                        ).filter(user => !existingMembers.includes(user.id))} // Only show users who aren't already in the class
                        getOptionLabel={user => `${user.name} (${user.email})`}
                        onChange={newValue => setSelectedUser(newValue)}
                        value={selectedUser}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        inputRef={userSelectorRef}
                        error={userSelectorHasError}
                    />
                    {userSelectorHasError && <Typography color="error">Please select a user</Typography>}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={() => {
                    if (selectedUser) {
                        addToClass(schoolInfo.id, yearGroupId, courseId, classId, role, selectedUser.id)
                        setAddDialogOpen(false)
                    } else {
                        setUserSelectorHasError(true)
                        userSelectorRef.current?.focus?.()
                    }
                }}>
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    </>
}

function CategoryHeading({ category, button }: {
    category: Role
    button?: ReactNode
}) {
    const headingContent = category === 'administrator' ? 'Administrators' : category === 'teacher' ? 'Teachers' : 'Students'

    if (button) {
        return <Stack direction="row" spacing={2}>
            <Typography variant="h5">{headingContent}</Typography>
            {button}
        </Stack>
    } else {
        return <Typography variant="h5">{headingContent}</Typography>
    }
}

export function SchoolPeoplePage() {
    const { schoolId } = useParams()

    const schoolInfo = useRelevantSchoolInfo(schoolId)

    const { userId: ourId } = useUser()
    const ourRole = useRole(schoolInfo)

    const showInviteButton = ourRole === 'administrator'
    const showRemoveOptionInGeneral = ourRole === 'administrator' // You also can't remove yourself, but that's handled below

    useSetPageTitle(schoolInfo?.name ? `People in ${schoolInfo.name}` : '')

    if (!schoolId) {
        return <Typography>No school chosen?</Typography>
    }
    if (!schoolInfo) {
        return <Typography>Loading...</Typography>
    }

    return <Grid container spacing={2}>
        <Grid item xs={12}>
            <CategoryHeading category="administrator" button={showInviteButton && <InviteToSchoolButton category="administrator" schoolInfo={schoolInfo} />} />
            <List>
                {schoolInfo.administrators.map(admin =>
                    <Person key={admin.id} userInfo={admin} schoolInfo={schoolInfo} showRemove={showRemoveOptionInGeneral && admin.id !== ourId} />
                )}
                {schoolInfo.invitedAdministratorEmails.map(email => <PendingPerson key={email} email={email} />)}
            </List>
        </Grid>
        <Grid item xs={12}>
            <CategoryHeading category="teacher" button={showInviteButton && <InviteToSchoolButton category="teacher" schoolInfo={schoolInfo} />} />
            <List>
                {schoolInfo.teachers.map(teacher =>
                    // Although the second condition in the following line is redundant, it is kept for consistency and in case teachers can remove people in the future
                    <Person key={teacher.id} userInfo={teacher} schoolInfo={schoolInfo} showRemove={showRemoveOptionInGeneral && teacher.id !== ourId} />
                )}
                {schoolInfo.invitedTeacherEmails.map(email => <PendingPerson key={email} email={email} />)}
            </List>
        </Grid>
        <Grid item xs={12}>
            <CategoryHeading category="student" button={showInviteButton && <InviteToSchoolButton category="student" schoolInfo={schoolInfo} />} />
            <List>
                {schoolInfo.students.map(student =>
                    <Person key={student.id} userInfo={student} schoolInfo={schoolInfo} showRemove={showRemoveOptionInGeneral && student.id !== ourId} />
                )}
                {schoolInfo.invitedStudentEmails.map(email => <PendingPerson key={email} email={email} />)}
            </List>
        </Grid>
    </Grid>
}

export function ClassPeopleView({ schoolInfo, yearGroupId, courseId, classId }: {
    schoolInfo: SchoolInfo
    yearGroupId: string
    courseId: string
    classId: string
}) {
    const { addToClass, removeFromClass } = useData()
    const isAdministratorOrTeacher = useIsTeacherOrAdministrator(schoolInfo)

    const showAddButton = isAdministratorOrTeacher
    const showRemoveOption = isAdministratorOrTeacher

    const cls = schoolInfo.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)?.classes.find(cls => cls.id === classId)

    if (!cls) {
        return <Typography>Class not found</Typography>
    }

    return <Grid container spacing={2}>
        {isAdministratorOrTeacher && cls.requestingStudentIds.length > 0 &&
            <Grid item xs={12}>
                <Typography variant="h5">Join requests</Typography>
                <List>
                    {cls.requestingStudentIds.map(studentId => {
                        const student = lookupUser(schoolInfo, studentId)
                        if (student) {
                            return <Stack direction="row" spacing={2}>
                                <Person key={student.id} userInfo={student} schoolInfo={schoolInfo} showRemove={false} />
                                <Tooltip title={`Add ${student.name}`}>
                                    <IconButton onClick={() => {
                                        addToClass(schoolInfo.id, yearGroupId, courseId, classId, 'student', student.id)
                                    }}><Add /></IconButton>
                                </Tooltip>
                                <Tooltip title={`Remove ${student.name}`}>
                                    <IconButton onClick={() => {
                                        removeFromClass(schoolInfo.id, yearGroupId, courseId, classId, student.id)
                                    }}><Remove /></IconButton>
                                </Tooltip>
                            </Stack>
                        }
                    }
                    )}
                </List>
            </Grid>
        }
        <Grid item xs={12}>
            <CategoryHeading category="teacher" button={showAddButton && <AddToClassButton role="teacher" schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={classId} classInfo={cls} />} />
            <List>
                {cls.teacherIds.map(teacherId => {
                    const teacher = lookupUser(schoolInfo, teacherId)
                    if (teacher) {
                        return <Person key={teacher.id} userInfo={teacher} schoolInfo={schoolInfo} showRemove={showRemoveOption} removeButton={
                            <RemoveUserFromClassMenuItem key="remove" schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={classId} userId={teacher.id} closeMenu={close} />
                        } />
                    }
                }
                )}
            </List>
        </Grid>
        <Grid item xs={12}>
            <CategoryHeading category="student" button={showAddButton && <AddToClassButton role="student" schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={classId} classInfo={cls} />} />
            <List>
                {cls.studentIds.map(studentId => {
                    const student = lookupUser(schoolInfo, studentId)
                    if (student) {
                        return <Person key={student.id} userInfo={student} schoolInfo={schoolInfo} showRemove={showRemoveOption} removeButton={
                            <RemoveUserFromClassMenuItem key="remove" schoolInfo={schoolInfo} yearGroupId={yearGroupId} courseId={courseId} classId={classId} userId={student.id} closeMenu={close} />
                        } />
                    }
                }
                )}
            </List>
        </Grid>
    </Grid>
}
