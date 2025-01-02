import { Button, Stack } from "@mui/material";
import PageWrapper from "./PageWrapper";
import { useData } from "./DataContext";

function SchoolCard({ school }: { school: { id: string, name: string } }) {
    return <Button sx={{ padding: "10px", width: "200px", height: "200px" }}>
        <h2>{school.name}</h2>
    </Button>
}

export default function NoSchool() {
    const { schools } = useData()

    return <PageWrapper title="Schools">
        <Stack direction="row" useFlexGap flexWrap="wrap">
            {schools.map(school => <SchoolCard key={school.id} school={school} />)}
        </Stack>
    </PageWrapper>
}
