import { useState } from "react"
import { useData } from "./DataContext"
import { Button, Dialog, DialogActions, DialogContent, FormControlLabel, IconButton, Radio, RadioGroup, TextField } from "@mui/material"
import { PostAdd } from "@mui/icons-material"

function PostButton({ schoolId, yearGroupId, courseId, classId }: {
    schoolId: string
    yearGroupId: string
    courseId?: string
    classId?: string
}) {
    const { createPost } = useData()

    const [dialogOpen, setDialogOpen] = useState(false)

    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [isPrivate, setIsPrivate] = useState(false)

    return <>
        <IconButton aria-label="Post" onClick={() => setDialogOpen(true)}><PostAdd /></IconButton>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogContent>
                <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} />
                <TextField multiline label="Content" value={content} onChange={e => setContent(e.target.value)} />
                    <RadioGroup value={isPrivate} onChange={e => setIsPrivate(e.target.value === "true")}>
                        <FormControlLabel value={true} control={<Radio />} label="Private" />
                        <FormControlLabel value={false} control={<Radio />} label="Public" />
                    </RadioGroup>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={() => {
                    createPost({
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

export default function Feed({ schoolId, yearGroupId, courseId, classId }: {
    schoolId: string
    yearGroupId: string
    courseId?: string
    classId?: string
}) {
    return <PostButton schoolId={schoolId} yearGroupId={yearGroupId} courseId={courseId} classId={classId} />
}
