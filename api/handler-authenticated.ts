import { APIGatewayProxyEvent, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";

exports.handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyStructuredResultV2> => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Go Serverless v4! Your updated function executed successfully!",
      thing: event.headers,
    }),
  };
};
