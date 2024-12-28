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

export interface SchoolInfoResponse {
    school: SchoolInfo
}
