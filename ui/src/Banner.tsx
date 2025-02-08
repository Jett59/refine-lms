import { AppBar, Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useUser } from "./UserContext";
import { useData } from "./DataContext";
import { useError } from "./ErrorContext";
import { useState } from "react";
import { useSwitchSchool } from "./App";
import SimpleMenu from "./SimpleMenu";
import { Add, ExpandMore, House } from "@mui/icons-material";

const RefineLogo = () => {
    const styles = {
        link: {
            display: 'flex',
            alignItems: 'center',
            height: '48px',
            textDecoration: 'none',
            filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.5))',
            transition: 'all 0.3s ease',
            animation: 'glow 2s ease-in-out infinite'
        },
        sparkle: {
            position: 'absolute',
            width: '3px',
            height: '3px',
            background: 'white',
            borderRadius: '50%',
            opacity: 0
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <style>
                {`
          @keyframes glow {
            0%, 100% { filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.5)); }
            50% { filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.7)); }
          }
          
          @keyframes sparkle {
            0% { transform: translate(0, 0) scale(0); opacity: 0; }
            50% { transform: translate(-15px, -15px) scale(1); opacity: 1; }
            100% { transform: translate(-30px, -30px) scale(0); opacity: 0; }
          }
          
          .logo-wrapper:hover .sparkle1 { animation: sparkle 1.5s ease-in-out infinite; }
          .logo-wrapper:hover .sparkle2 { animation: sparkle 1.5s ease-in-out infinite 0.4s; }
          .logo-wrapper:hover .sparkle3 { animation: sparkle 1.5s ease-in-out infinite 0.8s; }
          
          .logo-wrapper:hover {
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
            transform: scale(1.02);
          }
        `}
            </style>
            <a
                href="/"
                className="logo-wrapper"
                style={styles.link}
                aria-label="Return to Refine homepage"
            >
                <svg
                    viewBox="0 0 200 50"
                    style={{
                        height: '100%',
                        width: 'auto'
                    }}
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    aria-hidden="true"
                >
                    {/* Diamond shape representing refinement */}
                    <path
                        d="M30 25 L40 10 L50 25 L40 40 Z"
                        fill="#ffffff"
                        stroke="none"
                    />

                    {/* Smaller diamond overlapping */}
                    <path
                        d="M35 25 L40 20 L45 25 L40 30 Z"
                        fill="#1a365d"
                        stroke="none"
                    />

                    {/* Text */}
                    <text
                        x="65"
                        y="32"
                        fontFamily="Arial, sans-serif"
                        fontSize="24"
                        fontWeight="bold"
                        fill="#ffffff"
                    >
                        refine
                    </text>
                </svg>
                <div className="sparkle1" style={{ ...styles.sparkle, top: '20%', left: '20%' }} />
                <div className="sparkle2" style={{ ...styles.sparkle, top: '30%', left: '25%' }} />
                <div className="sparkle3" style={{ ...styles.sparkle, top: '15%', left: '22%' }} />
            </a>
        </div>
    );
};

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
