import PageWrapper from "./PageWrapper";
import { useData } from "./DataContext";
import { useSwitchSchool } from "./App";
import { Tile, TileContainer } from "./Tile";

export default function NoSchool() {
    const switchSchool = useSwitchSchool()
    const { schools } = useData()

    return <PageWrapper title="Schools">
        <TileContainer>
            {schools.map(school => <Tile key={school.id} text={school.name} onClick={() => switchSchool(school.id)} />)}
        </TileContainer>
    </PageWrapper>
}
