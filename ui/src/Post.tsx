import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useParams } from "react-router-dom"
import { PostInfo } from "../../data/post"
import { useEffect, useState } from "react"
import { getVisibleClassIds, useData, useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import { AttachmentView } from "./Feed"
import { TileContainer } from "./Tile"
import { SchoolInfo } from "../../data/school"
import { UserInfo } from "../../data/user"

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
    if (!school || !postInfo) {
        return <Typography>Loading...</Typography>
    }

    if (postInfo.type === 'assignment') {
        return <Assignment assignment={postInfo} school={school} />
    } else {
        return <Typography>Not implemented</Typography>
    }
}

function Assignment({ assignment, school }: { assignment: PostInfo, school: SchoolInfo }) {
    const theme = useTheme()
    const shouldUseColumns = useMediaQuery(theme.breakpoints.up('md'))

    return <Stack direction={shouldUseColumns ? 'row' : 'column'} spacing={2}>
        <Box flex={3}>
            <Typography variant="h4">Instructions</Typography>
            <Typography>
                {assignment.content || 'No instructions'}
                </Typography>
            <TileContainer>
                {assignment.attachments.map(attachment => (
                    <AttachmentView key={attachment.id} postId={assignment.id} schoolId={assignment.schoolId} attachment={attachment} students={studentsWhoCanSeePost(assignment, school)} />
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

export function studentsWhoCanSeePost(post: PostInfo, school: SchoolInfo): UserInfo[] {
    if (!post.courseId) {
        const ids = school.yearGroups.find(yg => yg.id === post.yearGroupId)?.courses.flatMap(course => course.classes).flatMap(cls => cls.studentIds)
        const students = ids?.map(id => school.students.find(student => student.id === id)).filter(student => student !== undefined) ?? school.students
        return students
    }else {
        const yearGroup = school.yearGroups.find(yg => yg.id === post.yearGroupId)
        const course = yearGroup?.courses.find(course => course.id === post.courseId)
        let ids
        if (post.classIds) {
            const classes = course?.classes.filter(cls => post.classIds?.includes(cls.id))
            ids = classes?.flatMap(cls => cls.studentIds)
        }else {
            ids = course?.classes.flatMap(cls => cls.studentIds)
        }
        return school.students.filter(student => ids?.includes(student.id))
    }
}
