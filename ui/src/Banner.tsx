import { AppBar, Avatar, Badge, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, List, ListItem, MenuItem, Stack, Tooltip, Typography } from "@mui/material"
import { useUser } from "./UserContext"
import { useData } from "./DataContext"
import { useError } from "./ErrorContext"
import { useEffect, useRef, useState } from "react"
import { useSwitchSchool } from "./App"
import SimpleMenu from "./SimpleMenu"
import { Add, Email, ExpandLess, ExpandMore, House, NotificationImportant, Warning } from "@mui/icons-material"
import RefineLogo from "./RefineLogo"
import { CreateSchoolDialog } from "./Schools"

function ErrorButton() {
    const { errors, deleteDeleteOnViewErrors } = useError()

    const [open, setOpen] = useState(false)
    const [advancedOpen, setAdvancedOpen] = useState(false)

    // Automatically open the error dialog if a new error occurs
    const previousErrorCount = useRef(errors.length)
    useEffect(() => {
        if (errors.length > previousErrorCount.current) {
            setOpen(true)
            setAdvancedOpen(false)
        }
        previousErrorCount.current = errors.length
    }, [errors.length])

    if (errors.length > 0) {
        const lastError = errors[errors.length - 1]

        return <>
            <Tooltip title={`${errors.length} error${errors.length !== 1 ? 's' : ''}`}>
                <IconButton
                    color="warning"
                    onClick={() => setOpen(true)}
                    sx={{ borderRadius: '50%', width: '50px', height: '50px' }}
                >
                    <Warning />
                </IconButton>
            </Tooltip>
            <Dialog open={open} onClose={() => {
                setOpen(false)
                deleteDeleteOnViewErrors()
            }}>
                <DialogTitle>Error</DialogTitle>
                <DialogContent>
                    <Box padding={1}>
                        <Typography variant="body1" color="error">{lastError.displayMessage}</Typography>
                        <Button
                            variant="text"
                            aria-expanded={advancedOpen}
                            onClick={() => setAdvancedOpen(!advancedOpen)}
                            endIcon={advancedOpen ? <ExpandLess /> : <ExpandMore />}
                        >
                            {advancedOpen ? 'Hide details' : 'Show details'}
                        </Button>
                        {advancedOpen && <List>
                            {errors.map((error, index) => (
                                <ListItem key={index}>
                                    <Typography variant="body2" color="textSecondary">
                                        {error.displayMessage}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {error.detailMessage}
                                    </Typography>
                                    {error.statusCode && <Typography variant="body2" color="textSecondary">
                                        Status Code: {error.statusCode}
                                    </Typography>}
                                    {error.errorBody && <pre>{error.errorBody}</pre>}
                                </ListItem>
                            ))}
                        </List>}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => {
                        setOpen(false)
                        deleteDeleteOnViewErrors()
                    }}>Ok</Button>
                </DialogActions>
            </Dialog>
        </>
    }
}

function SchoolSwitcher() {
    const { joinedSchools, invitedSchools, declineInvitation, joinSchool } = useData()
    const switchSchool = useSwitchSchool()

    const [nameSelectorOpen, setNameSelectorOpen] = useState(false)

    const [invitedSchool, setInvitedSchool] = useState<{ name: string, id: string } | null>(null)

    const [loading, setLoading] = useState(false)

    return <>
        <Badge badgeContent={invitedSchools.length > 0 ? <NotificationImportant /> : undefined}>
            <Box padding={1}>
                <SimpleMenu
                    buttonContents="Schools"
                    buttonProps={{ color: 'inherit', endIcon: <ExpandMore /> }}
                    buttonAriaLabel={invitedSchools.length === 0 ? 'Schools' : 'Schools (has notifications)'}
                    childrenSupplier={close => [
                        ...invitedSchools.map(school => <MenuItem key={school.id} onClick={() => {
                            setInvitedSchool(school)
                            close()
                        }}
                            aria-label={`${school.name} (invited)`}
                        >
                            <Stack direction="row" spacing={2}>
                                <Email />
                                <Typography>{school.name}</Typography>
                            </Stack>
                        </MenuItem>),
                        ...joinedSchools.map(school => <MenuItem key={school.id} onClick={() => {
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
                        <Divider key='Divider' />,
                        <MenuItem key="Add" onClick={() => {
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
            </Box>
        </Badge>
        <CreateSchoolDialog open={nameSelectorOpen} setOpen={setNameSelectorOpen} switchOnOpen />
        <Dialog open={invitedSchool !== null} onClose={() => setInvitedSchool(null)}>
            <DialogTitle>Join {invitedSchool?.name}</DialogTitle>
            <DialogContent>
                <Typography>Would you like to join {invitedSchool?.name}?</Typography>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" disabled={loading} onClick={() => {
                    setLoading(true)
                    declineInvitation(invitedSchool!.id).then(() => {
                        setInvitedSchool(null)
                        setLoading(false)
                    })
                }}>Decline</Button>
                <Button variant="contained" disabled={loading} onClick={() => {
                    setLoading(true)
                    joinSchool(invitedSchool!.id).then(() => {
                        setInvitedSchool(null)
                        setLoading(false)
                        switchSchool(invitedSchool!.id)
                    })
                }}>Join</Button>
            </DialogActions>
        </Dialog>
    </>
}

function ProfileMenu() {
    const { logOut, name, profile_picture_url } = useUser()

    const [loggingOut, setLoggingOut] = useState(false)

    return <SimpleMenu
        buttonContents={<Avatar src={profile_picture_url} alt={name} />}
        buttonProps={{ color: 'inherit', endIcon: <ExpandMore /> }}
        childrenSupplier={close => [
            <MenuItem key="Logout" onClick={async () => {
                setLoggingOut(true)
                await logOut()
                setLoggingOut(false)
                close()
            }}
                aria-label="Logout"
                disabled={loggingOut}
            >
                {'Log Out'}
            </MenuItem>
        ]} />
}

export default function Banner() {
    const { login, loggedIn, loggingIn } = useUser()

    return <AppBar position="static">
        <Box display="flex" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2}>
                <RefineLogo />
                <ErrorButton />
            </Stack>
            {loggedIn ?
                <Stack direction="row" spacing={2} padding={1}>
                    <SchoolSwitcher />
                    <ProfileMenu />
                </Stack>
                :
                <Button disabled={loggingIn} onClick={() => login()}><Typography color="textPrimary">Login</Typography></Button>
            }
        </Box>
    </AppBar>
}
