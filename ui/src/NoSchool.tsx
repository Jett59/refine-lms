import PageWrapper from "./PageWrapper";
import { useData } from "./DataContext";
import { useSwitchSchool } from "./App";
import { TileButton, TileContainer } from "./Tile";

export default function NoSchool() {
    const switchSchool = useSwitchSchool()
    const { schools } = useData()

    return <PageWrapper title="Schools">
        <TileContainer>
            {schools.map(school => <TileButton key={school.id} text={school.name} onClick={() => switchSchool(school.id)} />)}
        </TileContainer>
    </PageWrapper>
}
