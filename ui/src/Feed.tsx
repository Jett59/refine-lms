import { useEffect, useMemo, useRef, useState } from "react"
import { useData, useIsTeacherOrAdministrator, useRelevantSchoolInfo, useRole } from "./DataContext"
import { Avatar, Button, FormControlLabel, IconButton, List, ListItem, MenuItem, Paper, Radio, RadioGroup, Stack, TextField, Tooltip, Typography } from "@mui/material"
import { AttachFile, ExpandLess, ExpandMore, MoreVert, NoteAdd, PostAdd, Remove } from "@mui/icons-material"
import { PostInfo, PostTemplate, AttachmentTemplate, AttachmentInfo, PostType, CommentInfo } from "../../data/post"
import InfiniteScroll from "react-infinite-scroll-component"
import { formatDate } from "./date"
import { CourseInfo, SchoolInfo, SyllabusContent } from "../../data/school"
import SimpleMenu from "./SimpleMenu"
import useDrivePicker from "react-google-drive-picker"
import { GOOGLE_PROJECT_NUMBER, GOOGLE_CLIENT_ID, GOOGLE_DRIVE_DEVELOPER_KEY } from "./main"
import { useUser } from "./UserContext"
import { PickerCallback } from "react-google-drive-picker/dist/typeDefs"
import { TileContainer } from "./Tile"
import { getLocation, useSwitchPage } from "./App"
import { Link } from "react-router-dom"
import { UserInfo } from "../../data/user"
import { studentsWhoCanSeePost } from "./Post"
import { useConfirmationDialog } from "./ConfirmationDialog"

export function AttachmentView({ schoolId, postId, attachment, students, selectedStudentId }: {
    schoolId: string
    postId: string
    attachment: AttachmentInfo
    students: UserInfo[]
    selectedStudentId?: string
}) {
    const { getAttachmentLink } = useData()
    const schoolInfo = useRelevantSchoolInfo(schoolId)
    const [opening, setOpening] = useState(false)
    const isTeacherOrAdministrator = useIsTeacherOrAdministrator(schoolInfo)

    if (attachment.shareMode === 'copied' && isTeacherOrAdministrator && !selectedStudentId) {
        return <SimpleMenu
            buttonContents={attachment.title}
            buttonProps={{ disabled: opening }}
            childrenSupplier={close => (
                students.map(student => (
                    <MenuItem
                        onClick={async () => {
                            close()
                            setOpening(true)
                            const link = await getAttachmentLink(schoolId, postId, attachment.id, student.id)
                            if (link) {
                                window.open(link, '_blank')
                            }
                            setOpening(false)
                        }}
                    >
                        {student.name}
                    </MenuItem>
                ))
            )}
        />
    } else {
        return <Button
            onClick={async () => {
                if (attachment.accessLink) {
                    window.open(attachment.accessLink, '_blank')
                } else {
                    setOpening(true)
                    const link = await getAttachmentLink(schoolId, postId, attachment.id, selectedStudentId)
                    if (link) {
                        window.open(link, '_blank')
                    }
                    if (attachment.shareMode === 'copied') {
                        attachment.accessLink = link ?? undefined
                    }
                    setOpening(false)
                }
            }}
            disabled={opening}
        >{attachment.title}</Button>
    }
}

export function CreatePostFormAttachmentView({ attachmentTemplate, disablePermissionsSettings, onRemove, update }: {
    attachmentTemplate: AttachmentTemplate
    disablePermissionsSettings?: boolean
    onRemove: () => void
    update: (attachment: AttachmentTemplate) => void
}) {
    return <Stack direction="row" spacing={2}>
        <img src={attachmentTemplate.thumbnail} aria-hidden />
        <Typography variant="h6">{attachmentTemplate.title}</Typography>
        <SimpleMenu
            rounded
            buttonContents={attachmentTemplate.shareMode === 'copied' ? 'Handout' : attachmentTemplate.othersCanEdit ? 'Group Work' : 'Resource'}
            buttonProps={{ endIcon: <ExpandMore />, disabled: disablePermissionsSettings }}
            childrenSupplier={close => [
                <MenuItem onClick={() => {
                    update({ ...attachmentTemplate, shareMode: 'shared', othersCanEdit: false })
                    close()
                }}>Resource (one read-only copy for all students)</MenuItem>,
                <MenuItem onClick={() => {
                    update({ ...attachmentTemplate, shareMode: 'copied', othersCanEdit: true })
                    close()
                }}>Handout (individual editable copies for each student)</MenuItem>,
                <MenuItem onClick={() => {
                    update({ ...attachmentTemplate, shareMode: 'shared', othersCanEdit: true })
                    close()
                }}>Group Work (one editable copy for all students)</MenuItem>,
            ]}
        />
        <IconButton onClick={onRemove} aria-label="Remove attachment">
            <Remove />
        </IconButton>
    </Stack >
}

export function CreatePostFormAddAttachmentButton({ disabled, defaultShareMode, defaultOthersCanEdit, addAttachments }: {
    disabled?: boolean
    addAttachments: (attachments: AttachmentTemplate[]) => void
    defaultShareMode?: 'shared' | 'copied'
    defaultOthersCanEdit?: boolean
}) {
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
                    addAttachments(data.docs.map(doc => ({
                        title: doc.name,
                        mimeType: doc.mimeType,
                        shareMode: defaultShareMode ?? 'shared' as 'shared',
                        othersCanEdit: defaultOthersCanEdit ?? false,
                        host: 'google' as 'google',
                        googleFileId: doc.id,
                        thumbnail: doc.iconUrl,
                    })))
                }
            }
        })
    }

    return <Tooltip title="Attach File">
        <IconButton
            onClick={handleOpenPicker}
            disabled={disabled}
        >
            <AttachFile />
        </IconButton>
    </Tooltip>
}

function AddSyllabusContentButton({ course, callback }: {
    course: CourseInfo
    callback: (content: SyllabusContent) => void
}) {
    return <SimpleMenu
        buttonContents="Add Syllabus Content"
        childrenSupplier={close => [
            ...course.syllabusContent.map(content => <MenuItem key={content.id} onClick={() => {
                callback(content)
                close()
            }}>{content.content}</MenuItem>)
        ]}
    />
}

function CreatePostForm({ schoolId, schoolInfo, yearGroupId, courseId, courseInfo, postType, disabled, onClick, close }: {
    schoolId: string
    schoolInfo: SchoolInfo
    yearGroupId: string
    courseId?: string
    courseInfo?: CourseInfo
    postType: PostType
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

    const titleRef = useRef<HTMLInputElement>(null)

    // The autoFocus prop doesn't always work, so we use a ref to focus the title field on component mount
    useEffect(() => {
        // Add a delay to ensure all other focus events have finished
        const timeout = setTimeout(() => {
            titleRef.current?.focus()
        }, 0) // 0ms so it happens when the event loop is free
        return () => clearTimeout(timeout)
    }, [])

    const [linkedSyllabusContent, setLinkedSyllabusContent] = useState<SyllabusContent[]>([])

    const isEmpty = !title && !content && attachments.length === 0 && linkedSyllabusContent.length === 0

    const createConfirmationDialog = useConfirmationDialog()

    // Randomly generated to create unique HTML ids
    const uniqueId = useMemo(() => Math.random().toString(36).substring(2, 15), [])

    return <Stack direction="column" spacing={2} padding={2}>
        <Typography variant="h6">Create post</Typography>
        <TextField
            autoComplete="off"
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            sx={{ maxWidth: '50em' }}
            inputRef={titleRef}
        />
        <TextField
            multiline
            label="Content"
            value={content}
            onChange={e => setContent(e.target.value)}
            // Set the default height to a certain number of lines
            inputProps={{ style: { lineHeight: '1.5em', minHeight: '6em' } }}
        />
        {linkedSyllabusContent.length > 0 && <List>
            {linkedSyllabusContent.map(content => (
                <ListItem key={content.id} secondaryAction={(
                    <IconButton aria-label={`Remove '${content.content}'`} onClick={() => setLinkedSyllabusContent(oldContents => oldContents.filter(c => c !== content))}>
                        <Remove />
                    </IconButton>
                )}>
                    <Typography>{content.content}</Typography>
                </ListItem>
            ))}
        </List>}
        {courseInfo && courseInfo.syllabusContent.length > 0 &&
            <AddSyllabusContentButton
                course={courseInfo}
                callback={content => {
                    setLinkedSyllabusContent(oldContents => [...oldContents, content])
                }}
            />
        }
        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {isStudent &&
                <RadioGroup row value={isPrivate ? "private" : "public"} onChange={e => setIsPrivate(e.target.value === "private")}>
                    <Tooltip title="Anyone in this group can view">
                        <FormControlLabel value="public" control={<Radio />} label="Public" aria-describedby={`public-${uniqueId}`} aria-label="Public" />
                    </Tooltip>
                    <span id={`public-${uniqueId}`} style={{
                        position: 'absolute',
                        margin: '-1px',
                        width: '1px',
                        height: '1px',
                        overflow: 'hidden'
                    }}>Anyone in this group can view</span>
                    <Tooltip title="Only teachers can view">
                        <FormControlLabel value="private" control={<Radio />} label="Private" aria-describedby={`private-${uniqueId}`} aria-label="Private" />
                    </Tooltip>
                    <span id={`private-${uniqueId}`} style={{
                        position: 'absolute',
                        margin: '-1px',
                        width: '1px',
                        height: '1px',
                        overflow: 'hidden'
                    }}>Only teachers can view</span>
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
        <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={() => onClick({
                schoolId,
                yearGroupId,
                courseId,
                classIds: classId ? [classId] : undefined,
                type: postType,
                private: isPrivate,
                title,
                content,
                linkedSyllabusContentIds: linkedSyllabusContent.map(content => content.id),
                attachments
            })} disabled={disabled}>Post</Button>
            <Button variant="outlined" onClick={() => {
                if (isEmpty) {
                    close()
                } else {
                    createConfirmationDialog('Discard Post', 'Discard', close)
                }
            }} disabled={disabled}>Discard</Button>
        </Stack>
    </Stack>
}

function CreateCommentForm({ onClick }: {
    onClick: (content: string) => Promise<void>
}) {
    const [content, setContent] = useState("")
    const [posting, setPosting] = useState(false)

    return <Stack direction="row" spacing={2} padding={2}>
        <TextField
            multiline
            label="Comment"
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={posting}
        />
        <Button variant="contained" onClick={async () => {
            setPosting(true)
            await onClick(content)
            setContent("")
            setPosting(false)
        }} disabled={posting || !content}>Post Comment</Button>
    </Stack>
}

function CommentView({ comment, deleteComment }: {
    comment: CommentInfo
    deleteComment: () => Promise<void> // Never called if the current user did not post the comment
}) {
    const { userId } = useUser()
    const [deleting, setDeleting] = useState(false)

    return <Stack key={comment.id} direction="column" spacing={1} padding={2} borderRadius={2}>
        <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar aria-hidden src={comment.user.picture} />
            <Typography>{comment.user.name}</Typography>
            {comment.user.id === userId &&
                <SimpleMenu
                    buttonContents={<MoreVert />}
                    buttonAriaLabel="More options"
                    buttonProps={{ disabled: deleting }}
                    childrenSupplier={close => [
                        <MenuItem onClick={async () => {
                            setDeleting(true)
                            await deleteComment()
                            close()
                            setDeleting(false)
                        }}>Delete</MenuItem>
                    ]}
                />
            }
        </Stack>
        <Typography>Commented {formatDate(new Date(comment.date))}</Typography>
        <Typography>{comment.content}</Typography>
    </Stack>
}

function PostView({ post, schoolInfo, courseInfo, updatePost }: { post: PostInfo, schoolInfo: SchoolInfo, courseInfo?: CourseInfo, updatePost: () => void }) {
    const classes = courseInfo?.classes.filter(c => post.classIds?.includes(c.id))
    const classNames = classes?.map(c => c.name).join(', ')

    const students = studentsWhoCanSeePost(post, schoolInfo)

    const { addComment, deleteComment } = useData()
    const isTeacherOrAdministrator = useIsTeacherOrAdministrator(schoolInfo)
    const switchPage = useSwitchPage()

    const [showingComments, setShowingComments] = useState(false)

    const deleteCommentCallback = async (commentId: string) => {
        await deleteComment(post.schoolId, post.id, commentId)
        await updatePost()
    }

    // Assignments are shown differently:
    // - The title is a link to the assignment
    // - The content and attachments are not shown
    const isAssignment = post.type === 'assignment'
    const postLocation = getLocation('', post.schoolId, post.yearGroupId, post.courseId, undefined, post.id)

    return <Paper elevation={4}>
        <Stack direction="column" padding={2} spacing={2}>
            {isAssignment
                ? <Typography variant="h6"><Link to={postLocation}>{post.title || 'Untitled Assignment'}</Link></Typography>
                : <Typography variant="h6">{post.title || 'Untitled Post'}</Typography>
            }
            {isAssignment && isTeacherOrAdministrator &&
            <SimpleMenu
                buttonContents={<MoreVert />}
                buttonAriaLabel="More options"
                childrenSupplier={close => [
                    <MenuItem onClick={() => {
                        switchPage(`edit-assignment/${post.id}`, post.schoolId, post.yearGroupId, post.courseId)
                        close()
                    }}>Edit</MenuItem>
                ]}
            />
            }
            <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar aria-hidden src={post.poster.picture} />
                <Typography>{post.poster.name}</Typography>
            </Stack>
            <Typography>Posted {formatDate(new Date(post.postDate))}{classNames ? ` to ${classNames}` : ''}</Typography>
            {!isAssignment && <>
                <Typography variant="body1">{post.content}</Typography>
                {courseInfo && post.linkedSyllabusContentIds.length > 0 &&
                    <List>
                        {post.linkedSyllabusContentIds.map(contentId => {
                            const content = courseInfo.syllabusContent.find(c => c.id === contentId)
                            return content ? <ListItem key={content.id}>
                                <Typography>{content.content}</Typography>
                            </ListItem> : null
                        })}
                    </List>
                }
                <TileContainer>
                    {post.attachments.map(attachment => <AttachmentView key={attachment.id} schoolId={post.schoolId} postId={post.id} attachment={attachment} students={students} />)}
                </TileContainer>
                {post.comments.length === 1 && <>
                    <Button>1 comment</Button>
                    <CommentView comment={post.comments[0]} deleteComment={() => deleteCommentCallback(post.comments[0].id)} />
                </>
                }
                {post.comments.length > 1 && <>
                    <Button
                        aria-expanded={showingComments}
                        onClick={() => setShowingComments(!showingComments)}
                        endIcon={showingComments ? <ExpandLess /> : <ExpandMore />}
                    >
                        {`${post.comments.length} comments`}
                    </Button>
                    {/* We always show the last comment but only show the others if the user clicks the button */}
                    {showingComments && post.comments.map((comment, index) => index !== post.comments.length - 1 && (
                        <CommentView key={comment.id} comment={comment} deleteComment={() => deleteCommentCallback(comment.id)} />
                    ))}
                    <CommentView comment={post.comments[post.comments.length - 1]} deleteComment={() => deleteCommentCallback(post.comments[post.comments.length - 1].id)} />
                </>}
                <CreateCommentForm onClick={async (content) => {
                    await addComment(post.schoolId, post.id, content)
                    await updatePost()
                }
                } />
            </>
            }
        </Stack>
    </Paper>
}

export default function PostsList({ schoolId, yearGroupId, courseId, listType }: {
    schoolId: string
    yearGroupId: string
    courseId?: string
    listType: 'feed' | 'work'
}) {
    const { createPost, listPosts, getPost } = useData()

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
    const [postTypeForCreation, setPostTypeForCreation] = useState<PostType | undefined>(undefined)
    const isTeacherOrAdministrator = useIsTeacherOrAdministrator(schoolInfo)
    const canCreateAssignments = isTeacherOrAdministrator && courseId

    const visiblePostTypes: PostType[] | undefined = useMemo(() => listType === 'work' ? ['assignment'] : undefined, [listType])

    const refreshPostsList = async () => {
        if (!loading) {
            setPosts([])
            setLoading(true)
            const result = await listPosts(null, BATCH_SIZE, schoolId, yearGroupId, courseId, classIds, visiblePostTypes)
            if (result) {
                setPosts(result.posts)
                setIsEnd(result.isEnd)
            } else {
                setIsEnd(true)
            }
            setLoading(false)
        }
    }

    useEffect(() => {
        if (schoolInfo) {
            refreshPostsList()
        }
    }, [schoolId, yearGroupId, courseId, classIds, schoolInfo, visiblePostTypes])

    const fetchMore = async () => {
        if (!isEnd && !loading) {
            if (posts.length === 0) {
                await refreshPostsList()
            } else {
                setLoading(true)
                const result = await listPosts(posts[posts.length - 1].postDate, BATCH_SIZE, schoolId, yearGroupId, courseId, classIds, visiblePostTypes)
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

    const switchPage = useSwitchPage()

    const updatePost = async (postId: string) => {
        const post = await getPost(postId, schoolId, yearGroupId, courseId, classIds)
        if (post) {
            setPosts(posts => posts.map(p => p.id === postId ? post : p))
        }
    }

    if (!schoolInfo) {
        return <Typography>Loading...</Typography>
    }

    const canCreatePosts = isTeacherOrAdministrator || listType === 'feed' // Students can't post work

    const onCreatePostButtonClicked = (postType: PostType) => {
        if (postType === 'assignment') {
            switchPage('create-assignment', schoolId, yearGroupId, courseId)
        } else {
            setPostTypeForCreation(postType)
            setCreatingPost(true)
        }
    }

    const createPostButton = <Tooltip title={listType === 'feed' ? "Create Post" : "Create Assignment"}>
        {canCreateAssignments && listType === 'feed' ?
            <SimpleMenu
                buttonAriaLabel="Create Post"
                buttonContents={<PostAdd />}
                buttonProps={{ disabled: creatingPost }}
                childrenSupplier={close => [
                    <MenuItem key="post" onClick={() => { onCreatePostButtonClicked('post'); close() }}>Post</MenuItem>,
                    <MenuItem key="assignment" onClick={() => { onCreatePostButtonClicked('assignment'); close() }}>Assignment</MenuItem>,
                ]}
            />
            :
            <IconButton
                onClick={() => onCreatePostButtonClicked(listType === 'feed' ? 'post' : 'assignment')}
                disabled={creatingPost}
            >
                {listType === 'feed' ? <PostAdd /> : <NoteAdd />}
            </IconButton>
        }
    </Tooltip>

    return <Stack direction="column" spacing={2} padding={2}>
        <Stack direction="row" justifyContent={canCreatePosts ? "space-between" : "normal"} alignItems="center">
            <Typography variant="h5">
                {listType === 'feed'
                    ? `Posts to ${containerName}`
                    : `Work for ${containerName}`
                }
            </Typography>
            {canCreatePosts && createPostButton}
        </Stack>
        {creatingPost &&
            <CreatePostForm
                key="Create post form"
                disabled={posting}
                schoolId={schoolId}
                schoolInfo={schoolInfo}
                yearGroupId={yearGroupId}
                courseId={courseId}
                courseInfo={course}
                postType={postTypeForCreation ?? 'post'}
                onClick={async (post) => {
                    setPosting(true)
                    await createPost(post)
                    setCreatingPost(false)
                    refreshPostsList()
                    setPosting(false)
                }}
                close={() => setCreatingPost(false)}
            />
        }
        {posts.length === 0 && !loading && !creatingPost && (
            listType === 'feed' ?
                <Typography>No posts yet. Click {createPostButton} to create the first one.</Typography>
                :
                (isTeacherOrAdministrator ?
                    <Typography>No work yet. Click {createPostButton} to create the first assignment.</Typography>
                    :
                    <Typography>No work yet.</Typography>
                )
        )}
        <InfiniteScroll
            dataLength={posts.length}
            next={fetchMore}
            hasMore={!isEnd}
            loader={<Typography>Loading...</Typography>}
        >
            {posts.map(post => (
                <PostView key={post.id} post={post} schoolInfo={schoolInfo} courseInfo={course} updatePost={() => updatePost(post.id)} />
            ))}
        </InfiniteScroll>
    </Stack>
}
