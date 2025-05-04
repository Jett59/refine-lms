import { useSetPageTitle } from "./PageWrapper";
import { useData } from "./DataContext";
import { useSwitchSchool } from "./App";
import { TileCard, TileContainer } from "./Tile";
import { Box, Button, CardActions, CardHeader, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

export function CreateSchoolDialog({ open, setOpen, switchOnOpen }: {
    open: boolean,
    setOpen: (open: boolean) => void
    switchOnOpen?: boolean
}) {
    const { createSchool } = useData()
    const switchSchool = useSwitchSchool()
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)

    return <Dialog open={open} onClose={() => {
        if (!loading) {
            setOpen(false)
            setName('')
        }
    }}>
        <DialogTitle>Create a new school</DialogTitle>
        <DialogContent>
            <Box padding={1}>
                <TextField
                    autoComplete="off"
                    label="School name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button variant="outlined" disabled={loading} onClick={() => {
                setOpen(false)
                setName('')
            }}>Cancel</Button>
            <Button variant="contained" disabled={loading} onClick={() => {
                setLoading(true)
                createSchool(name).then(id => {
                    setOpen(false)
                    setLoading(false)
                    setName('')
                    if (id && switchOnOpen) {
                        switchSchool(id)
                    }
                })
            }}>Create</Button>
        </DialogActions>
    </Dialog>
}

export const LAST_ACTIVE_SCHOOL_ID_KEY = 'last-active-school-id'

export default function Schools() {
    const switchSchool = useSwitchSchool()
    const { joinedSchools, invitedSchools, loadingInitialSchoolsList, joinSchool, declineInvitation } = useData()
    useSetPageTitle(!loadingInitialSchoolsList ? 'Schools' : '')

const [createSchoolOpen, setCreateSchoolOpen] = useState(false)

useEffect(() => {
    if (joinedSchools.length > 0) {
        const lastActiveSchoolId = localStorage.getItem(LAST_ACTIVE_SCHOOL_ID_KEY)
        if (lastActiveSchoolId) {
            switchSchool(lastActiveSchoolId, true)
        }else {
            switchSchool(joinedSchools[0].id, true)
        }
    }
}, [joinedSchools])

    if (joinedSchools.length === 0 && invitedSchools.length === 0) {
        if (!loadingInitialSchoolsList) {
        return <Stack direction="column" spacing={2} alignItems="center">
            <Typography>
                Wait for an invitation to a school or create your own.
            </Typography>
            <Button variant="outlined" onClick={() => setCreateSchoolOpen(true)}>Create school</Button>
            <CreateSchoolDialog open={createSchoolOpen} setOpen={setCreateSchoolOpen} switchOnOpen />
        </Stack>
        }else {
            return <Typography>Loading...</Typography>
        }
    }

return <TileContainer centre>
    {invitedSchools.map(school => (
        <TileCard key={school.id}>
            <CardHeader title={school.name.toUpperCase()} titleTypographyProps={{ variant: 'h6' }} />
            <CardActions>
                <Button onClick={() => joinSchool(school.id)}>Join</Button>
                <Button onClick={() => declineInvitation(school.id)}>Decline invitation</Button>
            </CardActions>
        </TileCard>
    ))}
</TileContainer>
}
