import { useSetPageTitle } from "./PageWrapper";
import { useData } from "./DataContext";
import { useSwitchSchool } from "./App";
import { TileButton, TileCard, TileContainer } from "./Tile";
import { Button, CardActions, CardHeader } from "@mui/material";
import { useHideSidebar } from "./WithSidebar";

export default function Schools() {
    useHideSidebar()
    const switchSchool = useSwitchSchool()
    const { joinedSchools, invitedSchools, joinSchool, declineInvitation } = useData()
    useSetPageTitle('Schools')

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
        {joinedSchools.map(school => <TileButton key={school.id} text={school.name} onClick={() => switchSchool(school.id)} />)}
    </TileContainer>
}
