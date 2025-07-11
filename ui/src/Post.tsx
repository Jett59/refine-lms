import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, MenuItem, Stack, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useParams } from "react-router-dom"
import { PostInfo } from "../../data/post"
import { Fragment, useCallback, useEffect, useState } from "react"
import { getVisibleClassIds, useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo } from "./DataContext"
import { useSetPageTitle, useSetPageTitleButtons } from "./PageWrapper"
import { AttachmentView, CreatePostFormAddAttachmentButton } from "./Feed"
import { TileContainer } from "./Tile"
import { SchoolInfo } from "../../data/school"
import { UserInfo } from "../../data/user"
import SimpleMenu from "./SimpleMenu"
import { useUser } from "./UserContext"
import { formatDate } from "./date"
import NumericalTextBox from "./NumericalTextBox"
import MaximumLengthTextBox from "./MaximumLengthTextBox"
import { MoreVert } from "@mui/icons-material"
import { useSwitchPage } from "./App"

function SubmitAssignmentButton({ assignment, schoolId, isSubmitted, submissionAttachmentCount, refreshPost }: {
    assignment: PostInfo
    schoolId: string
    isSubmitted: boolean
    submissionAttachmentCount: number
    refreshPost: () => Promise<void>
}) {
    const { submitAssignment } = useData()
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    return <>
        <Button variant="contained" color="primary" onClick={() => setConfirmDialogOpen(true)} disabled={isSubmitted}>
            {isSubmitted ? 'Submitted' : submissionAttachmentCount > 0 ? 'Submit Assignment' : 'Mark as Complete'}
        </Button>
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
            <DialogTitle>{submissionAttachmentCount > 0 ? 'Submit Assignment' : 'Mark as Complete'}</DialogTitle>
            <DialogContent>
                {submissionAttachmentCount > 0
                ? <Typography>Are you sure you want to submit {assignment.title || 'Untitled'}?</Typography>
                : <Typography>Are you sure you want to mark {assignment.title || 'Untitled'} as complete? No files will be submitted.</Typography>
                }
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
                    {submissionAttachmentCount > 0 ? 'Submit' : 'Mark as Complete'}
                </Button>
            </DialogActions>
        </Dialog>
    </>
}

function MarkingInterface({ assignment, student, refreshAssignment }: {
    assignment: PostInfo
    student: UserInfo
    refreshAssignment: () => Promise<void>
}) {
    const { recordMarks } = useData()
    const [marks, setMarks] = useState<{ [criterionId: string]: number }>({})
    const [feedback, setFeedback] = useState<string>('')
    const [recordingMarks, setRecordingMarks] = useState(false)

    const previousMarks = assignment.marks?.[student.id]
    const previousFeedback = assignment.feedback?.[student.id]

    useEffect(() => {
        if (previousMarks) {
            setMarks(previousMarks)
        } else {
            setMarks(Object.fromEntries(assignment.markingCriteria?.map(criterion => [criterion.id, 0]) ?? []))
        }
        if (previousFeedback) {
            setFeedback(previousFeedback)
        } else {
            setFeedback('')
        }
    }, [previousMarks, previousFeedback])

    // Only includes the marks against known marking criteria
    const totalMarks = assignment.markingCriteria?.reduce((total, criterion) => {
        const mark = marks[criterion.id]
        if (mark !== undefined) {
            return total + mark
        }
        return total
    }, 0) ?? 0
    const maximumTotalMarks = assignment.markingCriteria?.reduce((total, criterion) => {
        return total + criterion.maximumMarks
    }, 0) ?? 0

    return <Grid container spacing={2} >
        <Grid item xs={12} md={6}>
            <Typography variant="h4">Marking Criteria</Typography>
        </Grid>
        <Grid item xs={12} md={3} display="flex" alignItems="end">
            {assignment.markingCriteria && assignment.markingCriteria.length > 0 &&
                <Typography>
                    {totalMarks}
                </Typography>
            }
        </Grid>
        <Grid item xs={12} md={3}>
            {assignment.markingCriteria && assignment.markingCriteria.length > 0 &&
                <Typography>
                    /{maximumTotalMarks}
                </Typography>
            }
        </Grid>
        {assignment.markingCriteria && assignment.markingCriteria.length > 0
            ? assignment.markingCriteria.map(criterion => <Fragment key={criterion.id}>
                <Grid item xs={12}>
                    <Divider />
                </Grid>
                <Grid item xs={12} md={6}>
                    <Typography>{criterion.title}</Typography>
                </Grid>
                <Grid item xs={12} md={3} display="flex" justifyItems="end">
                    <NumericalTextBox
                        numberValue={marks[criterion.id] ?? 0}
                        onNumberChange={markValue => {
                            if (markValue >= 0 && markValue <= criterion.maximumMarks) {
                                setMarks({
                                    ...marks,
                                    [criterion.id]: markValue
                                })
                            }
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <Typography>
                        /{criterion.maximumMarks}
                    </Typography>
                </Grid>
            </Fragment>)
            : <Typography>No marking criteria</Typography>}
        <Grid item xs={12}>
            <Divider />
        </Grid>
        <Grid item xs={12}>
            <Typography variant="h4">Feedback</Typography>
        </Grid>
        <Grid item xs={12}>
            <MaximumLengthTextBox
                maximumLength={10000}
                label="Feedback"
                multiline
                rows={4}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                fullWidth
                variant="outlined"
            />
        </Grid>
        <Stack direction="row" alignItems="end" spacing={2}>
            <Button variant="outlined" disabled={recordingMarks} onClick={async () => {
                setRecordingMarks(true)
                await recordMarks(assignment.schoolId, assignment.id, student.id, marks, feedback)
                await refreshAssignment()
                setRecordingMarks(false)
            }}>
                {previousMarks
                    ? 'Update marks'
                    : 'Save and return marks'
                }
            </Button>
        </Stack>
    </Grid>
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

    useSetPageTitle(postInfo ? postInfo.title || 'Untitled' : '')

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

    const switchPage = useSwitchPage()

    useSetPageTitleButtons(() => (
        isTeacherOrAdministrator && <>
            <SimpleMenu
                buttonContents={<MoreVert />}
                buttonAriaLabel="More options"
                childrenSupplier={close => [
                    <MenuItem onClick={() => {
                        switchPage(`edit-assignment/${assignment.id}`, assignment.schoolId, assignment.yearGroupId, assignment.courseId)
                        close()
                    }}>Edit</MenuItem>
                ]}
            />
            <SimpleMenu
                buttonContents={student?.name ?? 'Select a student...'}
                buttonProps={{ color: 'secondary' }}
                childrenSupplier={close => studentsWhoCanSeePost(assignment, school).map(student => (
                    <MenuItem key={student.id} onClick={() => { setCurrentStudentId(student.id); close() }}>{student.name}</MenuItem>
                ))}
            />
        </>
    ), [assignment, school, student])

    const studentsMarks = assignment.marks?.[student?.id ?? '']
    const studentsFeedback = assignment.feedback?.[student?.id ?? '']

    const hasAllMarks = assignment.markingCriteria?.every(criterion => studentsMarks?.[criterion.id] !== undefined)
    const totalMarks = assignment.markingCriteria?.reduce((total, criterion) => {
        const mark = studentsMarks?.[criterion.id]
        if (mark !== undefined) {
            return total + mark
        }
        return total
    }, 0) ?? 0
    const maximumTotalMarks = assignment.markingCriteria?.reduce((total, criterion) => {
        return total + criterion.maximumMarks
    }, 0) ?? 0

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
                    ? <MarkingInterface assignment={assignment} student={student} refreshAssignment={refreshPost} />
                    : <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h4">Marking Criteria</Typography>
                        </Grid>
                        <Grid item xs={12} md={3} display="flex" justifyItems="end">
                            {assignment.markingCriteria && assignment.markingCriteria.length > 0 && !isTeacherOrAdministrator && hasAllMarks &&
                                <Typography>
                                    {totalMarks}
                                </Typography>
                            }
                        </Grid>
                        <Grid item xs={12} md={3}>
                            {assignment.markingCriteria && assignment.markingCriteria.length > 0 &&
                                <Typography>
                                    /{maximumTotalMarks}
                                </Typography>
                            }
                        </Grid>
                        {assignment.markingCriteria && assignment.markingCriteria.length > 0
                            ? assignment.markingCriteria.map(criterion => <Fragment key={criterion.id}>
                                <Grid item xs={12}>
                                    <Divider />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography>{criterion.title}</Typography>
                                </Grid>
                                <Grid item xs={12} md={3} display="flex" justifyItems="end">
                                    {!isTeacherOrAdministrator && studentsMarks && studentsMarks[criterion.id] !== undefined &&
                                        <Typography>
                                            {studentsMarks[criterion.id]}
                                        </Typography>
                                    }
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Typography>
                                        /{criterion.maximumMarks}
                                    </Typography>
                                </Grid>
                            </Fragment>)
                            : <Typography>No marking criteria</Typography>
                        }
                        {!isTeacherOrAdministrator && studentsFeedback && <>
                            <Grid item xs={12}>
                                <Divider />
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="h4">Feedback</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography>
                                    {studentsFeedback}
                                </Typography>
                            </Grid>
                        </>
                        }
                    </Grid>
                }
            </Box>
        </Stack>
        {
            isTeacherOrAdministrator && student && <>
                <Divider />
                <Typography variant="h4">{student.name}'s Work</Typography>
                {isSubmitted && <Typography>
                    Submitted {formatDate(new Date(assignment.isoSubmissionDates?.[currentStudentId ?? ''] ?? ''))}
                </Typography>}
                <TileContainer>
                    {assignment.submissionTemplates?.map(attachment => (
                        <AttachmentView key={attachment.id} attachment={attachment} postId={assignment.id} schoolId={school.id} students={school.students} selectedStudentId={student.id} />
                    ))}
                    {assignment.studentAttachments?.[student.id]?.map(attachment => (
                        <AttachmentView key={attachment.id} attachment={attachment} postId={assignment.id} schoolId={school.id} students={school.students} selectedStudentId={student.id} />
                    ))}
                </TileContainer>
                {(!assignment.submissionTemplates || assignment.submissionTemplates.length === 0) && (!assignment.studentAttachments?.[student.id] || assignment.studentAttachments?.[student.id].length === 0) &&
                    <Typography>No attachments</Typography>
                }
            </>
        }
        {
            !isTeacherOrAdministrator && <>
                <Divider />
                <Typography variant="h4">Your Work</Typography>
                {isSubmitted && <Typography>
                    Submitted {formatDate(new Date(assignment.isoSubmissionDates?.[currentStudentId ?? ''] ?? ''))}
                </Typography>}
                <Stack direction="column" spacing={2} alignItems="center">
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
                </Stack>
                <Stack direction="row" spacing={2} justifyContent="end">
                    <SubmitAssignmentButton
                    schoolId={school.id}
                    assignment={assignment}
                    isSubmitted={isSubmitted}
                    refreshPost={refreshPost}
                    submissionAttachmentCount={assignment.studentAttachments?.[student?.id ?? '']?.length ?? 0 + (assignment.submissionTemplates?.length ?? 0)}
                    />
                </Stack>
            </>
        }
    </Stack >
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
