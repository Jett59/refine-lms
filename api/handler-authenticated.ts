import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";
import { errorResponse, getPath, raiseInternalServerError, successResponse } from "./handlers";
import { MongoClient } from "mongodb";
import { createUser, findUser, findUserByJwtUserId, User } from "./user";
import { createSchool, listVisibleSchools } from "./schools";
import { CreateSchoolRequest } from "../data/api";

const DATABASE_NAME = process.env.REFINE_LMS_DATABASE ?? 'refine-dev'
const CONNECTION_STRING = process.env.MONGO_CONNECTION_STRING ?? 'mongodb://127.0.0.1:27017'

const mongoClient: MongoClient = new MongoClient(CONNECTION_STRING)

exports.handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer, context: Context): Promise<APIGatewayProxyStructuredResultV2> => {
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

        const jwtUserId = event.requestContext.authorizer.jwt.claims.sub
        if (!jwtUserId) {
            return errorResponse(401, 'Missing user ID in JWT')
        }
        if (!(typeof jwtUserId === 'string')) {
            return errorResponse(401, 'Invalid user ID in JWT')
        }
        let user = await findUserByJwtUserId(db, jwtUserId)
        if (!user) {
            return errorResponse(401, `User not found for JWT user ID '${jwtUserId}'`)
        }

        switch (path) {
            case "/visible-schools": {
                return successResponse(await listVisibleSchools(db, user._id!))
            }
            case "/create-school": {
                const typedBody: CreateSchoolRequest = body
                return successResponse({ createdId: await createSchool(db, user._id!, typedBody.name) })
            }
            default:
                return errorResponse(404, `Unknown path '${path}'`)
        }
    } catch (e) {
        return raiseInternalServerError(e)
    }
}
