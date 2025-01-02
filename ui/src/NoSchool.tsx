import { Button, Stack } from "@mui/material";
import PageWrapper from "./PageWrapper";
import { useData } from "./DataContext";
import { useSwitchSchool } from "./App";

function SchoolCard({ school, onClick }: { school: { id: string, name: string }, onClick: () => void }) {
    return <Button sx={{ padding: "10px", width: "200px", height: "200px" }} onClick={() => onClick()}>
        <h2>{school.name}</h2>
    </Button>
}

export default function NoSchool() {
    const switchSchool = useSwitchSchool()
    const { schools } = useData()

    return <PageWrapper title="Schools">
        <Stack direction="row" useFlexGap flexWrap="wrap">
            {schools.map(school => <SchoolCard key={school.id} school={school} onClick={() => switchSchool(school.id)} />)}
        </Stack>
    </PageWrapper>
}
