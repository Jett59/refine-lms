import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { randomUUID } from "crypto";

export function successResponse<T>(body: T): APIGatewayProxyStructuredResultV2 {
    return {
        statusCode: 200,
        body: JSON.stringify(body)
    }
}

export function errorResponse(status: number, message: string): APIGatewayProxyStructuredResultV2 {
    return {
        statusCode: status,
        body: JSON.stringify({message})
    }
}

export function raiseInternalServerError(error: any): APIGatewayProxyStructuredResultV2 {
    const id = randomUUID();
    console.error(`Error id ${id}: ${JSON.stringify(error, null, 2)}`)
    return errorResponse(500, `Internal server error ${id}`)
}
