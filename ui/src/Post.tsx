import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useParams } from "react-router-dom"
import { PostInfo } from "../../data/post"
import { useEffect, useState } from "react"
import { getVisibleClassIds, useData, useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import { AttachmentView } from "./Feed"
import { TileContainer } from "./Tile"

export default function Post() {
    const { schoolId, yearGroupId, courseId, postId } = useParams()
    const { getPost } = useData()
    const school = useRelevantSchoolInfo(schoolId)
    const [postInfo, setPostInfo] = useState<PostInfo | null>(null)

    useEffect(() => {
        if (postId && schoolId && school && yearGroupId) {
            let classIds
            if (courseId) {
                classIds = getVisibleClassIds(school, yearGroupId, courseId)
            }
            setPostInfo(null)
            getPost(postId, schoolId, yearGroupId, courseId, classIds).then(postInfo => {
                if (postInfo) {
                    setPostInfo(postInfo)
                }
            })
        }
    }, [postId, getPost, school, schoolId, yearGroupId, courseId])

    useSetPageTitle(postInfo?.title ?? '')

    if (!postId) {
        return <Typography variant="h4">No post selected</Typography>
    }
    if (!postInfo) {
        return <Typography>Loading...</Typography>
    }

    if (postInfo.type === 'assignment') {
        return <Assignment assignment={postInfo} />
    } else {
        return <Typography>Not implemented</Typography>
    }
}

function Assignment({ assignment }: { assignment: PostInfo }) {
    const theme = useTheme()
    const shouldUseColumns = useMediaQuery(theme.breakpoints.up('md'))

    return <Stack direction={shouldUseColumns ? 'row' : 'column'} spacing={2}>
        <Box flex={3}>
            <Typography variant="h4">Instructions</Typography>
            <Typography>{assignment.content}</Typography>
            <TileContainer>
                {assignment.attachments.map(attachment => (
                    <AttachmentView key={attachment.id} postId={assignment.id} schoolId={assignment.schoolId} attachment={attachment} />
                ))}
            </TileContainer>
        </Box>
        <Box flex={1}>
            <Stack direction="row">
                <Typography variant="h4">Marking Criteria</Typography>
                {assignment.markingCriteria &&
                <Typography>
                    {`/${assignment.markingCriteria.reduce((a, b) => a + b.maximumMarks, 0)}`}
                </Typography>
}
            </Stack>
            {assignment.markingCriteria
                ? <Stack direction="column">
                    {assignment.markingCriteria.map((criterion, index) => (
                        <Stack key={index} direction="row" spacing={2}>
                        <Typography>{criterion.title}</Typography>
                        <Typography>/{criterion.maximumMarks}</Typography>
                        </Stack>
                    ))}
                </Stack>
                : <Typography>No marking criteria</Typography>
            }
        </Box>
    </Stack>
}
