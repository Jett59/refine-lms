import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda"
import { OAuth2Client, UserRefreshClient } from "google-auth-library"
import { errorResponse, getPath, raiseInternalServerError, successResponse } from "./handlers"
import { GoogleTokenResponse, GoogleAuthenticateRequest, GoogleRefreshRequest } from "../data/api"
import { getGoogleProfileInformation } from "./googleProfile"
import { ensureUserExists } from "./user"
import { MongoClient } from "mongodb"

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

const oAuth2Client = new OAuth2Client(
    googleClientId,
    googleClientSecret,
    'postmessage',
)

const DATABASE_NAME = process.env.REFINE_LMS_DATABASE ?? 'refine-dev'
const CONNECTION_STRING = process.env.MONGO_CONNECTION_STRING ?? 'mongodb://127.0.0.1:27017'

const mongoClient: MongoClient = new MongoClient(CONNECTION_STRING)

exports.handler = async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
        // Set this flag on the context as specified in MongoDB best practices for caching in Lambda:
        // https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
        (context as any).callbackWaitsForEmptyEventLoop = false

        const db = await mongoClient.db(DATABASE_NAME)

        const path = getPath(event)
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
                if (!tokens.access_token) {
                    return errorResponse(401, 'Invalid authorization code')
                }
                if (!tokens.refresh_token) {
                    return errorResponse(401, 'Missing refresh token')
                }
                if (!tokens.id_token || !tokens.expiry_date) {
                    return raiseInternalServerError(["Missing token or expiry date from Google oAuth2", tokens])
                }
                const userInfo = await getGoogleProfileInformation(tokens.access_token)
                const user = await ensureUserExists(db, userInfo)
                if (!user._id) {
                    return raiseInternalServerError(["User does not have an _id", user])
                }
                return successResponse<GoogleTokenResponse>({
                    accessToken: tokens.access_token,
                    scopes: tokens.scope!.split(' '),
                    idToken: tokens.id_token,
                    refreshToken: tokens.refresh_token,
                    expiryDate: tokens.expiry_date,
                    userInfo: {
                        id: user._id.toHexString(),
                        email: user.email,
                        name: user.name,
                        picture: user.picture
                    }
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
                    scopes: tokens.scope!.split(' '),
                    idToken: tokens.id_token,
                    refreshToken: tokens.refresh_token,
                    expiryDate: tokens.expiry_date
                })
            }
            default:
                return errorResponse(404, `Unknown path '${path}'`)
        }
    } catch (e) {
        return raiseInternalServerError(e)
    }
}
