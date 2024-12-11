import { APIGatewayProxyEvent, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";

exports.handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyStructuredResultV2> => {
    let path
    if ('http' in event.requestContext && 'path' in (event.requestContext.http as any)) {
        path = (event.requestContext.http as any).path
    }else {
        path = ''
    }
    switch (path) {
        case "/google-authenticate": {
            return {
                statusCode: 200,
                body: 'TODO',
            }
        }
        default:
            return {
                statusCode: 404,
                body: JSON.stringify({ message: `Unknown path '${path}'` })
            }
    }
};
