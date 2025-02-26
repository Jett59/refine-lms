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
