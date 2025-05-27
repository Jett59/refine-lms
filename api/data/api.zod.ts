import { z } from "zod/v4"
import { GoogleAuthenticateRequest, GoogleRefreshRequest, GoogleRevokeRequest } from "../../data/api"

export const GOOGLE_AUTHENTICATE_REQUEST: z.ZodType<GoogleAuthenticateRequest> = z.object({
    code: z.string()
})
export const GOOGLE_REFRESH_REQUEST: z.ZodType<GoogleRefreshRequest> = z.object({
    refreshToken: z.string()
})
export const GOOGLE_REVOKE_REQUEST: z.ZodType<GoogleRevokeRequest> = z.object({
    accessToken: z.string(),
    refreshToken: z.string()
})
