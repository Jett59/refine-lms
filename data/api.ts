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
