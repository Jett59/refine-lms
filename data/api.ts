import { SchoolInfo, SchoolStructure } from "./school"
import { UserInfo } from "./user"
import { AttachmentTemplate, PostInfo, PostTemplate, PostType } from "./post"

export interface GoogleTokenResponse {
    accessToken: string
    scopes: string[]
    idToken: string
    refreshToken: string
    expiryDate: number
    userInfo?: UserInfo
}

export interface GoogleAuthenticateRequest {
    code: string
}
export interface GoogleRefreshRequest {
    refreshToken: string
}

export interface VisibleSchoolsResponse {
    joinedSchools: {
        id: string
        name: string
    }[],
    invitedSchools: {
        id: string
        name: string
    }[]
}

/**
 * A trimmed version of the full school info. Depending on the user's role, this includes:
 * - Administrator/teacher: everything
 * - Student: all administrator and teacher infos, all courses and classes which include the student, all students who share a class with the current student
 */
export interface RelevantSchoolInfoResponse {
    school: SchoolInfo
}

export interface CreateSchoolRequest {
    name: string
}
export interface CreateSchoolResponse {
    createdId: string
}

export interface CreateYearGroupRequest {
    schoolId: string
    name: string
}
export interface CreateYearGroupResponse {
    createdId: string
}

export interface CreateCourseRequest {
    schoolId: string
    yearGroupId: string
    name: string
    initialClassNames: string[]
}
export interface CreateCourseResponse {
    createdId: string
}

export interface CreateClassRequest {
    schoolId: string
    yearGroupId: string
    courseId: string
    name: string
}
export interface CreateClassResponse {
    createdId: string
}

export interface InviteRequest {
    schoolId: string
    role: 'administrator' | 'teacher' | 'student'
    email: string
}
export interface InviteResponse {
    success: boolean
}

export interface JoinSchoolRequest {
    schoolId: string
}
export interface JoinSchoolResponse {
    success: boolean
}

export interface DeclineInvitationRequest {
    schoolId: string
}
export interface DeclineInvitationResponse {
    success: boolean
}

export interface RemoveUserRequest {
    schoolId: string
    userId: string
}
export interface RemoveUserResponse {
    success: boolean
}

export interface AddToClassRequest {
    schoolId: string
    yearGroupId: string
    courseId: string
    classId: string
    role: 'teacher' | 'student'
    userId: string
}
export interface AddToClassResponse {
    success: boolean
}

export interface RemoveFromClassRequest {
    schoolId: string
    yearGroupId: string
    courseId: string
    classId: string
    userId: string
}
export interface RemoveFromClassResponse {
    success: boolean
}

export interface SchoolStructureResponse {
    school: SchoolStructure
}

export interface RequestToJoinClassRequest {
    schoolId: string
    yearGroupId: string
    courseId: string
    classId: string
}
export interface RequestToJoinClassResponse {
    success: boolean
}

export interface AddSyllabusContentRequest {
    schoolId: string
    yearGroupId: string
    courseId: string
    content: string
}
export interface AddSyllabusContentResponse {
    success: boolean
}

export interface RemoveSyllabusContentRequest {
    schoolId: string
    yearGroupId: string
    courseId: string
    id: string
}
export interface RemoveSyllabusContentResponse {
    success: boolean
}

export interface AddSyllabusOutcomeRequest {
    schoolId: string
    yearGroupId: string
    courseId: string
    name: string
    description: string
}
export interface AddSyllabusOutcomeResponse {
    success: boolean
}

export interface RemoveSyllabusOutcomeRequest {
    schoolId: string
    yearGroupId: string
    courseId: string
    id: string
}
export interface RemoveSyllabusOutcomeResponse {
    success: boolean
}

export interface CreatePostRequest {
    post: PostTemplate,
    googleAccessToken: string
}
export interface CreatePostResponse {
    postId: string
}

/**
 * Lists the posts after the given date, up to the limit. If afterDate is not provided, it lists the most recent posts.
 * 
 * If courseId is not provided, lists posts to the year group. Otherwise lists posts to the specified course. classIds is only considered for course requests.
 * If classIds is not provided, lists only posts with no classIds.
 * Otherwise lists all posts to any of the values in classIds.
 */
export interface ListPostsRequest {
    beforeDate?: string
    limit: number

    schoolId: string
    yearGroupId: string
    courseId?: string
    classIds?: string[] // Leave out to post to all classes

    postTypes?: PostType[]
}
export interface ListPostsResponse {
    posts: PostInfo[]
    isEnd: boolean
}

export interface AttachmentLinkRequest {
    schoolId: string
    postId: string
    attachmentId: string

    // Allows teachers to view the individual copies of an attachment
    individualCopyOwnerId?: string
}
export interface AttachmentLinkResponse {
    link: string
}

export interface GetPostRequest {
    postId: string
    schoolId: string
    yearGroupId: string
    courseId?: string
    classIds?: string[]
}
export interface GetPostResponse {
    post: PostInfo
}

export interface AddAttachmentToSubmissionRequest {
    schoolId: string
    postId: string
    attachment: AttachmentTemplate
    googleAccessToken: string
}
export interface AddAttachmentToSubmissionResponse {
    attachmentId: string
}

export interface SubmitAssignmentRequest {
    schoolId: string
    postId: string
}
export interface SubmitAssignmentResponse {
    success: boolean
}

export interface RecordMarksRequest {
    schoolId: string
    postId: string
    studentUserId: string
    marks: number[]
    feedback?: string
}
export interface RecordMarksResponse {
    success: boolean
}
