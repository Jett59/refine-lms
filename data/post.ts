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
    type: 'post' | 'material' | 'assignment'
    title: string
    content: string
    attachments: AttachmentInfo[]
}
export interface AttachmentInfo {
    id: string
    title: string
    thumbnail: string
    mimeType: string
    host: 'google',
    googleFileId: string

    accessLink?: string
}

export interface PostTemplate {
    schoolId: string
    yearGroupId: string
    courseId?: string
    classIds?: string[]
    private: boolean
    type: 'post' | 'material' | 'assignment'
    title: string
    content: string
    attachments: AttachmentTemplate[]
}
export interface AttachmentTemplate {
    title: string
    thumbnail: string
    mimeType: string
    host: 'google',
    googleFileId: string
}
