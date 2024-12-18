import { APIGatewayProxyEvent, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda"
import { OAuth2Client, UserRefreshClient } from "google-auth-library"
import { errorResponse, raiseInternalServerError, successResponse } from "./handlers"
import { GoogleTokenResponse, GoogleAuthenticateRequest, GoogleRefreshRequest } from "../data/api"

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

const oAuth2Client = new OAuth2Client(
    googleClientId,
    googleClientSecret,
    'postmessage',
)

exports.handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyStructuredResultV2> => {
    let path
    if ('http' in event.requestContext && 'path' in (event.requestContext.http as any)) {
        path = (event.requestContext.http as any).path
    } else {
        path = ''
    }
    let body
    if (event.body) {
        try {
            body = JSON.parse(event.body)
        } catch (e) { }
    }
    switch (path) {
        case "/google-authenticate": {
            const typedBody: GoogleAuthenticateRequest = body
            const { tokens } = await oAuth2Client.getToken(typedBody.code)
            if (!tokens.access_token || !tokens.id_token || !tokens.refresh_token || !tokens.expiry_date) {
                return raiseInternalServerError(["Missing token(s) from Google oAuth2", tokens])
            }
            return successResponse<GoogleTokenResponse>({
                accessToken: tokens.access_token,
                idToken: tokens.id_token,
                refreshToken: tokens.refresh_token,
                expiryDate: tokens.expiry_date,
            })
        }
        case "/google-refresh": {
            const typedBody: GoogleRefreshRequest = body
            const user = new UserRefreshClient(googleClientId, googleClientSecret, typedBody.refreshToken)
            const response = await user.refreshAccessToken()
            const tokens = response.credentials
            if (!tokens.access_token || !tokens.id_token || !tokens.refresh_token || !tokens.expiry_date) {
                return raiseInternalServerError(["Missing token(s) from Google oAuth2 refresh", tokens])
            }
            return successResponse<GoogleTokenResponse>({
                accessToken: tokens.access_token,
                idToken: tokens.id_token,
                refreshToken: tokens.refresh_token,
                expiryDate: tokens.expiry_date
            })
        }
        default:
            return errorResponse(404, `Unknown path '${path}'`)
    }
}
