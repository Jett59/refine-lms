import { APIGatewayProxyEvent, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";
import { errorResponse, getPath, raiseInternalServerError } from "./handlers";

exports.handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
          const path = getPath(event)
          let body
          if (event.body) {
              try {
                  body = JSON.parse(event.body)
              } catch (e) { }
          }
          switch (path) {
              default:
                  return errorResponse(404, `Unknown path '${path}'`)
          }
      } catch (e) {
          return raiseInternalServerError(e)
      }
  }
