import { useEffect, useState } from "react"
import { useData } from "./DataContext"
import { Avatar, Button, Dialog, DialogActions, DialogContent, FormControlLabel, Grid, IconButton, Paper, Radio, RadioGroup, Stack, TextField, Typography } from "@mui/material"
import { PostAdd } from "@mui/icons-material"
import { PostInfo, PostTemplate } from "../../data/post"
import InfiniteScroll from "react-infinite-scroll-component"
import { formatDate } from "./date"

function PostButton({ schoolId, yearGroupId, courseId, classId, onClick }: {
    schoolId: string
    yearGroupId: string
    courseId?: string
    classId?: string
    onClick: (post: PostTemplate) => void
}) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [isPrivate, setIsPrivate] = useState(false)

    return <>
        <IconButton aria-label="Post" onClick={() => setDialogOpen(true)}><PostAdd /></IconButton>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogContent>
                <Grid container padding={2} spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <RadioGroup value={isPrivate} onChange={e => setIsPrivate(e.target.value === "true")} row>
                            <FormControlLabel value={true} control={<Radio />} label="Private" />
                            <FormControlLabel value={false} control={<Radio />} label="Public" />
                        </RadioGroup>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField multiline label="Content" value={content} onChange={e => setContent(e.target.value)} />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={() => {
                    onClick({
                        schoolId,
                        yearGroupId,
                        courseId,
                        classIds: classId ? [classId] : [],
                        type: 'post',
                        private: isPrivate,
                        title,
                        content,
                        attachments: []
                    })
                    setDialogOpen(false)
                    setTitle("")
                    setContent("")
                }}>Post</Button>
            </DialogActions>
        </Dialog>
    </>
}

function PostView({ post }: { post: PostInfo }) {
    return <Paper elevation={4}>
        <Stack direction="column" padding={2} spacing={2}>
            <Typography variant="h6">{post.title}</Typography>
            <Stack direction="row">
                <Avatar aria-hidden src={post.poster.picture} ></Avatar>
                <Typography>{post.poster.name}</Typography>
            </Stack>
            <Typography>Posted {formatDate(new Date(post.postDate))}</Typography>
            <Typography variant="body1">{post.content}</Typography>
        </Stack>
    </Paper>
}

export default function Feed({ schoolId, yearGroupId, courseId, classId }: {
    schoolId: string
    yearGroupId: string
    courseId?: string
    classId?: string
}) {
    const { createPost, listPosts } = useData()

    const [posts, setPosts] = useState<PostInfo[]>([])
    const [isEnd, setIsEnd] = useState(false)
    const [loading, setLoading] = useState(false)

    const BATCH_SIZE = 10

    const refreshPostsList = async () => {
        if (!loading) {
            console.log('Here', JSON.stringify(posts))
            setPosts([])
            setLoading(true)
            const result = await listPosts(null, BATCH_SIZE, schoolId, yearGroupId, courseId, classId ? [classId] : [])
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
        if (posts.length < BATCH_SIZE && !isEnd) {
            refreshPostsList()
        }
    }, [schoolId, yearGroupId, courseId, classId, posts])

    const fetchMore = async () => {
        if (!isEnd && !loading) {
            if (posts.length === 0) {
                await refreshPostsList()
            } else {
                setLoading(true)
                const result = await listPosts(posts[posts.length - 1].postDate, BATCH_SIZE, schoolId, yearGroupId, courseId, classId ? [classId] : [])
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

    return <Stack direction="column">
        <PostButton
            schoolId={schoolId}
            yearGroupId={yearGroupId}
            courseId={courseId}
            classId={classId}
            onClick={post => {
                createPost(post).then(refreshPostsList)
            }}
        />
        <InfiniteScroll
            dataLength={posts.length}
            next={fetchMore}
            hasMore={!isEnd}
            loader={<Typography>Loading...</Typography>}
        >
            {posts.map(post => <PostView key={post.id} post={post} />)}
        </InfiniteScroll>
    </Stack>
}
