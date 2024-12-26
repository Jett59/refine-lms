import { AppBar, Box, Button } from "@mui/material";
import { useUser } from "./UserContext";

export default function Banner() {
    const { login, loggedIn, name, profile_picture_url } = useUser()

    return <AppBar position="static">
        <Box display="flex" justifyContent="space-between">
            <h1>Fancy logo goes here</h1>
            {loggedIn ?
                <img src={profile_picture_url} alt={name} />
        :
            <Button onClick={() => login()}>Login</Button>
        }
        </Box>
    </AppBar>
}
