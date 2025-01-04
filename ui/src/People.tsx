import { useParams } from "react-router-dom";
import PageWrapper from "./PageWrapper";
import { Grid, List, Typography } from "@mui/material";
import { useRelevantSchoolInfo } from "./DataContext";

export default function People() {
    const { schoolId } = useParams()

    const schoolInfo = useRelevantSchoolInfo(schoolId)

    if (!schoolId) {
        return <PageWrapper title="People">
            <Typography>No school chosen?</Typography>
        </PageWrapper>
    }
    if (!schoolInfo) {
        return <PageWrapper title="People">
            <Typography>Loading...</Typography>
        </PageWrapper>
    }

    return <PageWrapper title={`People in ${schoolInfo.name}`}>
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Typography variant="h5">Administrators</Typography>
                <List>
                    {schoolInfo.administrators.map(admin => <Typography key={admin.id}>{admin.name}</Typography>)}
                </List>
            </Grid>
            <Grid item xs={12}>
                <Typography variant="h5">Teachers</Typography>
                <List>
                    {schoolInfo.teachers.map(teacher => <Typography key={teacher.id}>{teacher.name}</Typography>)}
                </List>
            </Grid>
            <Grid item xs={12}>
                <Typography variant="h5">Students</Typography>
                <List>
                    {schoolInfo.students.map(student => <Typography key={student.id}>{student.name}</Typography>)}
                </List>
            </Grid>
        </Grid>
    </PageWrapper>
}
