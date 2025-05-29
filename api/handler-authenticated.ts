import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";
import { errorResponse, getPath, raiseInternalServerError, successResponse, typedErrorResponse } from "./handlers";
import { MongoClient, ObjectId } from "mongodb";
import { createUser, findUser, findUserByJwtUserId, User } from "./user";
import { addSyllabusContent, addSyllabusOutcome, addToClass, createClass, createCourse, createSchool, createYearGroup, declineInvitation, getRelevantSchoolInfo, getSchool, getSchoolStructure, invite, joinSchool, listVisibleSchools, removeFromClass, removeSyllabusContent, removeSyllabusOutcome, removeUser, requestToJoinClass } from "./schools";
import { AddAttachmentToSubmissionRequest, AddAttachmentToSubmissionResponse, AddCommentRequest, AddCommentResponse, AddSyllabusContentRequest, AddSyllabusContentResponse, AddSyllabusOutcomeRequest, AddSyllabusOutcomeResponse, AddToClassRequest, AddToClassResponse, AttachmentLinkRequest, AttachmentLinkResponse, CreateClassRequest, CreateClassResponse, CreateCourseRequest, CreateCourseResponse, CreatePostRequest, CreatePostResponse, CreateSchoolRequest, CreateSchoolResponse, CreateYearGroupRequest, CreateYearGroupResponse, DeclineInvitationRequest, DeclineInvitationResponse, DeleteCommentRequest, DeleteCommentResponse, GetPostRequest, GetPostResponse, InviteRequest, InviteResponse, JoinSchoolRequest, JoinSchoolResponse, ListPostsRequest, ListPostsResponse, RecordMarksRequest, RecordMarksResponse, RelevantSchoolInfoResponse, RemoveFromClassRequest, RemoveFromClassResponse, RemoveSyllabusContentRequest, RemoveSyllabusContentResponse, RemoveSyllabusOutcomeRequest, RemoveSyllabusOutcomeResponse, RemoveUserRequest, RequestToJoinClassRequest, RequestToJoinClassResponse, SchoolStructureResponse, SubmitAssignmentRequest, SubmitAssignmentResponse, UpdatePostRequest, UpdatePostResponse, VisibleSchoolsResponse } from "../data/api";
import { AddAttachmentToSubmission, addComment, createPost, deleteComment, getPost, getUsableAttachmentLink, listPosts, preparePostFromTemplate, RecordFeedback, RecordMarks, submitAssignment, updatePost } from "./posts";
import { AttachmentPreparationError, isAttachmentPreparationError, prepareAttachments } from "./google-drive";
import { ADD_ATTACHMENT_TO_SUBMISSION_REQUEST, ADD_COMMENT_REQUEST, ADD_SYLLABUS_CONTENT_REQUEST, ADD_SYLLABUS_OUTCOME_REQUEST, ADD_TO_CLASS_REQUEST, ATTACHMENT_LINK_REQUEST, CREATE_CLASS_REQUEST, CREATE_COURSE_REQUEST, CREATE_POST_REQUEST, CREATE_SCHOOL_REQUEST, CREATE_YEAR_GROUP_REQUEST, DECLINE_INVITATION_REQUEST, DELETE_COMMENT_REQUEST, GET_POST_REQUEST, INVITE_REQUEST, JOIN_SCHOOL_REQUEST, LIST_POSTS_REQUEST, RECORD_MARKS_REQUEST, REMOVE_FROM_CLASS_REQUEST, REMOVE_SYLLABUS_CONTENT_REQUEST, REMOVE_SYLLABUS_OUTCOME_REQUEST, REMOVE_USER_REQUEST, REQUEST_TO_JOIN_CLASS_REQUEST, SUBMIT_ASSIGNMENT_REQUEST, UPDATE_POST_REQUEST } from "./data/api.zod";
import { z } from "zod/v4";

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
                const bodyParseResult = CREATE_SCHOOL_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                return successResponse<CreateSchoolResponse>({ createdId: (await createSchool(db, user._id!, typedBody.name)).toHexString() })
            }
            case "/create-year-group": {
                const bodyParseResult = CREATE_YEAR_GROUP_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                return successResponse<CreateYearGroupResponse>({ createdId: (await createYearGroup(db, user._id!, schoolObjectId, typedBody.name)).toHexString() })
            }
            case "/create-course": {
                const bodyParseResult = CREATE_COURSE_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
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
                const bodyParseResult = CREATE_CLASS_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                const courseObjectId = new ObjectId(typedBody.courseId)
                return successResponse<CreateClassResponse>({ createdId: (await createClass(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, typedBody.name)).toHexString() })
            }
            case "/invite": {
                const bodyParseResult = INVITE_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                await invite(db, user._id!, schoolObjectId, typedBody.role, typedBody.email)
                return successResponse<InviteResponse>({ success: true })
            }
            case "/join-school": {
                const bodyParseResult = JOIN_SCHOOL_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                await joinSchool(db, user._id!, user.email, schoolObjectId)
                return successResponse<JoinSchoolResponse>({ success: true })
            }
            case "/decline-invitation": {
                const bodyParseResult = DECLINE_INVITATION_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                await declineInvitation(db, user.email, schoolObjectId)
                return successResponse<DeclineInvitationResponse>({ success: true })
            }
            case "/remove-user": {
                const bodyParseResult = REMOVE_USER_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                // This has to be done here, rather than in Zod, because it relies on the user's ID
                if (typedBody.userId === user._id?.toHexString()) {
                    return errorResponse(400, 'Cannot remove yourself')
                }
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const userObjectId = new ObjectId(typedBody.userId)
                await removeUser(db, user._id!, schoolObjectId, userObjectId)
                return successResponse<DeclineInvitationResponse>({ success: true })
            }
            case "/add-to-class": {
                const bodyParseResult = ADD_TO_CLASS_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                const courseObjectId = new ObjectId(typedBody.courseId)
                const classObjectId = new ObjectId(typedBody.classId)
                const additionalUserObjectId = new ObjectId(typedBody.userId)
                await addToClass(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, classObjectId, typedBody.role, additionalUserObjectId)
                return successResponse<AddToClassResponse>({ success: true })
            }
            case "/remove-from-class": {
                const bodyParseResult = REMOVE_FROM_CLASS_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                const courseObjectId = new ObjectId(typedBody.courseId)
                const classObjectId = new ObjectId(typedBody.classId)
                const userObjectId = new ObjectId(typedBody.userId)
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
                const bodyParseResult = REQUEST_TO_JOIN_CLASS_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                const courseObjectId = new ObjectId(typedBody.courseId)
                const classObjectId = new ObjectId(typedBody.classId)
                await requestToJoinClass(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, classObjectId)
                return successResponse<RequestToJoinClassResponse>({ success: true })
            }
            case "/add-syllabus-content": {
                const bodyParseResult = ADD_SYLLABUS_CONTENT_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                const courseObjectId = new ObjectId(typedBody.courseId)
                await addSyllabusContent(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, typedBody.content)
                return successResponse<AddSyllabusContentResponse>({ success: true })
            }
            case "/remove-syllabus-content": {
                const bodyParseResult = REMOVE_SYLLABUS_CONTENT_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                const courseObjectId = new ObjectId(typedBody.courseId)
                const contentId = new ObjectId(typedBody.id)
                await removeSyllabusContent(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, contentId)
                return successResponse<RemoveSyllabusContentResponse>({ success: true })
            }
            case "/add-syllabus-outcome": {
                const bodyParseResult = ADD_SYLLABUS_OUTCOME_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                const courseObjectId = new ObjectId(typedBody.courseId)
                await addSyllabusOutcome(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, typedBody.name, typedBody.description)
                return successResponse<AddSyllabusOutcomeResponse>({ success: true })
            }
            case "/remove-syllabus-outcome": {
                const bodyParseResult = REMOVE_SYLLABUS_OUTCOME_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                const courseObjectId = new ObjectId(typedBody.courseId)
                const outcomeId = new ObjectId(typedBody.id)
                await removeSyllabusOutcome(db, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, outcomeId)
                return successResponse<RemoveSyllabusOutcomeResponse>({ success: true })
            }
            case "/create-post": {
                const bodyParseResult = CREATE_POST_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const postTemplate = typedBody.post
                const schoolObjectId = new ObjectId(postTemplate.schoolId)
                const yearGroupObjectId = new ObjectId(postTemplate.yearGroupId)
                const courseObjectId = postTemplate.courseId ? new ObjectId(postTemplate.courseId) : undefined
                const classObjectIds = postTemplate.classIds?.map((id: string) => new ObjectId(id))
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                const preparedPost = await preparePostFromTemplate(postTemplate, typedBody.googleAccessToken, user._id!, schoolObjectId, yearGroupObjectId, courseObjectId, classObjectIds)
                if (isAttachmentPreparationError(preparedPost)) {
                    return typedErrorResponse<AttachmentPreparationError>(400, preparedPost)
                }
                const postId = await createPost(db, school, preparedPost)
                if (postId) {
                    return successResponse<CreatePostResponse>({ postId: postId.toHexString() })
                } else {
                    return errorResponse(400, 'Invalid post')
                }
            }
            case "/list-posts": {
                const bodyParseResult = LIST_POSTS_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const beforeDate = typedBody.beforeDate ? new Date(typedBody.beforeDate) : null
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                const courseObjectId = typedBody.courseId ? new ObjectId(typedBody.courseId) : undefined
                const classObjectIds = typedBody.classIds?.map((id: string) => new ObjectId(id))
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                const posts = await listPosts(db, school, user._id!, beforeDate, typedBody.limit, yearGroupObjectId, courseObjectId, classObjectIds, typedBody.postTypes)
                return successResponse<ListPostsResponse>(posts)
            }
            case "/attachment-link": {
                const bodyParseResult = ATTACHMENT_LINK_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolId = new ObjectId(typedBody.schoolId)
                const postId = new ObjectId(typedBody.postId)
                const attachmentId = new ObjectId(typedBody.attachmentId)
                const individualCopyOwnerIdFromBody = typedBody.individualCopyOwnerId ? new ObjectId(typedBody.individualCopyOwnerId) : null
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
                const bodyParseResult = GET_POST_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.yearGroupId)
                const postId = new ObjectId(typedBody.postId)
                const courseObjectId = typedBody.courseId ? new ObjectId(typedBody.courseId) : undefined
                const classObjectIds = typedBody.classIds?.map((id: string) => new ObjectId(id))
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
            case "/update-post": {
                const bodyParseResult = UPDATE_POST_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const yearGroupObjectId = new ObjectId(typedBody.post.yearGroupId)
                const postId = new ObjectId(typedBody.postId)
                const courseObjectId = typedBody.post.courseId ? new ObjectId(typedBody.post.courseId) : null
                const classObjectIds = typedBody.post.classIds?.map((id: string) => new ObjectId(id)) ?? null
                const linkedSyllabusContentIds = typedBody.post.linkedSyllabusContentIds.map((id: string) => new ObjectId(id)) ?? null
                const dueDate = typedBody.post.isoDueDate ? new Date(typedBody.post.isoDueDate) : null
                const school = await getSchool(db, user._id!, schoolObjectId)
                if (!school) {
                    return errorResponse(404, `School not found or user does not have access`)
                }
                const result = await updatePost(mongoClient, db, user._id!, typedBody.googleAccessToken, postId, typedBody.post, school, yearGroupObjectId, courseObjectId, classObjectIds, linkedSyllabusContentIds, dueDate)
                if (result !== true) {
                    if (result === false) {
                    return errorResponse(400, 'Invalid post')
                    }else {
                        // The result is a Google drive attachment error
                        return typedErrorResponse<AttachmentPreparationError>(400, result)
                    }
                } else {
                    return successResponse<UpdatePostResponse>({ success: true })
                }
            }
            case "/add-attachment-to-submission": {
                const bodyParseResult = ADD_ATTACHMENT_TO_SUBMISSION_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const postId = new ObjectId(typedBody.postId)
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
                const bodyParseResult = SUBMIT_ASSIGNMENT_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const postId = new ObjectId(typedBody.postId)
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
                const bodyParseResult = RECORD_MARKS_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const postObjectId = new ObjectId(typedBody.postId)
                const studentObjectId = new ObjectId(typedBody.studentUserId)
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
                        } else {
                            return errorResponse(400, 'Invalid post')
                        }
                    } else {
                        return successResponse<RecordMarksResponse>({ success: true })
                    }
                } else {
                    return errorResponse(400, 'Invalid post')
                }
            }
            case "/add-comment": {
                const bodyParseResult = ADD_COMMENT_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const postId = new ObjectId(typedBody.postId)
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
                const bodyParseResult = DELETE_COMMENT_REQUEST.safeParse(body)
                if (!bodyParseResult.success) {
                    return errorResponse(400, z.prettifyError(bodyParseResult.error))
                }
                const typedBody = bodyParseResult.data
                const schoolObjectId = new ObjectId(typedBody.schoolId)
                const postId = new ObjectId(typedBody.postId)
                const commentId = new ObjectId(typedBody.commentId)
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
