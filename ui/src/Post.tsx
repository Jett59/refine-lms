import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useParams } from "react-router-dom"
import { PostInfo } from "../../data/post"
import { useCallback, useEffect, useState } from "react"
import { getVisibleClassIds, useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle, useSetPageTitleButtons } from "./PageWrapper"
import { AttachmentView, CreatePostFormAddAttachmentButton } from "./Feed"
import { TileContainer } from "./Tile"
import { SchoolInfo } from "../../data/school"
import { UserInfo } from "../../data/user"
import SimpleMenu from "./SimpleMenu"
import { useUser } from "./UserContext"
import { formatDate } from "./date"

function SubmitAssignmentButton({ assignment, schoolId, isSubmitted, refreshPost }: {
    assignment: PostInfo
    schoolId: string
    isSubmitted: boolean
    refreshPost: () => Promise<void>
}) {
    const { submitAssignment } = useData()
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    return <>
        <Button variant="contained" color="primary" onClick={() => setConfirmDialogOpen(true)} disabled={isSubmitted}>
            Submit Assignment
        </Button>
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
            <DialogTitle>Submit assignment</DialogTitle>
            <DialogContent>
                <Typography>Are you sure you want to submit {assignment.title || 'Untitled'}?</Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setConfirmDialogOpen(false)} variant="outlined" disabled={submitting}>
                    Cancel
                </Button>
                <Button onClick={async () => {
                    setSubmitting(true)
                    await submitAssignment(schoolId, assignment.id)
                    await refreshPost()
                    setSubmitting(false)
                    setConfirmDialogOpen(false)
                }} variant="contained" disabled={submitting}>
                    Submit
                </Button>
            </DialogActions>
        </Dialog>
    </>
}

function MarkingInterface({ assignment }: {
    assignment: PostInfo
}) {
    const [marks, setMarks] = useState<number[]>([])

    useEffect(() => {
        setMarks(new Array(assignment.markingCriteria?.length).fill(0))
    }, [assignment.markingCriteria])

    return <>
        <Stack direction="row">
            <Typography variant="h4">Marking Criteria</Typography>
            {assignment.markingCriteria && assignment.markingCriteria.length > 0 &&
                <Typography>
                    {`${marks.reduce((a, b) => a + b, 0)}/${assignment.markingCriteria.reduce((a, b) => a + b.maximumMarks, 0)}`}
                </Typography>
            }
        </Stack>
        {assignment.markingCriteria && assignment.markingCriteria.length > 0
            ? <Stack direction="column">
                {assignment.markingCriteria.map((criterion, index) => (
                    <Stack key={index} direction="row" spacing={2}>
                        <Typography>{criterion.title}</Typography>
                        <TextField
                            type="number"
                            value={marks[index] ?? 0}
                            onChange={e => {
                                try {
                                    const markValue = Number(e.target.value)
                                    if (markValue >= 0 && markValue <= criterion.maximumMarks) {
                                        setMarks(marks => [...marks.fill(markValue, index, index + 1)])
                                    }
                                } catch (e) {
                                    console.error(e)
                                }
                            }}
                        />
                        <Typography>
                            /{criterion.maximumMarks}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
            : <Typography>No marking criteria</Typography>
        }
    </>
}

export default function Post() {
    const { schoolId, yearGroupId, courseId, postId } = useParams()
    const { getPost } = useData()
    const school = useRelevantSchoolInfo(schoolId)
    const [postInfo, setPostInfo] = useState<PostInfo | null>(null)

    const refreshPost = useCallback(async () => {
        if (school && postId && yearGroupId && schoolId) {
            let classIds
            if (courseId) {
                classIds = getVisibleClassIds(school, yearGroupId, courseId)
            }
            const postInfo = await getPost(postId, schoolId, yearGroupId, courseId, classIds)
            if (postInfo) {
                setPostInfo(postInfo)
            }
        }
    }, [postId, getPost, school, schoolId, yearGroupId, courseId])

    useEffect(() => {
        if (postId && schoolId && school && yearGroupId) {
            setPostInfo(null)
            refreshPost()
        }
    }, [postId, getPost, school, schoolId, yearGroupId, courseId])

    useSetPageTitle((postInfo?.title ?? '') || 'Untitled')

    if (!postId) {
        return <Typography variant="h4">No post selected</Typography>
    }
    if (!school || !postInfo) {
        return <Typography>Loading...</Typography>
    }

    if (postInfo.type === 'assignment') {
        return <Assignment assignment={postInfo} school={school} refreshPost={refreshPost} />
    } else {
        return <Typography>Not implemented</Typography>
    }
}

function Assignment({ assignment, school, refreshPost }: {
    assignment: PostInfo
    school: SchoolInfo
    refreshPost: () => Promise<void>
}) {
    const theme = useTheme()
    const shouldUseColumns = useMediaQuery(theme.breakpoints.up('md'))

    const isTeacherOrAdministrator = useIsTeacherOrAdministrator(school)
    const { userId } = useUser()
    const { addAttachmentToSubmission } = useData()

    const [currentStudentId, setCurrentStudentId] = useState<string | null>(!isTeacherOrAdministrator ? userId ?? null : null)
    const student = currentStudentId ? school.students.find(student => student.id === currentStudentId) ?? null : null

    const [addAttachmentDisabled, setAddAttachmentDisabled] = useState(false)

    const isSubmitted = currentStudentId === null || currentStudentId in (assignment.isoSubmissionDates ?? {})

    useSetPageTitleButtons(() => (
        isTeacherOrAdministrator && <SimpleMenu
            buttonContents={student?.name ?? 'Select a student...'}
            childrenSupplier={close => studentsWhoCanSeePost(assignment, school).map(student => (
                <MenuItem key={student.id} onClick={() => { setCurrentStudentId(student.id); close() }}>{student.name}</MenuItem>
            ))}
        />
    ), [assignment, school, student])

    return <Stack direction="column" spacing={2}>
        <Stack direction="column" alignItems="center" spacing={2}>
            {assignment.isoDueDate &&
                <Typography>
                    Due {formatDate(new Date(assignment.isoDueDate))}
                </Typography>
            }
        </Stack>
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
                {isTeacherOrAdministrator && student && isSubmitted
                    ? <MarkingInterface assignment={assignment} />
                    : <>
                        <Stack direction="row">
                            <Typography variant="h4">Marking Criteria</Typography>
                            {assignment.markingCriteria && assignment.markingCriteria.length > 0 &&
                                <Typography>
                                    {`/${assignment.markingCriteria.reduce((a, b) => a + b.maximumMarks, 0)}`}
                                </Typography>
                            }
                        </Stack>
                        {assignment.markingCriteria && assignment.markingCriteria.length > 0
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
                    </>
                }
            </Box>
        </Stack>
        {isTeacherOrAdministrator && student && <>
            <Divider />
            <Typography variant="h4">{student.name}'s Work</Typography>
            {student && <TileContainer>
                {assignment.submissionTemplates?.map(attachment => (
                    <AttachmentView key={attachment.id} attachment={attachment} postId={assignment.id} schoolId={school.id} students={school.students} selectedStudentId={student.id} />
                ))}
                {assignment.studentAttachments?.[student.id]?.map(attachment => (
                    <AttachmentView key={attachment.id} attachment={attachment} postId={assignment.id} schoolId={school.id} students={school.students} selectedStudentId={student.id} />
                ))}
            </TileContainer>}
            {(!assignment.submissionTemplates || assignment.submissionTemplates.length === 0) && (!assignment.studentAttachments?.[student.id] || assignment.studentAttachments?.[student.id].length === 0) &&
                <Typography>No attachments</Typography>
            }
        </>
        }
        {!isTeacherOrAdministrator && <>
            <Divider />
            <Typography variant="h4">Your Work</Typography>
            {isSubmitted && <Typography>
                Submitted {formatDate(new Date(assignment.isoSubmissionDates?.[currentStudentId ?? ''] ?? ''))}
            </Typography>}
            <TileContainer>
                {assignment.submissionTemplates?.map(attachment => (
                    <AttachmentView key={attachment.id} attachment={attachment} postId={assignment.id} schoolId={school.id} students={school.students} selectedStudentId={student?.id} />
                ))}
                {assignment.studentAttachments?.[student?.id ?? '']?.map(attachment => (
                    <AttachmentView key={attachment.id} attachment={attachment} postId={assignment.id} schoolId={school.id} students={school.students} selectedStudentId={student?.id} />
                ))}
                {!isSubmitted && <CreatePostFormAddAttachmentButton
                    defaultOthersCanEdit={false}
                    defaultShareMode="shared"
                    disabled={addAttachmentDisabled}
                    addAttachments={async attachments => {
                        setAddAttachmentDisabled(true)
                        for (const attachment of attachments) {
                            await addAttachmentToSubmission(school.id, assignment.id, attachment)
                        }
                        await refreshPost()
                        setAddAttachmentDisabled(false)
                    }}
                />}
            </TileContainer>
            <Stack direction="row" spacing={2} justifyContent="end">
                <SubmitAssignmentButton schoolId={school.id} assignment={assignment} isSubmitted={isSubmitted} refreshPost={refreshPost} />
            </Stack>
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
