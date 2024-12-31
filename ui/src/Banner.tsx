import { AppBar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useUser } from "./UserContext";
import { useData } from "./DataContext";
import { useError } from "./ErrorContext";
import { useState } from "react";

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
    const { schools, createSchool } = useData()

    return <Stack direction="row">
        {schools.map(school => <Button key={school.id}>{school.name}</Button>)}
        <Button onClick={() => createSchool('New School')}>+</Button>
    </Stack>
}

export default function Banner() {
    const { login, loggedIn, loggingIn, name, profile_picture_url } = useUser()

    return <AppBar position="static">
        <Box display="flex" justifyContent="space-between">
            <Stack direction="row" spacing={2}>
                <h1>Fancy logo goes here</h1>
                <ErrorButton />
            </Stack>
            {loggedIn ?
                <Stack direction="row" spacing={2}>
                    <SchoolSwitcher />
                    <Box>
                        <img src={profile_picture_url} alt={name} />
                    </Box>
                </Stack>
                :
                <Button disabled={loggingIn} onClick={() => login()}>Login</Button>
            }
        </Box>
    </AppBar>
}
