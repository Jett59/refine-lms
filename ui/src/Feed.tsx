import { useEffect, useMemo, useState } from "react"
import { useData, useRelevantSchoolInfo, useRole } from "./DataContext"
import { Avatar, Button, FormControlLabel, IconButton, MenuItem, Paper, Radio, RadioGroup, Stack, TextField, Tooltip, Typography } from "@mui/material"
import { AttachFile, ExpandMore, Menu, PostAdd } from "@mui/icons-material"
import { PostInfo, PostTemplate, AttachmentTemplate, AttachmentInfo } from "../../data/post"
import InfiniteScroll from "react-infinite-scroll-component"
import { formatDate } from "./date"
import { CourseInfo, SchoolInfo } from "../../data/school"
import SimpleMenu from "./SimpleMenu"
import useDrivePicker from "react-google-drive-picker"
import { GOOGLE_PROJECT_NUMBER, GOOGLE_CLIENT_ID, GOOGLE_DRIVE_DEVELOPER_KEY } from "./main"
import { useUser } from "./UserContext"
import { PickerCallback } from "react-google-drive-picker/dist/typeDefs"
import { TileContainer } from "./Tile"
import { useError } from "./ErrorContext"

function AttachmentView({ schoolId, postId, attachment }: {
    schoolId: string
    postId: string
    attachment: AttachmentInfo
}) {
    const { getAttachmentLink } = useData()
    const [opening, setOpening] = useState(false)

    return <Button
        onClick={async () => {
            if (attachment.accessLink) {
                window.open(attachment.accessLink, '_blank')
            } else {
                setOpening(true)
                const link = await getAttachmentLink(schoolId, postId, attachment.id)
                if (link) {
                    window.open(link, '_blank')
                }
                attachment.accessLink = link ?? undefined
                setOpening(false)
            }
        }}
        disabled={opening}
    >{attachment.title}</Button>
}

function CreatePostFormAttachmentView({ attachmentTemplate, onRemove, update }: {
    attachmentTemplate: AttachmentTemplate
    onRemove: () => void
    update: (attachment: AttachmentTemplate) => void
}) {
    return <Stack direction="row" spacing={2}>
        <img src={attachmentTemplate.thumbnail} aria-hidden />
        <Typography variant="h6">{attachmentTemplate.title}</Typography>
        <SimpleMenu
            buttonContents={attachmentTemplate.shareMode === 'shared' ? 'Shared Resource' : 'Handout'}
            childrenSupplier={close => [
                <MenuItem onClick={() => {
                    update({ ...attachmentTemplate, shareMode: 'shared' })
                    close()
                }}>Shared Resource (one copy for everyone)</MenuItem>,
                <MenuItem onClick={() => {
                    update({ ...attachmentTemplate, shareMode: 'copied', othersCanEdit: true })
                    close()
                }}>Handout (personal copies)</MenuItem>
            ]}
        />
        <SimpleMenu
            buttonContents={attachmentTemplate.othersCanEdit ? 'Editable' : 'Read-only'}
            childrenSupplier={close => [
                <MenuItem onClick={() => {
                    update({ ...attachmentTemplate, othersCanEdit: false })
                    close()
                }}
                    disabled={attachmentTemplate.shareMode === 'copied'}
                >Read-only</MenuItem>,
                < MenuItem onClick={() => {
                    update({ ...attachmentTemplate, othersCanEdit: true })
                    close()
                }}>Editable</MenuItem>
            ]}
        />
        <SimpleMenu
            buttonContents={<Menu />}
            buttonAriaLabel={`Attachment options for ${attachmentTemplate.title}`}
            childrenSupplier={close => [
                <MenuItem onClick={() => {
                    onRemove()
                    close()
                }}>Remove</MenuItem>
            ]}
        />
    </Stack >
}

function CreatePostForm({ schoolId, schoolInfo, yearGroupId, courseId, courseInfo, disabled, onClick, close }: {
    schoolId: string
    schoolInfo: SchoolInfo
    yearGroupId: string
    courseId?: string
    courseInfo?: CourseInfo
    disabled?: boolean
    onClick: (post: PostTemplate) => void
    close: () => void
}) {
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [isPrivate, setIsPrivate] = useState(false)
    const [attachments, setAttachments] = useState<AttachmentTemplate[]>([])

    const [classId, setClassId] = useState<string | undefined>(undefined)
    const classInfo = courseInfo?.classes.find(c => c.id === classId)

    const isStudent = useRole(schoolInfo) === 'student'

    const [openPicker, _authResponse] = useDrivePicker()
    const { getGoogleAccessToken } = useUser()
    const handleOpenPicker = async () => {
        openPicker({
            clientId: GOOGLE_CLIENT_ID,
            developerKey: GOOGLE_DRIVE_DEVELOPER_KEY,
            token: await getGoogleAccessToken() ?? undefined,
            appId: GOOGLE_PROJECT_NUMBER,
            showUploadView: true,
            callbackFunction: (data: PickerCallback) => {
                if (data.action === 'picked') {
                    setAttachments(attachments => [...attachments, ...data.docs.map(doc => ({
                        title: doc.name,
                        mimeType: doc.mimeType,
                        shareMode: 'shared' as 'shared',
                        othersCanEdit: false,
                        host: 'google' as 'google',
                        googleFileId: doc.id,
                        thumbnail: doc.iconUrl,
                    }))])
                }
            }
        })
    }

    return <Stack direction="column" spacing={2} padding={2}>
        <Typography variant="h6">Create post</Typography>
        <TextField
            autoFocus
            autoComplete="off"
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            sx={{ maxWidth: '50em' }}
        />
        <TextField
            multiline
            label="Content"
            value={content}
            onChange={e => setContent(e.target.value)}
            // Set the default height to a certain number of lines
            inputProps={{ style: { lineHeight: '1.5em', minHeight: '6em' } }}
        />
        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {isStudent &&
                <RadioGroup row value={isPrivate ? "private" : "public"} onChange={e => setIsPrivate(e.target.value === "private")}>
                    <FormControlLabel value="public" control={<Radio />} label="Public" />
                    <FormControlLabel value="private" control={<Radio />} label="Private" />
                </RadioGroup>
            }
            {courseInfo &&
                <SimpleMenu
                    buttonContents={classInfo?.name ?? 'All classes'}
                    rounded
                    buttonProps={{ endIcon: <ExpandMore /> }}
                    childrenSupplier={close => [
                        <MenuItem onClick={() => { setClassId(undefined); close() }}>All classes</MenuItem>,
                        ...courseInfo.classes.map(c => <MenuItem key={c.id} onClick={() => { setClassId(c.id); close() }}>{c.name}</MenuItem>)
                    ]}
                />
            }
            <Tooltip title="Attach File">
                <IconButton
                    onClick={handleOpenPicker}
                    disabled={disabled}
                >
                    <AttachFile />
                </IconButton>
            </Tooltip>
        </Stack>
        {attachments.map(attachment => (
            <CreatePostFormAttachmentView
                key={attachment.googleFileId}
                attachmentTemplate={attachment}
                onRemove={() => setAttachments(attachments => attachments.filter(a => a !== attachment))}
                update={newAttachment => setAttachments(attachments => attachments.map(a => a === attachment ? newAttachment : a))}
            />
        ))}
        <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={() => onClick({
                schoolId,
                yearGroupId,
                courseId,
                classIds: classId ? [classId] : undefined,
                type: 'post',
                private: isPrivate,
                title,
                content,
                attachments
            })} disabled={disabled}>Post</Button>
            <Button variant="outlined" onClick={close} disabled={disabled}>Cancel</Button>
        </Stack>
    </Stack>
}

function PostView({ post, courseInfo }: { post: PostInfo, courseInfo?: CourseInfo }) {
    const classNames = courseInfo?.classes.filter(c => post.classIds?.includes(c.id)).map(c => c.name).join(', ')
    return <Paper elevation={4}>
        <Stack direction="column" padding={2} spacing={2}>
            <Typography variant="h6">{post.title}</Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar aria-hidden src={post.poster.picture} />
                <Typography>{post.poster.name}</Typography>
            </Stack>
            <Typography>Posted {formatDate(new Date(post.postDate))}{classNames ? ` to ${classNames}` : ''}</Typography>
            <Typography variant="body1">{post.content}</Typography>
            <TileContainer>
                {post.attachments.map(attachment => <AttachmentView key={attachment.id} schoolId={post.schoolId} postId={post.id} attachment={attachment} />)}
            </TileContainer>
        </Stack>
    </Paper>
}

export default function Feed({ schoolId, yearGroupId, courseId }: {
    schoolId: string
    yearGroupId: string
    courseId?: string
}) {
    const { createPost, listPosts } = useData()
    const { getGoogleAccessToken } = useUser()
    const { addError } = useError()

    const [posts, setPosts] = useState<PostInfo[]>([])
    const [isEnd, setIsEnd] = useState(false)
    const [loading, setLoading] = useState(false)

    const [creatingPost, setCreatingPost] = useState(false)

    const BATCH_SIZE = 10

    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const yearGroup = schoolInfo?.yearGroups.find(yg => yg.id === yearGroupId)
    const course = yearGroup?.courses.find(c => c.id === courseId)
    const classIds = useMemo(() => course?.classes.map(c => c.id), [course])

    const containerName = course?.name ?? yearGroup?.name

    const [posting, setPosting] = useState(false)

    const refreshPostsList = async () => {
        if (!loading) {
            setPosts([])
            setLoading(true)
            const result = await listPosts(null, BATCH_SIZE, schoolId, yearGroupId, courseId, classIds)
            if (result) {
                setPosts(result.posts)
                setIsEnd(result.isEnd)
            } else {
                setIsEnd(true)
            }
            setLoading(false)
        }
    }
    if (classIds) {
        console.log(classIds)
    }
    useEffect(() => {
        console.log('AAA')
        if (posts.length < BATCH_SIZE && schoolInfo) {
            console.log('BBB', classIds)
            refreshPostsList()
        }
    }, [schoolId, yearGroupId, courseId, classIds, schoolInfo])

    const fetchMore = async () => {
        if (!isEnd && !loading) {
            if (posts.length === 0) {
                await refreshPostsList()
            } else {
                setLoading(true)
                const result = await listPosts(posts[posts.length - 1].postDate, BATCH_SIZE, schoolId, yearGroupId, courseId, classIds)
                if (result) {
                    setPosts([...posts, ...result.posts])
                    setIsEnd(result.isEnd)
                } else {
                    setIsEnd(true)
                }
                setLoading(false)
            }
        }
    }

    if (!schoolInfo) {
        return <Typography>Loading...</Typography>
    }

    const createPostButton = <Tooltip title="Create Post">
        <IconButton
            disabled={creatingPost}
            onClick={() => setCreatingPost(true)}
        >
            <PostAdd />
        </IconButton>
    </Tooltip>

    return <Stack direction="column" spacing={2} padding={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">Posts to {containerName}</Typography>
            {createPostButton}
        </Stack>
        {creatingPost &&
            <CreatePostForm
                disabled={posting}
                schoolId={schoolId}
                schoolInfo={schoolInfo}
                yearGroupId={yearGroupId}
                courseId={courseId}
                courseInfo={course}
                onClick={async (post) => {
                    setPosting(true)
                    const googleAccessToken = await getGoogleAccessToken()
                    if (googleAccessToken) {
                        await createPost(post, googleAccessToken)
                        setCreatingPost(false)
                        refreshPostsList()
                    } else {
                        addError('Could not authenticate to Google')
                    }
                    setPosting(false)
                }}
                close={() => setCreatingPost(false)}
            />
        }
        {posts.length === 0 && !loading && !creatingPost &&
            <Typography>No posts yet. Click {createPostButton} to create the first one.</Typography>
        }
        <InfiniteScroll
            dataLength={posts.length}
            next={fetchMore}
            hasMore={!isEnd}
            loader={<Typography>Loading...</Typography>}
        >
            {posts.map(post => <PostView key={post.id} post={post} courseInfo={course} />)}
        </InfiniteScroll>
    </Stack>
}
