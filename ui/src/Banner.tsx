import { AppBar, Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField, Typography } from "@mui/material"
import { useUser } from "./UserContext"
import { useData } from "./DataContext"
import { useError } from "./ErrorContext"
import { useState } from "react"
import { useSwitchSchool } from "./App"
import SimpleMenu from "./SimpleMenu"
import { Add, ExpandMore, House } from "@mui/icons-material"
import RefineLogo from "./RefineLogo"

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
                    <Box padding={1}>
                        <ul>
                            {errors.map((error, i) => <li key={i}>{error}</li>)}
                        </ul>
                    </Box>
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
        <SimpleMenu
            buttonContents="Schools"
            buttonProps={{ color: 'inherit', endIcon: <ExpandMore /> }}
            childrenSupplier={close => [
                ...schools.map(school => <MenuItem key={school.id} onClick={() => {
                    switchSchool(school.id)
                    close()
                }}
                    aria-label={school.name}
                >
                    <Stack direction="row" spacing={2}>
                        <House />
                        <Typography>{school.name}</Typography>
                    </Stack>
                </MenuItem>),
                <Divider />,
                <MenuItem onClick={() => {
                    setName('')
                    setNameSelectorOpen(true)
                    close()
                }}
                    aria-label="Create school"
                >
                    <Stack direction="row" spacing={2}>
                        <Add />
                        <Typography>Create school</Typography>
                    </Stack>
                </MenuItem>
            ]} />
        <Dialog open={nameSelectorOpen} onClose={() => setNameSelectorOpen(false)}>
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
                <RefineLogo />
                <ErrorButton />
            </Stack>
            {loggedIn ?
                <Stack direction="row" spacing={2} padding={1}>
                    <SchoolSwitcher />
                    <Box>
                        <Avatar src={profile_picture_url} alt={name} />
                    </Box>
                </Stack>
                :
                <Button disabled={loggingIn} onClick={() => login()}><Typography color="textPrimary">Login</Typography></Button>
            }
        </Box>
    </AppBar>
}
