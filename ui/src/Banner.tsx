import { AppBar, Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useUser } from "./UserContext";
import { useData } from "./DataContext";
import { useError } from "./ErrorContext";
import { useState } from "react";
import { useSwitchSchool } from "./App";
import SimpleMenu from "./SimpleMenu";

function ErrorButton() {
    const { errors } = useError()

    const [open, setOpen] = useState(false)

    if (errors.length > 0) {
        return <>
            <Button
                variant="outlined"
                color="warning"
                onClick={() => setOpen(true)}
                sx={{ borderRadius: '50%', width: '50px', height: '50px' }}
                aria-label={`View ${errors.length} error${errors.length !== 1 ? 's' : ''}`}
            >
                {errors.length}
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Errors</DialogTitle>
                <DialogContent>
                    <ul>
                        {errors.map((error, i) => <li key={i}>{error}</li>)}
                    </ul>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    }
}

function SchoolSwitcher() {
    const { joinedSchools: schools, createSchool } = useData()
    const switchSchool = useSwitchSchool()

    const [nameSelectorOpen, setNameSelectorOpen] = useState(false)

    const [name, setName] = useState('')

    return <>
        <SimpleMenu buttonContents={<Typography color="textPrimary">Schools</Typography>} childrenSupplier={close => [
            ...schools.map(school => <MenuItem key={school.id} onClick={() => {
                switchSchool(school.id)
                close()
            }}>{school.name}</MenuItem>),
            <MenuItem onClick={() => {
                setName('')
                setNameSelectorOpen(true)
                close()
            }}>New school</MenuItem>
        ]} />
        <Dialog open={nameSelectorOpen} onClose={() => setNameSelectorOpen(false)}>
            <DialogTitle>Create a new school</DialogTitle>
            <DialogContent>
                <TextField
                autoComplete="off"
                    label="School name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setNameSelectorOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={() => {
                    createSchool(name)
                    setNameSelectorOpen(false)
                }}>Create</Button>
            </DialogActions>
        </Dialog>
    </>
}

export default function Banner() {
    const { login, loggedIn, loggingIn, name, profile_picture_url } = useUser()

    return <AppBar position="static">
        <Box display="flex" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2}>
                <h1>Fancy logo goes here</h1>
                <ErrorButton />
            </Stack>
            {loggedIn ?
                <Stack direction="row" spacing={2}>
                    <SchoolSwitcher />
                    <Box>
                        <Avatar sx={{ width: 50, height: 50 }}>
                            <img src={profile_picture_url} alt={name} />
                        </Avatar>
                    </Box>
                </Stack>
                :
                <Button disabled={loggingIn} onClick={() => login()}><Typography color="textPrimary">Login</Typography></Button>
            }
        </Box>
    </AppBar>
}
