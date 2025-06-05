import { Box, Button, Divider, Grid, IconButton, MenuItem, Stack, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useSetPageTitle } from "./PageWrapper"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getVisibleClassIds, useData, useRelevantSchoolInfo } from "./DataContext"
import SimpleMenu from "./SimpleMenu"
import { ExpandMore, Remove } from "@mui/icons-material"
import { CreatePostFormAddAttachmentButton, CreatePostFormAttachmentView } from "./Feed"
import { AttachmentTemplate, MarkingCriterionTemplate, PostInfo } from "../../data/post"
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from "dayjs"
import { useConfirmationDialog } from "./ConfirmationDialog"
import NumericalTextBox from "./NumericalTextBox"
import MaximumLengthTextBox from "./MaximumLengthTextBox"

function CriterionViewInGrid({ criterion, update, remove }: {
    criterion: MarkingCriterionTemplate
    update: (newValue: MarkingCriterionTemplate) => void
    remove: () => void
}) {
    return <>
        <Grid item xs={12}>
            <Divider />
        </Grid>
        <Grid item xs={12} md={6}>
            <MaximumLengthTextBox
                maximumLength={250}
                autoComplete="off"
                value={criterion.title}
                onChange={e => update({ ...criterion, title: e.target.value })}
                label="title"
                required
            />
        </Grid>
        <Grid item xs={1}>
            <Typography>/</Typography>
        </Grid>
        <Grid item xs={9} md={4}>
            <NumericalTextBox
                numberValue={criterion.maximumMarks}
                onNumberChange={newValue => {
                    update({ ...criterion, maximumMarks: Math.max(0, newValue) })
                }}
            />
        </Grid>
        <Grid item xs={2} md={1}>
            <IconButton
                onClick={() => remove()}
                aria-label="Remove Criterion"
            >
                <Remove />
            </IconButton>
        </Grid>
    </>
}

export default function CreateAssignment({ original, editing }: {
    original?: PostInfo
    editing?: boolean
}) {
    const { schoolId, yearGroupId, courseId } = useParams()
    const { createPost, updatePost } = useData()
    const school = useRelevantSchoolInfo(schoolId)
    const course = school?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)

    const navigate = useNavigate()

    useSetPageTitle(original ? original.title || 'Untitled' : 'Create Assignment')

    const theme = useTheme()
    const shouldUseColumns = useMediaQuery(theme.breakpoints.up('md'))

    const [loading, setLoading] = useState(false)

    const [title, setTitle] = useState(original?.title ?? '')
    const [dueDate, setDueDate] = useState<Dayjs | null>(original?.isoDueDate ? dayjs(original.isoDueDate) : null)
    const [content, setContent] = useState(original?.content ?? '')
    const [classId, setClassId] = useState<string | undefined>(original?.classIds?.[0] ?? undefined)
    const classInfo = course?.classes.find(cls => cls.id === classId)
    const [attachments, setAttachments] = useState<AttachmentTemplate[]>(original?.attachments.map(attachment => ({
        title: attachment.title,
        thumbnail: attachment.thumbnail,
        mimeType: attachment.mimeType,
        shareMode: attachment.shareMode,
        othersCanEdit: attachment.othersCanEdit,
        host: attachment.host,
        googleFileId: attachment.googleFileId
    })) ?? [])
    const [submissionTemplates, setSubmissionTemplates] = useState<AttachmentTemplate[]>(original?.submissionTemplates?.map(attachment => ({
        title: attachment.title,
        thumbnail: attachment.thumbnail,
        mimeType: attachment.mimeType,
        shareMode: attachment.shareMode,
        othersCanEdit: attachment.othersCanEdit,
        host: attachment.host,
        googleFileId: attachment.googleFileId
    })) ?? [])
    const [markingCriteria, setMarkingCriteria] = useState<MarkingCriterionTemplate[]>(original?.markingCriteria?.map(criterion => ({
        id: criterion.id,
        title: criterion.title,
        maximumMarks: criterion.maximumMarks
    })) ?? [])

    const isEmpty = !title && !content && attachments.length === 0 && submissionTemplates.length === 0 && markingCriteria.length === 0
    const createConfirmationDialog = useConfirmationDialog()

    if (!schoolId || !yearGroupId || !courseId) {
        return <Typography>Not found</Typography>
    }

    const markingCriteriaValid = markingCriteria.every(criterion => criterion.title.trim() !== '' && criterion.maximumMarks > 0)

    return <Stack direction="column" spacing={2}>
        <Stack direction="column" alignItems="centre" spacing={2}>
            <MaximumLengthTextBox
                maximumLength={150}
                autoFocus
                autoComplete="off"
                value={title}
                onChange={e => setTitle(e.target.value)}
                label="Title"
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                    label="Due Date"
                    value={dueDate}
                    onChange={date => setDueDate(date ?? null)}
                    ampm={false}
                    format="DD/MM/YYYY HH:mm"
                    enableAccessibleFieldDOMStructure
                />
            </LocalizationProvider>
        </Stack>
        <Stack direction={shouldUseColumns ? 'row' : 'column'} spacing={2}>
            <Box flex={3}>
                <Typography variant="h5">Instructions</Typography>
                <MaximumLengthTextBox
                    maximumLength={10000}
                    multiline
                    fullWidth
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    inputProps={{ style: { lineHeight: '1.5em', minHeight: '5em' } }}
                />
                <Stack direction="row" spacing={2}>
                    <SimpleMenu
                        buttonContents={classInfo?.name ?? 'All classes'}
                        rounded
                        buttonProps={{ endIcon: <ExpandMore />, disabled: editing }}
                        childrenSupplier={close => [
                            <MenuItem key="all" onClick={() => { setClassId(undefined); close() }}>All classes</MenuItem>,
                            ...course?.classes.map(c => <MenuItem key={c.id} onClick={() => { setClassId(c.id); close() }}>{c.name}</MenuItem>) ?? []
                        ]}
                    />
                    <CreatePostFormAddAttachmentButton disabled={loading} addAttachments={attachments => setAttachments(oldAttachments => [...oldAttachments, ...attachments])} />
                </Stack>
                {attachments.map(attachment => (
                    <CreatePostFormAttachmentView
                        key={attachment.googleFileId}
                        attachmentTemplate={attachment}
                        onRemove={() => setAttachments(attachments => attachments.filter(a => a !== attachment))}
                        update={newAttachment => setAttachments(attachments => attachments.map(a => a === attachment ? newAttachment : a))}
                    />
                ))}
            </Box>
            <Box flex={1}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h5">Marking Criteria</Typography>
                    </Grid>
                    <Grid item xs={1}>
                        <Typography>/</Typography>
                    </Grid>
                    <Grid item xs={11} md={5}>
                        <Typography padding={1}>
                            {markingCriteria.reduce((a, b) => a + b.maximumMarks, 0)}
                        </Typography>
                    </Grid>
                    {markingCriteria.map((criterion, index) => (
                        <CriterionViewInGrid
                            key={index}
                            criterion={criterion}
                            update={newValue => {
                                const newCriteria = [...markingCriteria]
                                newCriteria[index] = newValue
                                setMarkingCriteria(newCriteria)
                            }}
                            remove={() => setMarkingCriteria(markingCriteria.filter((_, i) => i !== index))}
                        />
                    ))}
                    <Grid item xs={12}>
                        <Divider />
                    </Grid>
                    <Grid item xs={12}>
                        <Button
                            onClick={() => setMarkingCriteria([...markingCriteria, { title: '', maximumMarks: 0 }])}
                            disabled={!markingCriteriaValid}
                        >Add Criterion</Button>
                    </Grid>
                </Grid>
            </Box>
        </Stack>
        <Divider />
        <Box>
            <Typography variant="h5">Work Templates</Typography>
            {
                submissionTemplates.map(template => (
                    <CreatePostFormAttachmentView
                        key={template.googleFileId}
                        disablePermissionsSettings
                        attachmentTemplate={template}
                        onRemove={() => setSubmissionTemplates(templates => templates.filter(t => t !== template))}
                        update={newAttachment => setAttachments(attachments => attachments.map(a => a === template ? newAttachment : a))}
                    />
                ))
            }
            <CreatePostFormAddAttachmentButton
                disabled={loading}
                defaultShareMode="copied"
                defaultOthersCanEdit
                addAttachments={templates => setSubmissionTemplates(oldTemplates => [...oldTemplates, ...templates])}
            />
        </Box>
        <Divider />
        <Stack direction="row" justifyContent="end" spacing={2}>
            <Button
                variant="outlined"
                disabled={loading}
                onClick={() => {
                    if (isEmpty) {
                        navigate(-1)
                    } else {
                        createConfirmationDialog(editing ? 'Discard Changes' : 'Discard Assignment', 'Discard', () => navigate(-1))
                    }
                }}>Discard</Button>
            <Button
                variant="contained"
                disabled={loading || !markingCriteriaValid}
                onClick={async () => {
                    if (editing) {
                        setLoading(true)
                        const updatedSuccessfully = await updatePost(original?.id ?? '', schoolId, {
                            schoolId,
                            yearGroupId,
                            courseId,
                            classIds: classId ? [classId] : undefined,
                            type: 'assignment',
                            private: false,
                            title,
                            content,
                            linkedSyllabusContentIds: [],
                            attachments,
                            isoDueDate: dueDate?.isValid() ? dueDate?.toISOString() ?? undefined : undefined,
                            submissionTemplates,
                            markingCriteria
                        })
                        if (updatedSuccessfully) {
                            navigate(-1)
                        } else {
                            setLoading(false)
                        }
                    } else {
                        setLoading(true)
                        const createdSuccessfully = await createPost({
                            schoolId,
                            yearGroupId,
                            courseId,
                            classIds: classId ? [classId] : undefined,
                            type: 'assignment',
                            private: false,
                            title,
                            content,
                            linkedSyllabusContentIds: [],
                            attachments,
                            isoDueDate: dueDate?.isValid() ? dueDate?.toISOString() ?? undefined : undefined,
                            submissionTemplates,
                            markingCriteria
                        })
                        if (createdSuccessfully) {
                            navigate(-1)
                        } else {
                            setLoading(false)
                        }
                    }
                }}
            >{editing ? 'Save' : 'Assign'}</Button>
        </Stack>
    </Stack>
}

export function EditAssignment() {
    const { schoolId, yearGroupId, courseId, postId } = useParams()
    const school = useRelevantSchoolInfo(schoolId)
    const { getPost } = useData()
    const [post, setPost] = useState<PostInfo | undefined>(undefined)

    useEffect(() => {
        if (schoolId && school && yearGroupId && courseId && postId) {
            const classIds = getVisibleClassIds(school, yearGroupId, courseId)
            getPost(postId, schoolId, yearGroupId, courseId, classIds).then(post => {
                if (post) {
                    setPost(post)
                }
            })
        }
    }, [schoolId, school, yearGroupId, courseId, postId])
    if (!post) {
        return <Typography>Loading...</Typography>
    }
    return <CreateAssignment original={post} editing />
}
