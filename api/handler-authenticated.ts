import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";
import { errorResponse, getPath, raiseInternalServerError, successResponse, typedErrorResponse } from "./handlers";
import { MongoClient, ObjectId } from "mongodb";
import { createUser, findUser, findUserByJwtUserId, User } from "./user";
import { addSyllabusContent, addSyllabusOutcome, addToClass, createClass, createCourse, createSchool, createYearGroup, declineInvitation, getRelevantSchoolInfo, getSchool, getSchoolStructure, invite, joinSchool, listVisibleSchools, removeFromClass, removeSyllabusContent, removeSyllabusOutcome, removeUser, requestToJoinClass } from "./schools";
import { AddAttachmentToSubmissionRequest, AddAttachmentToSubmissionResponse, AddCommentRequest, AddCommentResponse, AddSyllabusContentRequest, AddSyllabusContentResponse, AddSyllabusOutcomeRequest, AddSyllabusOutcomeResponse, AddToClassRequest, AddToClassResponse, AttachmentLinkRequest, AttachmentLinkResponse, CreateClassRequest, CreateClassResponse, CreateCourseRequest, CreateCourseResponse, CreatePostRequest, CreatePostResponse, CreateSchoolRequest, CreateSchoolResponse, CreateYearGroupRequest, CreateYearGroupResponse, DeclineInvitationRequest, DeclineInvitationResponse, DeleteCommentRequest, DeleteCommentResponse, GetPostRequest, GetPostResponse, InviteRequest, InviteResponse, JoinSchoolRequest, JoinSchoolResponse, ListPostsRequest, ListPostsResponse, RecordMarksRequest, RecordMarksResponse, RelevantSchoolInfoResponse, RemoveFromClassRequest, RemoveFromClassResponse, RemoveSyllabusContentRequest, RemoveSyllabusContentResponse, RemoveSyllabusOutcomeRequest, RemoveSyllabusOutcomeResponse, RemoveUserRequest, RequestToJoinClassRequest, RequestToJoinClassResponse, SchoolStructureResponse, SubmitAssignmentRequest, SubmitAssignmentResponse, VisibleSchoolsResponse } from "../data/api";
import { AddAttachmentToSubmission, addComment, createPost, deleteComment, getPost, getUsableAttachmentLink, listPosts, preparePostFromTemplate, RecordFeedback, RecordMarks, submitAssignment } from "./posts";
import { isAttachmentPreparationError, prepareAttachments } from "./google-drive";

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
                if (!typedBody.initialClassNames) {
                    return errorResponse(400, 'Missing initial class names')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school or year group ID')
                }
                const courseId = await createCourse(db, user._id!, schoolObjectId, yearGroupObjectId, typedBody.name)
                if (!courseId) {
                    return errorResponse(400, 'Invalid course creation')
                }
                for (const className of typedBody.initialClassNames) {
                    await createClass(db, user._id!, schoolObjectId, yearGroupObjectId, courseId, className)
                }
                return successResponse<CreateCourseResponse>({ createdId: courseId.toHexString() })
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
            case "/add-syllabus-content": {
                const typedBody: AddSyllabusContentRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school id')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group id')
                }
                if (!typedBody.courseId) {
                    return errorResponse(400, 'Missing course id')
                }
                if (!typedBody.content) {
                    return errorResponse(400, 'Missing content')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                    courseObjectId = new ObjectId(typedBody.courseId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school year group or course id')
                }
                await addSyllabusContent(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, typedBody.content)
                return successResponse<AddSyllabusContentResponse>({ success: true })
            }
            case "/remove-syllabus-content": {
                const typedBody: RemoveSyllabusContentRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school id')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group id')
                }
                if (!typedBody.courseId) {
                    return errorResponse(400, 'Missing course id')
                }
                if (!typedBody.id) {
                    return errorResponse(400, 'Missing content id')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId
                let contentId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                    courseObjectId = new ObjectId(typedBody.courseId)
                    contentId = new ObjectId(typedBody.id)
                } catch (e) {
                    return errorResponse(400, 'Invalid school year group, course or content id')
                }
                await removeSyllabusContent(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, contentId)
                return successResponse<RemoveSyllabusContentResponse>({ success: true })
            }
            case "/add-syllabus-outcome": {
                const typedBody: AddSyllabusOutcomeRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school id')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group id')
                }
                if (!typedBody.courseId) {
                    return errorResponse(400, 'Missing course id')
                }
                if (!typedBody.name) {
                    return errorResponse(400, 'Missing outcome')
                }
                if (!typedBody.description) {
                    return errorResponse(400, 'Missing description')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                    courseObjectId = new ObjectId(typedBody.courseId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school year group or course id')
                }
                await addSyllabusOutcome(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, typedBody.name, typedBody.description)
                return successResponse<AddSyllabusOutcomeResponse>({ success: true })
            }
            case "/remove-syllabus-outcome": {
                const typedBody: RemoveSyllabusOutcomeRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school id')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group id')
                }
                if (!typedBody.courseId) {
                    return errorResponse(400, 'Missing course id')
                }
                if (!typedBody.id) {
                    return errorResponse(400, 'Missing outcome id')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId
                let outcomeId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                    courseObjectId = new ObjectId(typedBody.courseId)
                    outcomeId = new ObjectId(typedBody.id)
                } catch (e) {
                    return errorResponse(400, 'Invalid school year group, course or outcome id')
                }
                await removeSyllabusOutcome(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, outcomeId)
                return successResponse<RemoveSyllabusOutcomeResponse>({ success: true })
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
                if (!('title' in postTemplate)) {
                    return errorResponse(400, 'Missing title')
                }
                if (!('content' in postTemplate)) {
                    return errorResponse(400, 'Missing content')
                }
                if (!postTemplate.attachments) {
                    return errorResponse(400, 'Missing attachments')
                }
                if (!typedBody.googleAccessToken) {
                    return errorResponse(400, 'Missing Google access token')
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
                const preparedPost = await preparePostFromTemplate(postTemplate, typedBody.googleAccessToken, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, classObjectIds)
                if (isAttachmentPreparationError(preparedPost)) {
                    return typedErrorResponse(400, preparedPost)
                }
                const postId = await createPost(db, school, preparedPost)

                if (postId) {
                    return successResponse<CreatePostResponse>({ postId: postId.toHexString() })
                } else {
                    return errorResponse(400, 'Invalid post')
                }
            }
            case "/list-posts": {
                const typedBody: ListPostsRequest = body
                if (!typedBody.limit) {
                    return errorResponse(400, 'Missing limit')
                }
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group ID')
                }
                let beforeDate: Date | null = null
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId | undefined
                let classObjectIds: ObjectId[] | undefined
                try {
                    if (typedBody.beforeDate) {
                        beforeDate = new Date(typedBody.beforeDate)
                    }
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                    courseObjectId = typedBody.courseId ? new ObjectId(typedBody.courseId) : undefined
                    classObjectIds = typedBody.classIds?.map((id: string) => new ObjectId(id))
                } catch (e) {
                    return errorResponse(400, 'Invalid before date, school, year group, course, or class ID')
                }
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                const posts = await listPosts(db, school, user._id!, beforeDate, typedBody.limit, yearGroupObjectId, courseObjectId, classObjectIds, typedBody.postTypes)
                return successResponse<ListPostsResponse>(posts)
            }
            case "/attachment-link": {
                const typedBody: AttachmentLinkRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.postId) {
                    return errorResponse(400, 'Missing post ID')
                }
                if (!typedBody.attachmentId) {
                    return errorResponse(400, 'Missing attachment ID')
                }
                let schoolId: ObjectId
                let postId: ObjectId
                let attachmentId: ObjectId
                let individualCopyOwnerIdFromBody: ObjectId | undefined = undefined
                try {
                    schoolId = new ObjectId(typedBody.schoolId)
                    postId = new ObjectId(typedBody.postId)
                    attachmentId = new ObjectId(typedBody.attachmentId)
                    if (typedBody.individualCopyOwnerId) {
                        individualCopyOwnerIdFromBody = new ObjectId(typedBody.individualCopyOwnerId)
                    }
                } catch (e) {
                    return errorResponse(400, 'Invalid post or attachment ID')
                }
                const school = await getSchool(db, user._id!, schoolId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                // Only teachers and administrators can request a copy from another user
                const isTeacherOrAdministrator = school.teacherIds.some(id => id.equals(user._id!)) || school.administratorIds.some(id => id.equals(user._id!))
                let ownerId: ObjectId
                if (isTeacherOrAdministrator && individualCopyOwnerIdFromBody) {
                    ownerId = individualCopyOwnerIdFromBody
                } else {
                    ownerId = user._id!
                }
                let ownerUserName: string
                if (ownerId.equals(user._id!)) {
                    ownerUserName = user.name
                } else {
                    const owner = await findUser(db, ownerId)
                    if (owner) {
                        ownerUserName = owner?.name
                    } else {
                        return errorResponse(404, 'User for individual copies not found: ' + typedBody.individualCopyOwnerId)
                    }
                }

                const link = await getUsableAttachmentLink(db, ownerId, ownerUserName, user._id!, user.email, school, postId, attachmentId)
                if (!link) {
                    return errorResponse(404, `Attachment not found or user does not have access`)
                }
                return successResponse<AttachmentLinkResponse>({ link })
            }
            case "/post": {
                const typedBody: GetPostRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.yearGroupId) {
                    return errorResponse(400, 'Missing year group ID')
                }
                if (!typedBody.postId) {
                    return errorResponse(400, 'Missing post ID')
                }
                let schoolObjectId: ObjectId
                let yearGroupObjectId: ObjectId
                let courseObjectId: ObjectId | undefined
                let classObjectIds: ObjectId[] | undefined
                let postId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                    postId = new ObjectId(typedBody.postId)
                    courseObjectId = typedBody.courseId ? new ObjectId(typedBody.courseId) : undefined
                    classObjectIds = typedBody.classIds?.map((id: string) => new ObjectId(id))
                } catch (e) {
                    return errorResponse(400, 'Invalid school, year group, post, course, or class ID')
                }
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                const post = await getPost(db, school, user._id!, postId, yearGroupObjectId, courseObjectId, classObjectIds)
                if (!post) {
                    return errorResponse(404, `Post not found or user does not have access`)
                }
                return successResponse<GetPostResponse>({ post })
            }
            case "/add-attachment-to-submission": {
                const typedBody: AddAttachmentToSubmissionRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.postId) {
                    return errorResponse(400, 'Missing post ID')
                }
                if (!typedBody.attachment) {
                    return errorResponse(400, 'Missing attachment')
                }
                if (!typedBody.googleAccessToken) {
                    return errorResponse(400, 'Missing Google access token')
                }
                let schoolObjectId: ObjectId
                let postId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    postId = new ObjectId(typedBody.postId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school or post ID')
                }
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                if (isAttachmentPreparationError(await prepareAttachments(typedBody.googleAccessToken, [typedBody.attachment]))) {
                    return errorResponse(400, 'Invalid attachment')
                }
                const result = await AddAttachmentToSubmission(db, user._id!, school, postId, {
                    ...typedBody.attachment,
                    id: new ObjectId(),
                })
                if (!result) {
                    return errorResponse(400, 'Invalid post')
                } else {
                    return successResponse<AddAttachmentToSubmissionResponse>({ attachmentId: result.toHexString() })
                }
            }
            case "/submit-assignment": {
                const typedBody: SubmitAssignmentRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.postId) {
                    return errorResponse(400, 'Missing post ID')
                }
                let schoolObjectId: ObjectId
                let postId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    postId = new ObjectId(typedBody.postId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school or post ID')
                }
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                const result = await submitAssignment(mongoClient, db, user._id!, school, postId)
                if (!result) {
                    return errorResponse(400, 'Invalid post')
                }
                return successResponse<SubmitAssignmentResponse>({ success: true })
            }
            case "/record-marks": {
                const typedBody: RecordMarksRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school id')
                }
                if (!typedBody.postId) {
                    return errorResponse(400, 'Missing post id')
                }
                if (!typedBody.studentUserId) {
                    return errorResponse(400, 'Missing student id')
                }
                if (!typedBody.marks) {
                    return errorResponse(400, 'Missing marks')
                }
                let schoolObjectId: ObjectId
                let postObjectId: ObjectId
                let studentObjectId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    postObjectId = new ObjectId(typedBody.postId)
                    studentObjectId = new ObjectId(typedBody.studentUserId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school, post or student ID')
                }
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                const marksResult = await RecordMarks(db, user._id!, studentObjectId, school, postObjectId, typedBody.marks)
                if (marksResult) {
                    if (typedBody.feedback) {
                        const feedbackResult = await RecordFeedback(db, user._id!, studentObjectId, school, postObjectId, typedBody.feedback)
                        if (feedbackResult) {
                            return successResponse<RecordMarksResponse>({ success: true })
                        }else {
                            return errorResponse(400, 'Invalid post')
                        }
                    }else {
                        return successResponse<RecordMarksResponse>({ success: true })
                    }
                } else {
                    return errorResponse(400, 'Invalid post')
                }
            }
            case "/add-comment": {
                const typedBody: AddCommentRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.postId) {
                    return errorResponse(400, 'Missing post ID')
                }
                if (!typedBody.comment) {
                    return errorResponse(400, 'Missing comment')
                }
                let schoolObjectId: ObjectId
                let postId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    postId = new ObjectId(typedBody.postId)
                }
                catch (e) {
                    return errorResponse(400, 'Invalid school or post ID')
                }
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                const result = await addComment(db, user._id!, school, postId, typedBody.comment)
                if (!result) {
                    return errorResponse(400, 'Invalid post')
                }
                return successResponse<AddCommentResponse>({ id: result.toHexString() })
            }
            case "/delete-comment": {
                const typedBody: DeleteCommentRequest = body
                if (!typedBody.schoolId) {
                    return errorResponse(400, 'Missing school ID')
                }
                if (!typedBody.postId) {
                    return errorResponse(400, 'Missing post ID')
                }
                if (!typedBody.commentId) {
                    return errorResponse(400, 'Missing comment ID')
                }
                let schoolObjectId: ObjectId
                let postId: ObjectId
                let commentId: ObjectId
                try {
                    schoolObjectId = new ObjectId(typedBody.schoolId)
                    postId = new ObjectId(typedBody.postId)
                    commentId = new ObjectId(typedBody.commentId)
                } catch (e) {
                    return errorResponse(400, 'Invalid school, post or comment ID')
                }
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                const result = await deleteComment(db, user._id!, school, postId, commentId)
                if (!result) {
                    return errorResponse(400, 'Invalid post')
                }
                return successResponse<DeleteCommentResponse>({ success: true })
            }
            default:
                return errorResponse(404, `Unknown path '${path}'`)
        }
    } catch (e) {
        return raiseInternalServerError(e)
    }
}
