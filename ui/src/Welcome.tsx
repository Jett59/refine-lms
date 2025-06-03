import { Box, List, ListItem, ListItemIcon, Stack, Typography } from "@mui/material"
import { useSetPageTitle } from "./PageWrapper"
import image1URL from './welcome image1.jpg'
import image2URL from './welcome image2.jpg'
import { Assignment, CalendarToday, Edit, Folder, Message, People } from "@mui/icons-material"

export default function Welcome() {
    useSetPageTitle('Welcome')
    return <Stack direction="column" alignItems="center" spacing={2}>
        <Typography variant="h2">Refine</Typography>
        <Typography variant="h6">Learning Management System</Typography>
        <Stack direction="row" spacing={4} padding={1} width="100vw">
            <Box display="flex" flex={1} justifyContent="center">
                <img src={image1URL} aria-hidden width="67%" />
            </Box>
            <Box display="flex" flex={1} justifyContent="center">
<List>
    <ListItem><ListItemIcon><Assignment /></ListItemIcon> Bring assignments to life instantly</ListItem>
    <ListItem><ListItemIcon><Edit /></ListItemIcon> Transform ideas into engaging content</ListItem>
    <ListItem><ListItemIcon><People /></ListItemIcon> Build meaningful student connections</ListItem>
    <ListItem><ListItemIcon><Folder /></ListItemIcon> Keep your teaching world organized</ListItem>
    <ListItem><ListItemIcon><Message /></ListItemIcon> Stay connected with your classroom</ListItem>
    <ListItem><ListItemIcon><CalendarToday /></ListItemIcon> Plan lessons that inspire learning</ListItem>
</List>
            </Box>
            <Box display="flex" flex={1} justifyContent="center">
                <img src={image2URL} aria-hidden width="67%" />
            </Box>
            </Stack>
    </Stack>
}
