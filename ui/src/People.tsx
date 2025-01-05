import { useParams } from "react-router-dom";
import PageWrapper from "./PageWrapper";
import { Button, Dialog, DialogActions, DialogContent, Grid, IconButton, List, Stack, TextField, Typography } from "@mui/material";
import { useData, useRelevantSchoolInfo, useRole } from "./DataContext";
import { UserInfo } from "../../data/user";
import { InsertInvitation } from "@mui/icons-material";
import { SchoolInfo } from "../../data/school";
import { useRef, useState } from "react";

// REF: https://stackoverflow.com/a/46181
const validateEmail = (email: string) => {
    return email
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

function Person({ userInfo }: { userInfo: UserInfo }) {
    return <Typography>{userInfo.name} (<a href={`mailto:${userInfo.email}`}>{userInfo.email}</a>)</Typography>
}

function PendingPerson({ email }: { email: string }) {
    return <Typography color="textDisabled">{email} (pending)</Typography>
}

function CategoryHeading({ schoolInfo, category }: { schoolInfo: SchoolInfo, category: 'administrator' | 'teacher' | 'student' }) {
    const role = useRole(schoolInfo)
    const { invite } = useData()

    const headingContent = category === 'administrator' ? 'Administrators' : category === 'teacher' ? 'Teachers' : 'Students'

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [emailHasError, setEmailHasError] = useState(false)
    const emailRef = useRef<HTMLElement>()

    const relevantIndefiniteArticle = category === 'administrator' ? 'an' : 'a'

    if (role === 'administrator') {
        return <Stack direction="row">
            <Typography variant="h5">{headingContent}</Typography>
            <IconButton
                aria-label={`Invite ${category}`}
                onClick={() => setInviteDialogOpen(true)}
            >
                <InsertInvitation />
            </IconButton>
            <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
                <DialogContent>
                    <Typography variant="h4">Invite {relevantIndefiniteArticle} {category} to {schoolInfo?.name}</Typography>
                    <TextField inputRef={emailRef} type="email" error={emailHasError} label="Email" value={email} onChange={e => setEmail(e.target.value)} />
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
        </Stack>
    } else {
        return <Typography variant="h5">{headingContent}</Typography>
    }
}

export default function People() {
    const { schoolId } = useParams()

    const schoolInfo = useRelevantSchoolInfo(schoolId)

    if (!schoolId) {
        return <PageWrapper title="People">
            <Typography>No school chosen?</Typography>
        </PageWrapper>
    }
    if (!schoolInfo) {
        return <PageWrapper title="People">
            <Typography>Loading...</Typography>
        </PageWrapper>
    }

    return <PageWrapper title={`People in ${schoolInfo.name}`}>
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <CategoryHeading category="administrator" schoolInfo={schoolInfo} />
                <List>
                    {schoolInfo.administrators.map(admin => <Person key={admin.id} userInfo={admin} />)}
                    {schoolInfo.invitedAdministratorEmails.map(email => <PendingPerson key={email} email={email} />)}
                </List>
            </Grid>
            <Grid item xs={12}>
                <CategoryHeading category="teacher" schoolInfo={schoolInfo} />
                <List>
                    {schoolInfo.teachers.map(teacher => <Person key={teacher.id} userInfo={teacher} />)}
                    {schoolInfo.invitedTeacherEmails.map(email => <PendingPerson key={email} email={email} />)}
                </List>
            </Grid>
            <Grid item xs={12}>
                <CategoryHeading category="student" schoolInfo={schoolInfo} />
                <List>
                    {schoolInfo.students.map(student => <Person key={student.id} userInfo={student} />)}
                    {schoolInfo.invitedStudentEmails.map(email => <PendingPerson key={email} email={email} />)}
                </List>
            </Grid>
        </Grid>
    </PageWrapper>
}
