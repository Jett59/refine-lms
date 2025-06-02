import { z } from "zod/v4"
import { AddAttachmentToSubmissionRequest, AddCommentRequest, AddSyllabusContentRequest, AddSyllabusOutcomeRequest, AddToClassRequest, AttachmentLinkRequest, CreateClassRequest, CreateCourseRequest, CreatePostRequest, CreateSchoolRequest, CreateYearGroupRequest, DeclineInvitationRequest, DeleteCommentRequest, GetPostRequest, GoogleAuthenticateRequest, GoogleRefreshRequest, GoogleRevokeRequest, InviteRequest, JoinSchoolRequest, ListPostsRequest, RecordMarksRequest, RemoveFromClassRequest, RemoveSyllabusContentRequest, RemoveSyllabusOutcomeRequest, RemoveUserRequest, RequestToJoinClassRequest, SubmitAssignmentRequest, UpdatePostRequest } from "../../data/api"
import { ObjectId } from "mongodb"
import { ATTACHMENT_TEMPLATE, POST_TEMPLATE, POST_TYPE } from "./post.zod"
import { getSchool } from "../schools"
import { DATE, OBJECT_ID } from "../basic.zod"

export const GOOGLE_AUTHENTICATE_REQUEST: z.ZodType<GoogleAuthenticateRequest> = z.object({
    code: z.string()
})
export const GOOGLE_REFRESH_REQUEST: z.ZodType<GoogleRefreshRequest> = z.object({
    refreshToken: z.string()
})
export const GOOGLE_REVOKE_REQUEST: z.ZodType<GoogleRevokeRequest> = z.object({
    accessToken: z.string(),
    refreshToken: z.string()
})

export const CREATE_SCHOOL_REQUEST: z.ZodType<CreateSchoolRequest> = z.object({
    name: z.string().nonempty().max(100)
})
export const CREATE_YEAR_GROUP_REQUEST: z.ZodType<CreateYearGroupRequest> = z.object({
    schoolId: OBJECT_ID,
    name: z.string().nonempty().max(100)
})
export const CREATE_COURSE_REQUEST: z.ZodType<CreateCourseRequest> = z.object({
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    name: z.string().nonempty().max(100),
    initialClassNames: z.array(z.string().nonempty().max(100))
})
export const CREATE_CLASS_REQUEST: z.ZodType<CreateClassRequest> = z.object({
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID,
    name: z.string().nonempty().max(100),
})
export const INVITE_REQUEST: z.ZodType<InviteRequest> = z.object({
    schoolId: OBJECT_ID,
    role: z.enum(['administrator', 'teacher', 'student']),
    email: z.string().nonempty().max(254) // TODO: validate email properly (must also be done on UI)
})
export const JOIN_SCHOOL_REQUEST: z.ZodType<JoinSchoolRequest> = z.object({
    schoolId: OBJECT_ID
})
export const DECLINE_INVITATION_REQUEST: z.ZodType<DeclineInvitationRequest> = z.object({
    schoolId: OBJECT_ID
})
export const REMOVE_USER_REQUEST: z.ZodType<RemoveUserRequest> = z.object({
    schoolId: OBJECT_ID,
    userId: OBJECT_ID
})
export const ADD_TO_CLASS_REQUEST: z.ZodType<AddToClassRequest> = z.object({
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID,
    classId: OBJECT_ID,
    role: z.enum(['teacher', 'student']),
    userId: OBJECT_ID
})
export const REMOVE_FROM_CLASS_REQUEST: z.ZodType<RemoveFromClassRequest> = z.object({
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID,
    classId: OBJECT_ID,
    userId: OBJECT_ID
})
export const REQUEST_TO_JOIN_CLASS_REQUEST: z.ZodType<RequestToJoinClassRequest> = z.object({
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID,
    classId: OBJECT_ID
})
export const ADD_SYLLABUS_CONTENT_REQUEST: z.ZodType<AddSyllabusContentRequest> = z.object({
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID,
    content: z.string().nonempty().max(350)
})
export const REMOVE_SYLLABUS_CONTENT_REQUEST: z.ZodType<RemoveSyllabusContentRequest> = z.object({
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID,
    id: OBJECT_ID
})
export const ADD_SYLLABUS_OUTCOME_REQUEST: z.ZodType<AddSyllabusOutcomeRequest> = z.object({
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID,
    name: z.string().nonempty().max(50),
    description: z.string().max(350)
})
export const REMOVE_SYLLABUS_OUTCOME_REQUEST: z.ZodType<RemoveSyllabusOutcomeRequest> = z.object({
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID,
    id: OBJECT_ID
})
export const CREATE_POST_REQUEST: z.ZodType<CreatePostRequest> = z.object({
    post: POST_TEMPLATE,
    googleAccessToken: z.string()
})
export const LIST_POSTS_REQUEST: z.ZodType<ListPostsRequest> = z.object({
    beforeDate: DATE.optional(),
    limit: z.number().int().positive().max(100),

    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID.optional(),
    classIds: z.array(OBJECT_ID).optional(),

    postTypes: z.array(POST_TYPE).optional(),
})
export const ATTACHMENT_LINK_REQUEST: z.ZodType<AttachmentLinkRequest> = z.object({
    schoolId: OBJECT_ID,
    postId: OBJECT_ID,
    attachmentId: OBJECT_ID,
    individualCopyOwnerId: OBJECT_ID.optional()
})
export const GET_POST_REQUEST: z.ZodType<GetPostRequest> = z.object({
    postId: OBJECT_ID,
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID.optional(),
    classIds: z.array(OBJECT_ID).optional()
})
export const UPDATE_POST_REQUEST: z.ZodType<UpdatePostRequest> = z.object({
    postId: OBJECT_ID,
    schoolId: OBJECT_ID,
    post: POST_TEMPLATE,
    googleAccessToken: z.string()
})
export const ADD_ATTACHMENT_TO_SUBMISSION_REQUEST: z.ZodType<AddAttachmentToSubmissionRequest> = z.object({
    schoolId: OBJECT_ID,
    postId: OBJECT_ID,
    attachment: ATTACHMENT_TEMPLATE,
    googleAccessToken: z.string()
})
export const SUBMIT_ASSIGNMENT_REQUEST: z.ZodType<SubmitAssignmentRequest> = z.object({
    schoolId: OBJECT_ID,
    postId: OBJECT_ID
})
export const RECORD_MARKS_REQUEST: z.ZodType<RecordMarksRequest> = z.object({
    schoolId: OBJECT_ID,
    postId: OBJECT_ID,
    studentUserId: OBJECT_ID,
    marks: z.record(OBJECT_ID, z.number().int().nonnegative()),
    feedback: z.string().max(2500).optional()
})
export const ADD_COMMENT_REQUEST: z.ZodType<AddCommentRequest> = z.object({
    schoolId: OBJECT_ID,
    postId: OBJECT_ID,
    comment: z.string().nonempty().max(1000)
})
export const DELETE_COMMENT_REQUEST: z.ZodType<DeleteCommentRequest> = z.object({
    schoolId: OBJECT_ID,
    postId: OBJECT_ID,
    commentId: OBJECT_ID
})
