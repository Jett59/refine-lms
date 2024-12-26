import { SchoolInfo } from "./school"

export interface GoogleTokenResponse {
    accessToken: string
    idToken: string
    refreshToken: string
    expiryDate: number
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
