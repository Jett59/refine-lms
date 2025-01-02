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
    schools: {
        id: string
        name: string
    }[]
}

/**
 * A trimmed version of the full school info. Depending on the user's role, this includes:
 * - Administrator/teacher: everything
 * - Student: all administrator and teacher infos, all students from the same year group, all courses and classes which include the student
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
