import { Box, Divider, MenuItem, Stack, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useParams } from "react-router-dom"
import { PostInfo } from "../../data/post"
import { useEffect, useState } from "react"
import { getVisibleClassIds, useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle } from "./PageWrapper"
import { AttachmentView } from "./Feed"
import { TileContainer } from "./Tile"
import { SchoolInfo } from "../../data/school"
import { UserInfo } from "../../data/user"
import SimpleMenu from "./SimpleMenu"

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

    const isTeacherOrAdministrator = useIsTeacherOrAdministrator(school)

    const [currentStudentId, setCurrentStudentId] = useState<string | null>(null)
    const student = currentStudentId ? school.students.find(student => student.id === currentStudentId) ?? null : null

    return <Stack direction="column" spacing={2}>
        <Stack direction={shouldUseColumns ? 'row' : 'column'} spacing={2}>
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
        {isTeacherOrAdministrator && <>
            <Divider />
            <Typography variant="h4">Submissions</Typography>
            <SimpleMenu
                buttonContents={student?.name ?? 'Select a student...'}
                childrenSupplier={close => studentsWhoCanSeePost(assignment, school).map(student => (
                    <MenuItem key={student.id} onClick={() => { setCurrentStudentId(student.id); close() }}>{student.name}</MenuItem>
                ))}
            />
            {student && <TileContainer>
                {assignment.submissionTemplates?.map(attachment => (
                    <AttachmentView key={attachment.id} attachment={attachment} postId={assignment.id} schoolId={school.id} students={school.students} selectedStudentId={student.id} />
                ))}
                {assignment.studentAttachments?.[student.id]?.map(attachment => (
                    <AttachmentView key={attachment.id} attachment={attachment} postId={assignment.id} schoolId={school.id} students={school.students} selectedStudentId={student.id} />
                ))}
            </TileContainer>}
        </>
        }
        {!isTeacherOrAdministrator && <>
            <Divider />
            <Typography variant="h4">Your Work</Typography>
            <TileContainer>
                {assignment.submissionTemplates?.map(attachment => (
                    <AttachmentView key={attachment.id} attachment={attachment} postId={assignment.id} schoolId={school.id} students={school.students} selectedStudentId={student?.id} />
                ))}
                {assignment.studentAttachments?.[student?.id ?? '']?.map(attachment => (
                    <AttachmentView key={attachment.id} attachment={attachment} postId={assignment.id} schoolId={school.id} students={school.students} selectedStudentId={student?.id} />
                ))}
            </TileContainer>
        </>
        }
    </Stack>
}

export function studentsWhoCanSeePost(post: PostInfo, school: SchoolInfo): UserInfo[] {
    if (!post.courseId) {
        const ids = school.yearGroups.find(yg => yg.id === post.yearGroupId)?.courses.flatMap(course => course.classes).flatMap(cls => cls.studentIds)
        const students = ids?.map(id => school.students.find(student => student.id === id)).filter(student => student !== undefined) ?? school.students
        return students
    } else {
        const yearGroup = school.yearGroups.find(yg => yg.id === post.yearGroupId)
        const course = yearGroup?.courses.find(course => course.id === post.courseId)
        let ids
        if (post.classIds) {
            const classes = course?.classes.filter(cls => post.classIds?.includes(cls.id))
            ids = classes?.flatMap(cls => cls.studentIds)
        } else {
            ids = course?.classes.flatMap(cls => cls.studentIds)
        }
        return school.students.filter(student => ids?.includes(student.id))
    }
}
