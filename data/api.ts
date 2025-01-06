import { SchoolInfo } from "./school"
import { UserInfo } from "./user"

export interface GoogleTokenResponse {
    accessToken: string
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
