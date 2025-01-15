import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";
import { errorResponse, getPath, raiseInternalServerError, successResponse } from "./handlers";
import { MongoClient, ObjectId } from "mongodb";
import { createUser, findUser, findUserByJwtUserId, User } from "./user";
import { addToClass, createClass, createCourse, createSchool, createYearGroup, declineInvitation, getRelevantSchoolInfo, getSchool, getSchoolStructure, invite, joinSchool, listVisibleSchools, removeFromClass, removeUser, requestToJoinClass } from "./schools";
import { AddToClassRequest, AddToClassResponse, CreateClassRequest, CreateClassResponse, CreateCourseRequest, CreateCourseResponse, CreatePostRequest, CreatePostResponse, CreateSchoolRequest, CreateSchoolResponse, CreateYearGroupRequest, CreateYearGroupResponse, DeclineInvitationRequest, DeclineInvitationResponse, InviteRequest, InviteResponse, JoinSchoolRequest, JoinSchoolResponse, RelevantSchoolInfoResponse, RemoveFromClassRequest, RemoveFromClassResponse, RemoveUserRequest, RequestToJoinClassRequest, RequestToJoinClassResponse, SchoolStructureResponse, VisibleSchoolsResponse } from "../data/api";
import { createPost, preparePostFromTemplate } from "./posts";

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
                return successResponse<VisibleSchoolsResponse>(await listVisibleSchools(db, user._id!, user.email))
            }
            case "/relevant-school-info": {
                const schoolId = event.queryStringParameters?.id
                if (!schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                let schoolObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(schoolId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school ID')
                }
                const schoolInfo = await getRelevantSchoolInfo(db, user._id!, schoolObjectId)
                if (!schoolInfo) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                return successResponse<RelevantSchoolInfoResponse>({ school: schoolInfo })
            }
            case "/create-school": {
                const typedBody: CreateSchoolRequest = body
                if (!typedBody.name) {
                    return errorResponse(400, 'Missing school name')
                }
                return successResponse<CreateSchoolResponse>({ createdId: (await createSchool(db, user._id!, typedBody.name)).toHexString() })
            }
            case "/create-year-group": {
                const typedBody: CreateYearGroupRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.name) {
                    return errorResponse(400, 'Missing year group name')
                }
                let schoolObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school ID')
                }
                return successResponse<CreateYearGroupResponse>({ createdId: (await createYearGroup(db, user._id!, schoolObjectId, typedBody.name)).toHexString() })
            }
            case "/create-course": {
                const typedBody: CreateCourseRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group ID')
                }
                if (!typedBody.name) {
                    return errorResponse(400, 'Missing course name')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school or year group ID')
                }
                return successResponse<CreateCourseResponse>({ createdId: (await createCourse(db, user._id!, schoolObjectId, yearGroupObjectId, typedBody.name)).toHexString() })
            }
            case "/create-class": {
                const typedBody: CreateClassRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group ID')
                }
                if (!typedBody.courseId) {
                    return errorResponse(400, 'Missing course ID')
                }
                if (!typedBody.name) {
                    return errorResponse(400, 'Missing class name')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                    courseObjectId = new ObjectId(typedBody.courseId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school, year group, or course ID')
                }
                return successResponse<CreateClassResponse>({ createdId: (await createClass(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, typedBody.name)).toHexString() })
            }
            case "/invite": {
                const typedBody: InviteRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.role) {
                    return errorResponse(400, 'Missing category')
                }
                if (!typedBody.email) {
                    return errorResponse(400, 'Missing email')
                }
                let schoolObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school ID')
                }
                await invite(db, user._id!, schoolObjectId, typedBody.role, typedBody.email)
                return successResponse<InviteResponse>({ success: true })
            }
            case "/join-school": {
                const typedBody: JoinSchoolRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                let schoolObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school ID')
                }
                await joinSchool(db, user._id!, user.email, schoolObjectId)
                return successResponse<JoinSchoolResponse>({ success: true })
            }
            case "/decline-invitation": {
                const typedBody: DeclineInvitationRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                let schoolObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school ID')
                }
                await declineInvitation(db, user.email, schoolObjectId)
                return successResponse<DeclineInvitationResponse>({ success: true })
            }
            case "/remove-user": {
                const typedBody: RemoveUserRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.userId) {
                    return errorResponse(400, 'Missing user ID')
                }
                if (typedBody.userId === user._id?.toHexString()) {
                    return errorResponse(400, 'Cannot remove yourself')
                }
                let schoolObjectId: ObjectId
                let userObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    userObjectId = new ObjectId(typedBody.userId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school or user ID')
                }
                await removeUser(db, user._id!, schoolObjectId, userObjectId)
                return successResponse<DeclineInvitationResponse>({ success: true })
            }
            case "/add-to-class": {
                const typedBody: AddToClassRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group ID')
                }
                if (!typedBody.courseId) {
                    return errorResponse(400, 'Missing course ID')
                }
                if (!typedBody.classId) {
                    return errorResponse(400, 'Missing class ID')
                }
                if (!typedBody.role) {
                    return errorResponse(400, 'Missing role')
                }
                if (typedBody.role !== 'teacher' && typedBody.role !== 'student') {
                    return errorResponse(400, 'Invalid role')
                }
                if (!typedBody.userId) {
                    return errorResponse(400, 'Missing user ID')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId
                let classObjectId: ObjectId
                let additionalUserObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                    courseObjectId = new ObjectId(typedBody.courseId)
                    classObjectId = new ObjectId(typedBody.classId)
                    additionalUserObjectId = new ObjectId(typedBody.userId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school, year group, course, class, or user ID')
                }
                await addToClass(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, classObjectId, typedBody.role, additionalUserObjectId)
                return successResponse<AddToClassResponse>({ success: true })
            }
            case "/remove-from-class": {
                const typedBody: RemoveFromClassRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group ID')
                }
                if (!typedBody.courseId) {
                    return errorResponse(400, 'Missing course ID')
                }
                if (!typedBody.classId) {
                    return errorResponse(400, 'Missing class ID')
                }
                if (!typedBody.userId) {
                    return errorResponse(400, 'Missing user ID')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId
                let classObjectId: ObjectId
                let userObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                    courseObjectId = new ObjectId(typedBody.courseId)
                    classObjectId = new ObjectId(typedBody.classId)
                    userObjectId = new ObjectId(typedBody.userId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school, year group, course, class, or user ID')
                }
                await removeFromClass(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, classObjectId, userObjectId)
                return successResponse<RemoveFromClassResponse>({ success: true })
            }
            case "/school-structure": {
                const schoolId = event.queryStringParameters?.id
                if (!schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                let schoolObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(schoolId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school ID')
                }
                const schoolStructure = await getSchoolStructure(db, user._id!, schoolObjectId)
                if (!schoolStructure) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                return successResponse<SchoolStructureResponse>({ school: schoolStructure })
            }
            case "/request-to-join-class": {
                const typedBody: RequestToJoinClassRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group ID')
                }
                if (!typedBody.courseId) {
                    return errorResponse(400, 'Missing course ID')
                }
                if (!typedBody.classId) {
                    return errorResponse(400, 'Missing class ID')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId
                let classObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                    courseObjectId = new ObjectId(typedBody.courseId)
                    classObjectId = new ObjectId(typedBody.classId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school, year group, course, or class ID')
                }
                await requestToJoinClass(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, classObjectId)
                return successResponse<RequestToJoinClassResponse>({ success: true })
            }
            case "/create-post": {
                const typedBody: CreatePostRequest = body
                const postTemplate = typedBody.post
                if (!postTemplate) {
                    return errorResponse(400, 'Missing post')
                }
                if (!postTemplate.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!postTemplate.yearGroupId) {
                    return errorResponse(400, 'Missing year group ID')
                }
                if (!postTemplate.type) {
                    return errorResponse(400, 'Missing type')
                }
                if (postTemplate.private === undefined) {
                    return errorResponse(400, 'Missing private')
                }
                if (!postTemplate.title) {
                    return errorResponse(400, 'Missing title')
                }
                if (!postTemplate.content) {
                    return errorResponse(400, 'Missing content')
                }
                if (!postTemplate.attachments) {
                    return errorResponse(400, 'Missing attachments')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId | undefined
                let classObjectIds: ObjectId[] | undefined
                try {
                    schoolObjectId = new ObjectId(postTemplate.schoolId)
                    yearGroupObjectId = new ObjectId(postTemplate.yearGroupId)
                    courseObjectId = postTemplate.courseId ? new ObjectId(postTemplate.courseId) : undefined
                    classObjectIds = postTemplate.classIds?.map((id: string) => new ObjectId(id))
                } catch (e) {
                    return errorResponse(400, 'Invalid school, year group, course, or class ID')
                }
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                const postId = await createPost(db, school, preparePostFromTemplate(postTemplate, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, classObjectIds))
                return successResponse<CreatePostResponse>({ postId: postId.toHexString() })
            }
            default:
                return errorResponse(404, `Unknown path '${path}'`)
        }
    } catch (e) {
        return raiseInternalServerError(e)
    }
}
