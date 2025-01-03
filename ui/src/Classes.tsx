import { useParams } from "react-router-dom"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import PageWrapper from "./PageWrapper"
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material"
import { useState } from "react"

function CreateYearGroupButton({ onCreate, buttonText }: { onCreate: (name: string) => void, buttonText?: string }) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [name, setName] = useState('')

    return <>
        <Button onClick={() => setDialogOpen(true)}>{buttonText ?? '+'}</Button>
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
    const { createYearGroup } = useData()

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
    return <PageWrapper title={schoolInfo?.name ?? 'School'}>
        <span>Hi</span>
    </PageWrapper>
}
