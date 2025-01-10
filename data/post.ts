import { UserInfo } from "./user"

export interface Post {
    id: string
    poster: UserInfo
    schoolId: string
    yearGroupId: string
    courseId?: string
    classIds?: string[]
    private: boolean
    type: 'post' | 'material' | 'assignment'
    title: string
    content: string
    attachments: Attachment[]
}
export interface Attachment {
    id: string
    title: string
    link: string
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
    link: string
}
