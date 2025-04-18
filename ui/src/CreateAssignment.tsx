import { Box, Button, Divider, MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useSetPageTitle } from "./PageWrapper"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useData, useRelevantSchoolInfo } from "./DataContext"
import SimpleMenu from "./SimpleMenu"
import { ExpandMore } from "@mui/icons-material"
import { CreatePostFormAddAttachmentButton, CreatePostFormAttachmentView } from "./Feed"
import { AttachmentTemplate, MarkingCriterion } from "../../data/post"
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from "dayjs"

function CriterionView({ criterion, update }: {
    criterion: MarkingCriterion
    update: (newValue: MarkingCriterion) => void
}) {
    return <Stack direction="row">
        <TextField
            autoComplete="off"
            value={criterion.title}
            onChange={e => update({ ...criterion, title: e.target.value })}
            label="title"
        />
        <Typography>/</Typography>
        <TextField
            type="number"
            value={criterion.maximumMarks}
            onChange={e => {
                update({ ...criterion, maximumMarks: Math.max(0, Number(e.target.value)) })
            }}
        />
    </Stack>
}

export default function CreateAssignment() {
    const { schoolId, yearGroupId, courseId } = useParams()
    const { createPost } = useData()
    const school = useRelevantSchoolInfo(schoolId)
    const course = school?.yearGroups.find(yg => yg.id === yearGroupId)?.courses.find(c => c.id === courseId)

    const navigate = useNavigate()

    useSetPageTitle('Create Assignment')

    const theme = useTheme()
    const shouldUseColumns = useMediaQuery(theme.breakpoints.up('md'))

    const [disabled, setDisabled] = useState(false)

    const [title, setTitle] = useState('')
    const [dueDate, setDueDate] = useState<Dayjs | null>(null)
    const [content, setContent] = useState('')
    const [classId, setClassId] = useState<string | undefined>(undefined)
    const classInfo = course?.classes.find(cls => cls.id === classId)
    const [attachments, setAttachments] = useState<AttachmentTemplate[]>([])
    const [submissionTemplates, setSubmissionTemplates] = useState<AttachmentTemplate[]>([])
    const [markingCriteria, setMarkingCriteria] = useState<MarkingCriterion[]>([])

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
                <Stack direction="row">
                    <SimpleMenu
                        buttonContents={classInfo?.name ?? 'All classes'}
                        rounded
                        buttonProps={{ endIcon: <ExpandMore /> }}
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
                <Stack direction="row">
                    <Typography variant="h5">Marking Criteria</Typography>
                    <Typography>
                        {`/${markingCriteria.reduce((a, b) => a + b.maximumMarks, 0)}`}
                    </Typography>
                </Stack>
                <Stack direction="column">
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
        <Stack direction="row" justifyContent="end">
            <Button
                variant="outlined"
                disabled={disabled}
                onClick={() => navigate(-1)}
            >Cancel</Button>
            <Button
                variant="contained"
                disabled={disabled}
                onClick={async () => {
                    setDisabled(true)
                    await createPost({
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
                    navigate(-1)
                }}
            >Assign</Button>
        </Stack>
    </Stack>
}
