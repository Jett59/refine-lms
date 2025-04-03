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
    attachments: AttachmentInfo[]

    // For assignments:
    isoDueDate?: string
    submissionTemplates?: AttachmentInfo[]
    studentAttachments?: { [studentId: string]: AttachmentInfo[] }
    markingCriteria?: MarkingCriterion[]
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
    attachments: AttachmentTemplate[]

    // For assignments:
    isoDueDate?: string
    submissionTemplates?: AttachmentTemplate[]

    markingCriteria?: MarkingCriterion[]
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

export interface MarkingCriterion {
    title: string
    maximumMarks: number
}
