import { UserInfo } from "./user"

export interface PostInfo {
    id: string
    postDate: string
    poster: UserInfo
    schoolId: string
    yearGroupId: string
    courseId?: string
    classIds?: string[] // Leave out to post to all classes
    private: boolean
    type: 'post' | 'assignment'
    title: string
    content: string
    linkedSyllabusContentIds: string[]
    attachments: AttachmentInfo[]
    comments: CommentInfo[]

    // For assignments:
    isoDueDate?: string
    submissionTemplates?: AttachmentInfo[]
    studentAttachments?: { [studentId: string]: AttachmentInfo[] }
    isoSubmissionDates?: { [studentId: string]: string }
    markingCriteria?: MarkingCriterionInfo[]
    marks?: { [userId: string]: { [criterionId: string]: number } }
    feedback?: { [userId: string]: string }
}
export interface AttachmentInfo {
    id: string
    title: string
    thumbnail: string
    mimeType: string
    host: 'google',
    googleFileId: string
    shareMode: 'shared' | 'copied'
    othersCanEdit: boolean

    accessLink?: string
}
export interface MarkingCriterionInfo {
    id: string
    title: string
    maximumMarks: number
}
export interface CommentInfo {
    id: string
    date: string
    user: UserInfo
    content: string
}

export type PostType = 'post' | 'assignment'

export interface PostTemplate {
    schoolId: string
    yearGroupId: string
    courseId?: string
    classIds?: string[]
    private: boolean
    type: PostType
    title: string
    content: string
    linkedSyllabusContentIds: string[]
    attachments: AttachmentTemplate[]

    // For assignments:
    isoDueDate?: string
    submissionTemplates?: AttachmentTemplate[]

    markingCriteria?: MarkingCriterionTemplate[]
}
export interface AttachmentTemplate {
    title: string
    thumbnail: string
    mimeType: string
    shareMode: 'shared' | 'copied'
    othersCanEdit: boolean
    host: 'google',
    googleFileId: string
}
export interface MarkingCriterionTemplate {
    title: string
    maximumMarks: number
}
