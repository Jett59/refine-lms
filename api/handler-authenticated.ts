import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";
import { errorResponse, getPath, raiseInternalServerError } from "./handlers";

const DATABASE_NAME = `${process.env.REFINE_LMS_DATABASE ?? 'refine-dev'}`
const CONNECTION_STRING = process.env.MONGO_CONNECTION_STRING ?? 'mongodb://127.0.0.1:27017'

exports.handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer, context: Context): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
        // Set this flag on the context as specified in MongoDB best practices for caching in Lambda:
        // https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
        (context as any).callbackWaitsForEmptyEventLoop = false

        const path = getPath(event)
        let body
        if (event.body) {
            try {
                body = JSON.parse(event.body)
            } catch (e) { }
        }

        const userId = event.requestContext.authorizer.jwt.claims.sub
        if (!userId) {
            return errorResponse(401, 'Missing user ID')
        }

        switch (path) {
            default:
                return errorResponse(404, `Unknown path '${path}'`)
        }
    } catch (e) {
        return raiseInternalServerError(e)
    }
}
