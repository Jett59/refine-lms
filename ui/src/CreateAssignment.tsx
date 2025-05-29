import { Box, Button, Divider, MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useSetPageTitle } from "./PageWrapper"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getVisibleClassIds, useData, useRelevantSchoolInfo } from "./DataContext"
import SimpleMenu from "./SimpleMenu"
import { ExpandMore } from "@mui/icons-material"
import { CreatePostFormAddAttachmentButton, CreatePostFormAttachmentView } from "./Feed"
import { AttachmentTemplate, MarkingCriterionTemplate, PostInfo } from "../../data/post"
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from "dayjs"
import { useConfirmationDialog } from "./ConfirmationDialog"
import NumericalTextBox from "./NumericalTextBox"

function CriterionView({ criterion, update }: {
    criterion: MarkingCriterionTemplate
    update: (newValue: MarkingCriterionTemplate) => void
}) {
    return <Stack direction="row">
        <TextField
            autoComplete="off"
            value={criterion.title}
            onChange={e => update({ ...criterion, title: e.target.value })}
            label="title"
        />
        <Typography>/</Typography>
        <NumericalTextBox
            value={criterion.maximumMarks}
            onChange={newValue => {
                update({ ...criterion, maximumMarks: Math.max(0, newValue) })
            }}
        />
    </Stack>
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

    useSetPageTitle(original ? original.title : 'Create Assignment')

    const theme = useTheme()
    const shouldUseColumns = useMediaQuery(theme.breakpoints.up('md'))

    const [disabled, setDisabled] = useState(false)

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

    return <Stack direction="column" spacing={2}>
        <Stack direction="column" alignItems="centre" spacing={2}>
            <TextField autoFocus autoComplete="off" value={title} onChange={e => setTitle(e.target.value)} label="Title" />
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
                <TextField
                    multiline
                    fullWidth
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    inputProps={{ style: { lineHeight: '1.5em', minHeight: '18em' } }}
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
                    <CreatePostFormAddAttachmentButton disabled={disabled} addAttachments={attachments => setAttachments(oldAttachments => [...oldAttachments, ...attachments])} />
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
                <Stack direction="row" spacing={2}>
                    <Typography variant="h5">Marking Criteria</Typography>
                    <Typography>
                        {`/${markingCriteria.reduce((a, b) => a + b.maximumMarks, 0)}`}
                    </Typography>
                </Stack>
                <Stack direction="column" spacing={2}>
                    {markingCriteria.map((criterion, index) => (
                        <CriterionView
                            key={index}
                            criterion={criterion}
                            update={newValue => {
                                const newCriteria = [...markingCriteria]
                                newCriteria[index] = newValue
                                setMarkingCriteria(newCriteria)
                            }}
                        />
                    ))}
                    <Button
                        onClick={() => setMarkingCriteria([...markingCriteria, { title: '', maximumMarks: 0 }])}
                        disabled={markingCriteria.length > 0 && markingCriteria[markingCriteria.length - 1].maximumMarks === 0}
                    >Add Criterion</Button>
                </Stack>
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
                disabled={disabled}
                defaultShareMode="copied"
                defaultOthersCanEdit
                addAttachments={templates => setSubmissionTemplates(oldTemplates => [...oldTemplates, ...templates])}
            />
        </Box>
        <Divider />
        <Stack direction="row" justifyContent="end" spacing={2}>
            <Button
                variant="outlined"
                disabled={disabled}
                onClick={() => {
                    if (isEmpty) {
                        navigate(-1)
                    } else {
                        createConfirmationDialog(editing ? 'Discard Changes' : 'Discard Assignment', 'Discard', () => navigate(-1))
                    }
                }}>Discard</Button>
            <Button
                variant="contained"
                disabled={disabled}
                onClick={async () => {
                    if (editing) {
                        setDisabled(true)
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
                        }else {
                            setDisabled(false)
                        }
                    } else {
                        setDisabled(true)
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
                        }else {
                            setDisabled(false)
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
