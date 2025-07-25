import { ClientSession, Db, Filter, MongoClient, ObjectId } from "mongodb"
import { Course, School } from "./schools"
import { AttachmentTemplate, MarkingCriterionTemplate, PostInfo, PostTemplate, PostType } from "../data/post"
import { AttachmentPreparationError, ListPostsResponse } from "../data/api"
import { findUserInfos } from "./user"
import { createCopy, getFileLink, prepareAttachments } from "./google-drive"
import { access, link } from "fs"

export interface Post {
    _id?: ObjectId
    postDate: Date
    posterId: ObjectId
    schoolId: ObjectId
    yearGroupId: ObjectId
    courseId: ObjectId | null
    classIds: ObjectId[] | null
    private: boolean
    type: 'post' | 'assignment'
    title: string
    content: string
    linkedSyllabusContentIds: ObjectId[] | null
    attachments: Attachment[]
    comments: Comment[] | null

    // For assignments:
    isoDueDate: Date | null
    submissionTemplates: Attachment[] | null // 'copied', othersCanEdit
    studentAttachments: { [studentId: string]: Attachment[] } | null // 'shared', !othersCanEdit
    isoSubmissionDates: { [studentId: string]: Date } | null
    markingCriteria: MarkingCriterion[] | null
    marks: { [userId: string]: { [criterionId: string]: number } } | null
    feedback: { [userId: string]: string } | null
}

export interface Attachment {
    id: ObjectId
    title: string
    thumbnail: string
    mimeType: string
    shareMode?: 'shared' | 'copied' // default is 'shared'
    othersCanEdit?: boolean // default is false
    host: 'google',
    googleFileId: string

    cachedLink?: string
    usersWithAccess?: ObjectId[]

    perUserLinks?: { [userId: string]: string }
    perUserFileIds?: { [userId: string]: string }
    perUserUsersWithAccess?: { [userId: string]: ObjectId[] }
}

export interface MarkingCriterion {
    id: ObjectId
    title: string
    maximumMarks: number
}

export interface Comment {
    id: ObjectId
    userId: ObjectId
    date: Date
    content: string
}

const COLLECTION_NAME = 'posts'

function getCollection(db: Db) {
    return db.collection<Post>(COLLECTION_NAME)
}

function filterClassList(posterId: ObjectId, school: School, course: Course, classIds: ObjectId[]) {
    // The classes should only be the ones which are visible to the poster
    // Non-students can see everything
    if (school.studentIds.some(student => student.equals(posterId))) {
        return classIds.filter(classId => course.classes.find(cls => cls.id.equals(classId))?.studentIds.some(studentId => studentId.equals(posterId)))
    } else {
        return classIds
    }
}

export async function preparePostFromTemplate(postTemplate: PostTemplate, googleAccessToken: string, posterId: ObjectId, schoolId: ObjectId, yearGroupId: ObjectId, courseId?: ObjectId, classIds?: ObjectId[]): Promise<Post | AttachmentPreparationError> {
    if (postTemplate.attachments.length > 0) {
        const attachmentStatus = await prepareAttachments(googleAccessToken, postTemplate.attachments)
        if (attachmentStatus !== true) {
            return attachmentStatus
        }
    }
    if (postTemplate.submissionTemplates && postTemplate.submissionTemplates.length > 0) {
        const templateStatus = await prepareAttachments(googleAccessToken, postTemplate.submissionTemplates)
        if (templateStatus !== true) {
            return templateStatus
        }
    }
    const linkedSyllabusContentIds = postTemplate.linkedSyllabusContentIds.map(id => {
        try {
            return new ObjectId(id)
        } catch (e) {
            return null
        }
    }).filter(id => id !== null) as ObjectId[]
    return {
        postDate: new Date(),
        posterId,
        schoolId,
        yearGroupId,
        courseId: courseId ?? null,
        classIds: classIds ?? null,
        private: postTemplate.private,
        type: postTemplate.type,
        title: postTemplate.title,
        content: postTemplate.content,
        linkedSyllabusContentIds,
        attachments: postTemplate.attachments.map(attachment => ({
            id: new ObjectId(),
            title: attachment.title,
            thumbnail: attachment.thumbnail,
            mimeType: attachment.mimeType,
            shareMode: attachment.shareMode,
            othersCanEdit: attachment.othersCanEdit,
            host: attachment.host,
            googleFileId: attachment.googleFileId
        })),
        comments: null,
        isoDueDate: postTemplate.isoDueDate ? new Date(postTemplate.isoDueDate) : null,
        submissionTemplates: postTemplate.submissionTemplates?.map(attachment => ({
            id: new ObjectId(),
            title: attachment.title,
            thumbnail: attachment.thumbnail,
            mimeType: attachment.mimeType,
            shareMode: 'copied',
            othersCanEdit: true,
            host: attachment.host,
            googleFileId: attachment.googleFileId
        })) ?? null,
        studentAttachments: null,
        isoSubmissionDates: null,
        markingCriteria: postTemplate.markingCriteria?.map(criterion => ({
            id: new ObjectId(),
            title: criterion.title,
            maximumMarks: criterion.maximumMarks
        })) ?? null,
        marks: null,
        feedback: null,
    }
}

function getPerUserFileId(attachment: Attachment, owningUserId: ObjectId) {
    if (attachment.perUserFileIds && attachment.perUserFileIds[owningUserId.toHexString()]) {
        return attachment.perUserFileIds[owningUserId.toHexString()]
    }
    return null
}

function getCachedAttachmentLinkIfAvailable(attachment: Attachment, owningUserId: ObjectId, accessingUserId: ObjectId) {
    if (attachment.usersWithAccess?.some(id => id.equals(accessingUserId)) && attachment.cachedLink) {
        return attachment.cachedLink
    }
    if (attachment.perUserLinks && attachment.perUserLinks[owningUserId.toHexString()] && attachment.perUserUsersWithAccess && attachment.perUserUsersWithAccess[owningUserId.toHexString()] && attachment.perUserUsersWithAccess[owningUserId.toHexString()].some(id => id.equals(accessingUserId))) {
        return attachment.perUserLinks[owningUserId.toHexString()]
    }
    return null
}

export async function convertPostsForApi(db: Db, isStudent: boolean, currentUserId: ObjectId, posts: Post[]): Promise<PostInfo[]> {
    const userIds = posts.map(post => post.posterId).filter(id => id !== undefined)
        .concat(posts.flatMap(post => post.comments?.map(comment => comment.userId) ?? []))
        // Distinct: remove all elements where the ID has been seen previously
        .filter((id, index, self) => self.findIndex(id2 => id2.equals(id)) === index)
    const userInfos = await findUserInfos(db, userIds)

    return posts.map(post => {
        if (!post._id) {
            return null
        }
        const userInfo = userInfos.find(userInfo => userInfo.id === post.posterId.toHexString())
        if (!userInfo) {
            return null
        }

        let visibleStudentAttachments: { [id: string]: Attachment[] } | null = null
        if (isStudent) {
            if (post.studentAttachments?.[currentUserId.toHexString()]) {
                visibleStudentAttachments = { [currentUserId.toHexString()]: post.studentAttachments?.[currentUserId.toHexString()] }
            }
        } else {
            visibleStudentAttachments = post.studentAttachments
        }

        let visibleMarks: { [id: string]: { [criterionId: string]: number } } | null = null
        if (isStudent) {
            if (post.marks?.[currentUserId.toHexString()]) {
                visibleMarks = { [currentUserId.toHexString()]: post.marks?.[currentUserId.toHexString()] }
            }
        } else {
            visibleMarks = post.marks
        }

        let visibleFeedback: { [id: string]: string } | null = null
        if (isStudent) {
            if (post.feedback?.[currentUserId.toHexString()]) {
                visibleFeedback = { [currentUserId.toHexString()]: post.feedback?.[currentUserId.toHexString()] }
            }
        } else {
            visibleFeedback = post.feedback
        }

        return {
            id: post._id.toHexString(),
            postDate: post.postDate.toISOString(),
            poster: userInfo,
            schoolId: post.schoolId.toHexString(),
            yearGroupId: post.yearGroupId.toHexString(),
            courseId: post.courseId?.toHexString() ?? undefined,
            classIds: post.classIds?.map(id => id.toHexString()) ?? undefined,
            private: post.private,
            type: post.type,
            title: post.title,
            content: post.content,
            linkedSyllabusContentIds: post.linkedSyllabusContentIds?.map(id => id.toHexString()) ?? [],
            attachments: post.attachments.map(attachment => ({
                id: attachment.id.toHexString(),
                title: attachment.title,
                thumbnail: attachment.thumbnail,
                mimeType: attachment.mimeType,
                shareMode: attachment.shareMode || 'shared',
                othersCanEdit: attachment.othersCanEdit ?? false,
                host: attachment.host,
                googleFileId: attachment.googleFileId,
                accessLink: getCachedAttachmentLinkIfAvailable(attachment, currentUserId, currentUserId) ?? undefined
            })),
            comments: post.comments?.map(comment => {
                const userInfo = userInfos.find(userInfo => userInfo.id === comment.userId.toHexString())
                if (!userInfo) {
                    return null
                }
                return {
                    id: comment.id.toHexString(),
                    date: comment.date.toISOString(),
                    content: comment.content,
                    user: userInfo
                }
            }).filter(comment => comment !== null) ?? [],
            isoDueDate: post.isoDueDate?.toISOString() ?? undefined,
            isoSubmissionDates: post.isoSubmissionDates ? Object.fromEntries(Object.entries(post.isoSubmissionDates).map(([studentId, date]) => [
                studentId,
                date.toISOString()
            ])) : undefined,
            submissionTemplates: post.submissionTemplates?.map(attachment => ({
                id: attachment.id.toHexString(),
                title: attachment.title,
                thumbnail: attachment.thumbnail,
                mimeType: attachment.mimeType,
                shareMode: 'copied' as 'copied',
                othersCanEdit: true,
                host: attachment.host,
                googleFileId: attachment.googleFileId,
                accessLink: getCachedAttachmentLinkIfAvailable(attachment, currentUserId, currentUserId) ?? undefined
            })) ?? undefined,
            studentAttachments: visibleStudentAttachments ? Object.fromEntries(Object.entries(visibleStudentAttachments).map(([studentId, attachments]) => [
                studentId,
                attachments.map(attachment => ({
                    id: attachment.id.toHexString(),
                    title: attachment.title,
                    thumbnail: attachment.thumbnail,
                    mimeType: attachment.mimeType,
                    shareMode: 'shared' as 'shared',
                    othersCanEdit: false,
                    host: attachment.host,
                    googleFileId: attachment.googleFileId,
                    accessLink: getCachedAttachmentLinkIfAvailable(attachment, currentUserId, new ObjectId(studentId)) ?? undefined
                }))
            ])) : undefined,
            markingCriteria: post.markingCriteria?.map(criterion => ({
                id: criterion.id.toHexString(),
                title: criterion.title,
                maximumMarks: criterion.maximumMarks
            })) ?? undefined,
            marks: visibleMarks ?? undefined,
            feedback: visibleFeedback ?? undefined,
        }
    }).filter(post => post !== null)
}

function canViewPosts(userId: ObjectId, school: School, yearGroupId: ObjectId, courseId?: ObjectId) {
    const isStudent = school.studentIds.some(studentId => studentId.equals(userId))
    const isTeacher = school.teacherIds.some(teacherId => teacherId.equals(userId))
    const isAdministrator = school.administratorIds.some(adminId => adminId.equals(userId))
    if (isStudent) {
        // Students have to be in the year group
        const yearGroup = school.yearGroups.find(yg => yg.id.equals(yearGroupId))
        if (!yearGroup) {
            return false
        }
        const studentsInYearGroup = yearGroup.courses.flatMap(course => course.classes).flatMap(cls => cls.studentIds)
        if (!studentsInYearGroup.some(studentId => studentId.equals(userId))) {
            return false
        }
        // If the course id is specified, they have to be in the course
        if (courseId) {
            const course = yearGroup.courses.find(course => course.id.equals(courseId))
            if (!course) {
                return false
            }
            const studentsInCourse = course.classes.flatMap(cls => cls.studentIds)
            if (!studentsInCourse.some(studentId => studentId.equals(userId))) {
                return false
            }
            return true
        } else {
            return true
        }
    } else if (isTeacher || isAdministrator) {
        // Teachers and administrators can view everything, but we should check that everything exists
        const yearGroup = school.yearGroups.find(yg => yg.id.equals(yearGroupId))
        if (!yearGroup) {
            return false
        }
        if (courseId) {
            const course = yearGroup.courses.find(course => course.id.equals(courseId))
            if (!course) {
                return false
            }
            return true
        } else {
            return true
        }
    } else {
        // If the user isn't in the school at all, they can't view anything
        return false
    }
}

export async function createPost(db: Db, school: School, post: Post) {
    const postCopy = { ...post }
    if (!canViewPosts(post.posterId, school, post.yearGroupId, post.courseId ?? undefined)) {
        return null
    }
    if (post.courseId && post.classIds) {
        const course = school.yearGroups.find(yg => yg.id.equals(post.yearGroupId))?.courses.find(c => c.id.equals(post.courseId))
        if (course) {
            postCopy.classIds = filterClassList(post.posterId, school, course, post.classIds)
        }
    }
    // Students can't create assignments
    if (school.studentIds.some(studentId => studentId.equals(post.posterId)) && post.type === 'assignment') {
        return null
    }
    const response = await getCollection(db).insertOne(postCopy)
    return response.insertedId
}

function getFilterForPosts(school: School, userId: ObjectId, beforeDate: Date | null, yearGroupId: ObjectId, courseId: ObjectId | undefined, classIds: ObjectId[] | undefined, postTypes: PostType[] | undefined): Filter<Post> | null {
    if (!canViewPosts(userId, school, yearGroupId, courseId)) {
        return null
    }
    if (courseId && classIds) {
        const course = school.yearGroups.find(yg => yg.id.equals(yearGroupId))?.courses.find(c => c.id.equals(courseId))
        if (course) {
            classIds = filterClassList(userId, school, course, classIds)
        }
    }
    const isStudent = school.studentIds.some(studentId => studentId.equals(userId))

    const studentFilter: Filter<Post> = isStudent ? {
        $or: [
            { private: false },
            { posterId: userId }
        ]
    } : {}

    const classFilter: Filter<Post> = {
        $or: [
            { classIds: null },
            { classIds: { $size: 0 } },
            ...classIds ? [{ classIds: { $in: classIds } }] : [],
        ]
    }

    const postTypeFilter: Filter<Post> = postTypes ? {
        type: { $in: postTypes }
    } : {}

    return {
        postDate: { $lt: beforeDate ?? new Date() },
        schoolId: school._id,
        yearGroupId,
        $and: [
            studentFilter,
            classFilter,
            postTypeFilter,
        ],
        ...courseId ? { courseId } : { courseId: null },
    }
}

export async function listPosts(db: Db, school: School, userId: ObjectId, beforeDate: Date | null, limit: number, yearGroupId: ObjectId, courseId: ObjectId | undefined, classIds: ObjectId[] | undefined, postTypes: PostType[] | undefined): Promise<ListPostsResponse> {
    const filter = getFilterForPosts(school, userId, beforeDate, yearGroupId, courseId, classIds, postTypes)
    if (!filter) {
        return {
            posts: [],
            isEnd: true
        }
    }

    const isStudent = school.studentIds.some(student => student.equals(userId))

    const collection = getCollection(db)
    const cursor = await collection.find(filter).sort({ postDate: -1 })
    const count = await collection.countDocuments(filter)
    const posts = await cursor.limit(limit).toArray()
    return {
        posts: await convertPostsForApi(db, isStudent, userId, posts),
        isEnd: count <= limit
    }
}

async function getRawPost(db: Db, school: School, userId: ObjectId, postId: ObjectId, yearGroupId: ObjectId, courseId?: ObjectId, classIds?: ObjectId[], transaction?: ClientSession): Promise<Post | null> {
    // We use the same filter as listPosts, but with the post id added
    const filter = getFilterForPosts(school, userId, null, yearGroupId, courseId, classIds, undefined)
    if (!filter) {
        return null
    }
    filter._id = postId

    const post = await getCollection(db).findOne(filter, { session: transaction })
    if (!post) {
        return null
    }
    return post
}

export async function getPost(db: Db, school: School, userId: ObjectId, postId: ObjectId, yearGroupId: ObjectId, courseId?: ObjectId, classIds?: ObjectId[]): Promise<PostInfo | null> {
    const isStudent = school.studentIds.some(student => student.equals(userId))
    const rawPost = await getRawPost(db, school, userId, postId, yearGroupId, courseId, classIds)
    if (rawPost) {
        return (await convertPostsForApi(db, isStudent, userId, [rawPost]))[0]
    } else {
        return null
    }
}

type LinkAccessorType = (googleFileId: string, googleFileName: string, userEmail: string, userName: string, hasEditAccess: boolean, shouldCreateCopy: boolean) => Promise<{ link: string, fileId: string } | null>
/**
 * 
 * @param db 
 * @param owningUserId the user who the attachment will be created for (usually the same as the accessing user)
 * @param owningUserName
 * @param accessingUserId the user id of the user who is accessing the file (see below)
 * @param accessingUserEmail the email address of the user who will access the file
 * This may differ from the owning user if a teacher is viewing the personal copy created by a student
 * @param school the school which the post was posted to
 * @param postId 
 * @param attachmentId the id of the attachment
 * @param linkAccessor (optional) a custom function to get the link from Google
 * @returns a link which can be used by the given email to access the file
 */
export async function getUsableAttachmentLink(db: Db, owningUserId: ObjectId, owningUserName: string, accessingUserId: ObjectId, accessingUserEmail: string, school: School, postId: ObjectId, attachmentId: ObjectId, linkAccessor?: LinkAccessorType): Promise<string | null> {
    const post = await getCollection(db).findOne({ _id: postId })
    if (!post) {
        return null
    }
    if (!post.schoolId.equals(school._id)) {
        return null
    }
    if (!canViewPosts(owningUserId, school, post.yearGroupId, post.courseId ?? undefined)) {
        return null
    }
    let attachment
    let attachmentSource
    let attachmentIsFromStudentAttachments = false
    const attachmentFromAttachments = post.attachments.find(attachment => attachment.id.equals(attachmentId))
    if (!attachmentFromAttachments) {
        const attachmentFromSubmissionTemplates = post.submissionTemplates?.find(attachment => attachment.id.equals(attachmentId))
        if (!attachmentFromSubmissionTemplates) {
            const attachmentFromStudentAttachments = post.studentAttachments?.[owningUserId.toHexString()]?.find(attachment => attachment.id.equals(attachmentId))
            attachment = attachmentFromStudentAttachments
            attachmentSource = 'studentAttachments.' + owningUserId.toHexString()
            attachmentIsFromStudentAttachments = true
        } else {
            attachment = attachmentFromSubmissionTemplates
            attachmentSource = 'submissionTemplates'
        }
    } else {
        attachment = attachmentFromAttachments
        attachmentSource = 'attachments'
    }
    if (!attachment) {
        return null
    }
    const isSubmitted = Boolean(post.isoSubmissionDates?.[owningUserId.toHexString()])
    // The rules for edit access:
    // - If the attachment is part of a submission, then it is not editable
    // - If the accessing user is the same as the owning user:
    //   * If individual copies are to be created, then the attachment is editable
    //   * If othersCanEdit, then the attachment is editable
    //   * If the user created the post, then it is editable
    //   * If the attachment is from studentAttachments[accessingUserId] (owningUserId === accessingUserId), then it is editable
    // - If the accessing user is not the owning user, then they can't edit
    const hasEditAccess = !isSubmitted && owningUserId.equals(accessingUserId) && (
        attachment.shareMode === 'copied'
        || attachment?.othersCanEdit
        || post.posterId.equals(accessingUserId)
        || attachmentIsFromStudentAttachments
    )
    const cachedLink = getCachedAttachmentLinkIfAvailable(attachment, owningUserId, accessingUserId)
    if (cachedLink) {
        return cachedLink
    }
    if (attachment.host === 'google') {
        const realLinkAccessor = linkAccessor ?? getFileLink
        const perUserFileId = getPerUserFileId(attachment, owningUserId)
        const shouldCreateCopy = attachment.shareMode === 'copied' && !perUserFileId
        const linkAndId = await realLinkAccessor(perUserFileId ?? attachment.googleFileId, attachment.title, accessingUserEmail, owningUserName, hasEditAccess, shouldCreateCopy)
        if (linkAndId) {
            const { link, fileId } = linkAndId
            if (attachment.shareMode === 'copied') {
                await getCollection(db).updateOne({
                    _id: postId,
                    [`${attachmentSource}.id`]: attachmentId
                }, {
                    $set: {
                        [`${attachmentSource}.$.perUserLinks.${owningUserId.toHexString()}`]: link,
                        [`${attachmentSource}.$.perUserFileIds.${owningUserId.toHexString()}`]: fileId
                    },
                    $addToSet: {
                        [`${attachmentSource}.$.perUserUsersWithAccess.${owningUserId.toHexString()}`]: accessingUserId
                    }
                })
            } else {
                await getCollection(db).updateOne({
                    _id: postId,
                    [`${attachmentSource}.id`]: attachmentId
                }, {
                    $set: {
                        [`${attachmentSource}.$.cachedLink`]: link
                    },
                    $addToSet: {
                        [`${attachmentSource}.$.usersWithAccess`]: accessingUserId
                    }
                })
            }
        }
        return linkAndId?.link ?? null
    } else {
        return null
    }
}

export async function AddAttachmentToSubmission(db: Db, userId: ObjectId, school: School, postId: ObjectId, attachment: Attachment): Promise<ObjectId | null> {
    const post = await getCollection(db).findOne({ _id: postId })
    if (!post) {
        return null
    }
    if (!post.schoolId.equals(school._id)) {
        return null
    }
    if (!canViewPosts(userId, school, post.yearGroupId, post.courseId ?? undefined)) {
        return null
    }
    // First, update to make sure the studentAttachments field exists.
    await getCollection(db).updateOne({
        _id: postId,
        studentAttachments: null
    }, {
        $set: {
            studentAttachments: {},
        }
    })
    // Then add it back
    await getCollection(db).updateOne({
        _id: postId
    }, {
        $push: {
            [`studentAttachments.${userId.toHexString()}`]: attachment
        }
    })
    return attachment.id
}

type FileCopier = (googleFileId: string, newFileName: string) => Promise<{ fileId: string } | null>
/**
 * Submits an assignment for a given user.
 * - Copies submission templates and student attachments to remove the user's access
 * - Registers the submission date
 * 
 * @param db 
 * @param userId 
 * @param school 
 * @param postId 
 * @param copyFile 
 */
export async function submitAssignment(client: MongoClient, db: Db, userId: ObjectId, school: School, postId: ObjectId, copyFile?: FileCopier): Promise<boolean> {
    const post = await getCollection(db).findOne({ _id: postId })
    if (!post) {
        return false
    }
    if (!post.schoolId.equals(school._id)) {
        return false
    }
    if (!canViewPosts(userId, school, post.yearGroupId, post.courseId ?? undefined)) {
        return false
    }
    if (post.type !== 'assignment') {
        return false
    }
    if (post.isoSubmissionDates && post.isoSubmissionDates[userId.toHexString()]) {
        return false
    }
    const submissionDate = new Date()
    const realCopyFile = copyFile ?? createCopy
    const transaction = client.startSession()
    try {
        await transaction.startTransaction()
        // Get the post again from within the transaction, in case it changed or something
        const post = await getCollection(db).findOne({ _id: postId }, { session: transaction })
        if (!post) {
            await transaction.abortTransaction()
            return false
        }
        // For each submission template, we should copy the user's copy and replace the old file id and link
        const submissionTemplates = post.submissionTemplates ?? []
        let failed = false
        const submissionTemplatesPromises = submissionTemplates.map(async attachment => {
            const fileId = getPerUserFileId(attachment, userId)
            if (fileId) {
                const newFileId = await realCopyFile(fileId, attachment.title)
                if (!newFileId) {
                    failed = true
                    return
                }
                await getCollection(db).updateOne({
                    _id: postId,
                    [`submissionTemplates.id`]: attachment.id
                }, {
                    $set: {
                        [`submissionTemplates.$.perUserFileIds.${userId.toHexString()}`]: newFileId.fileId,
                        [`submissionTemplates.$.perUserUsersWithAccess.${userId.toHexString()}`]: []
                    },
                    $unset: {
                        [`submissionTemplates.$.perUserLinks.${userId.toHexString()}`]: ""
                    }
                }, { session: transaction })
            }
        })
        // For each student attachment, we should copy the user's copy and replace the old file id and link
        const studentAttachments = post.studentAttachments?.[userId.toHexString()] ?? []
        const studentAttachmentsPromises = studentAttachments.map(async attachment => {
            const fileId = attachment.googleFileId
            if (fileId) {
                const newFileId = await realCopyFile(fileId, attachment.title)
                if (!newFileId) {
                    failed = true
                    return
                }
                await getCollection(db).updateOne({
                    _id: postId,
                    [`studentAttachments.${userId.toHexString()}.id`]: attachment.id
                }, {
                    // Remember that these are *not* individual copy attachments, so they don't have any of the perUser* fields
                    $set: {
                        [`studentAttachments.${userId.toHexString()}.$.googleFileId`]: newFileId.fileId,
                        [`studentAttachments.${userId.toHexString()}.$.usersWithAccess`]: []
                    },
                    $unset: {
                        [`studentAttachments.${userId.toHexString()}.$.cachedLink`]: ""
                    }
                }, { session: transaction })
            }
        })
        await Promise.all([
            ...submissionTemplatesPromises,
            ...studentAttachmentsPromises
        ])
        if (failed) {
            await transaction.abortTransaction()
            return false
        }
        // Then we should set the submission date
        // First make sure the field exists
        await getCollection(db).updateOne({
            _id: postId,
            isoSubmissionDates: null
        }, {
            $set: {
                isoSubmissionDates: {}
            }
        }, { session: transaction })
        await getCollection(db).updateOne({
            _id: postId
        }, {
            $set: {
                [`isoSubmissionDates.${userId.toHexString()}`]: submissionDate
            }
        }, { session: transaction })
        await transaction.commitTransaction()
    } catch (e) {
        await transaction.abortTransaction()
        throw e
    }
    return true
}

export async function RecordMarks(db: Db, accessingUserId: ObjectId, studentUserId: ObjectId, school: School, postId: ObjectId, marks: { [criterionId: string]: number }): Promise<boolean> {
    const post = await getCollection(db).findOne({ _id: postId })
    if (!post) {
        return false
    }
    if (!post.schoolId.equals(school._id)) {
        return false
    }
    if (!canViewPosts(accessingUserId, school, post.yearGroupId, post.courseId ?? undefined)) {
        return false
    }
    // Students can't mark assignments :(
    if (school.studentIds.some(id => id.equals(accessingUserId))) {
        return false
    }
    // But only students can receive marks
    if (!school.studentIds.some(id => id.equals(studentUserId))) {
        return false
    }
    if (post.type !== 'assignment') {
        return false
    }
    // First make sure the marks field exists
    await getCollection(db).updateOne({
        _id: postId,
        marks: null
    }, {
        $set: {
            marks: {}
        }
    })
    await getCollection(db).updateOne({
        _id: postId
    }, {
        $set: {
            [`marks.${studentUserId.toHexString()}`]: marks
        }
    })
    return true
}

export async function RecordFeedback(db: Db, accessingUserId: ObjectId, studentUserId: ObjectId, school: School, postId: ObjectId, feedback: string): Promise<boolean> {
    const post = await getCollection(db).findOne({ _id: postId })
    if (!post) {
        return false
    }
    if (!post.schoolId.equals(school._id)) {
        return false
    }
    if (!canViewPosts(accessingUserId, school, post.yearGroupId, post.courseId ?? undefined)) {
        return false
    }
    // Students can't give themselves feedback
    if (school.studentIds.some(id => id.equals(accessingUserId))) {
        return false
    }
    // But no feedback for teachers
    if (!school.studentIds.some(id => id.equals(studentUserId))) {
        return false
    }
    if (post.type !== 'assignment') {
        return false
    }
    // First make sure the feedback field exists
    await getCollection(db).updateOne({
        _id: postId,
        feedback: null
    }, {
        $set: {
            feedback: {}
        }
    })
    await getCollection(db).updateOne({
        _id: postId
    }, {
        $set: {
            [`feedback.${studentUserId.toHexString()}`]: feedback
        }
    })
    return true
}

export async function addComment(db: Db, userId: ObjectId, school: School, postId: ObjectId, comment: string): Promise<ObjectId | null> {
    const post = await getCollection(db).findOne({ _id: postId })
    if (!post) {
        return null
    }
    if (!post.schoolId.equals(school._id)) {
        return null
    }
    if (!canViewPosts(userId, school, post.yearGroupId, post.courseId ?? undefined)) {
        return null
    }
    const commentId = new ObjectId()
    // First make sure the comments field exists
    await getCollection(db).updateOne({
        _id: postId,
        comments: null
    }, {
        $set: {
            comments: []
        }
    })
    await getCollection(db).updateOne({
        _id: postId
    }, {
        $push: {
            comments: {
                id: commentId,
                userId,
                date: new Date(),
                content: comment
            }
        }
    })
    return commentId
}

export async function deleteComment(db: Db, userId: ObjectId, school: School, postId: ObjectId, commentId: ObjectId): Promise<boolean> {
    const post = await getCollection(db).findOne({ _id: postId })
    if (!post) {
        return false
    }
    if (!post.schoolId.equals(school._id)) {
        return false
    }
    if (!canViewPosts(userId, school, post.yearGroupId, post.courseId ?? undefined)) {
        return false
    }
    const comment = post.comments?.find(comment => comment.id.equals(commentId))
    if (!comment) {
        return false
    }
    if (!comment.userId.equals(userId)) {
        return false
    }
    await getCollection(db).updateOne({
        _id: postId
    }, {
        $pull: {
            comments: {
                id: commentId
            }
        }
    })
    return true
}

export async function updatePost(client: MongoClient, db: Db, userId: ObjectId, googleAccessToken: string, postId: ObjectId, newPostTemplate: PostTemplate, school: School, yearGroupId: ObjectId, courseId: ObjectId | null, classIds: ObjectId[] | null, linkedSyllabusContentIds: ObjectId[] | null, dueDate: Date | null): Promise<boolean | AttachmentPreparationError> {
    if (!canViewPosts(userId, school, yearGroupId, courseId ?? undefined)) {
        return false
    }
    // Start the transaction
    const transaction = client.startSession()
    try {
        await transaction.startTransaction()
        const post = await getRawPost(db, school, userId, postId, yearGroupId, courseId ?? undefined, classIds ?? undefined, transaction)
        if (!post) {
            await transaction.abortTransaction()
            return false
        }
        // First check: that the user has permission to edit the post
        // - Anyone can edit their own post
        // - Students cannot edit posts made by any other user
        // - Teachers and administrators cannot edit posts made by students, but can edit posts made by other teachers and administrators
        if (!post.posterId.equals(userId)) {
            // In this case, we need to check that the user is a teacher or administrator and that the post was made by a teacher or administrator
            const isTeacherOrAdministrator = school.teacherIds.some(teacherId => teacherId.equals(userId)) || school.administratorIds.some(adminId => adminId.equals(userId))
            const postIsTeacherOrAdministrator = school.teacherIds.some(teacherId => teacherId.equals(post.posterId)) || school.administratorIds.some(adminId => adminId.equals(post.posterId))
            if (!isTeacherOrAdministrator) {
                await transaction.abortTransaction()
                return false
            }
            if (!postIsTeacherOrAdministrator) {
                await transaction.abortTransaction()
                return false
            }
        }
        const newPost = { ...post }
        let filteredClassIds: ObjectId[] | null = null
        if (courseId && classIds) {
            const course = school.yearGroups.find(yg => yg.id.equals(yearGroupId))?.courses.find(c => c.id.equals(courseId))
            if (course) {
                filteredClassIds = filterClassList(userId, school, course, classIds)
            }
        }
        const newlyAddedAttachments = newPostTemplate.attachments.filter(attachment => !post.attachments.some(existingAttachment => existingAttachment.googleFileId === attachment.googleFileId))
        // Prepare each of these newly added attachments
        // It is critical that we only prepare *new* attachments, as old attachments may belong to other Google accounts
        if (newlyAddedAttachments.length !== 0) {
            const attachmentPreparationResult = await prepareAttachments(googleAccessToken, newlyAddedAttachments)
            if (attachmentPreparationResult !== true) {
                await transaction.abortTransaction()
                return attachmentPreparationResult
            }
        }
        // We have to do the same thing for submission templates
        const newlyAddedSubmissionTemplates: AttachmentTemplate[] | null = newPostTemplate.submissionTemplates?.filter(attachment => !post.submissionTemplates?.some(existingAttachment => existingAttachment.googleFileId === attachment.googleFileId)) ?? null
        if (newlyAddedSubmissionTemplates && newlyAddedSubmissionTemplates.length !== 0) {
            const submissionTemplatePreparationResult = await prepareAttachments(googleAccessToken, newlyAddedSubmissionTemplates)
            if (submissionTemplatePreparationResult !== true) {
                await transaction.abortTransaction()
                return submissionTemplatePreparationResult
            }
        }
        // Some of the marking criterion templates may have ids on them, so we need to check that these are all valid and remove them if not
        const newMarkingCriteria: MarkingCriterion[] | null = newPostTemplate.markingCriteria?.map(criterion => {
            if (criterion.id) {
                const existingCriterion = post.markingCriteria?.find(existingCriterion => existingCriterion.id.equals(criterion.id))
                if (existingCriterion) {
                    return {
                        id: existingCriterion.id,
                        title: criterion.title,
                        maximumMarks: criterion.maximumMarks
                    }
                }
            }
            return {
                id: new ObjectId(),
                title: criterion.title,
                maximumMarks: criterion.maximumMarks
            }
        }) ?? null
        // Attachments are interesting.
        // We know now that the Google Drive files are all shared with our service account, but we need to sort out a few issues.
        // - Existing individual copies of files must not be lost
        // - Cached attachment links should be kept for performance reasons
        // - The new attachments should be added to the post
        // The solution is as follows:
        // - If an attachment in the template has the same Google file id and permissions settings as an existing attachment, the existing document will be used with any modifications from the template
        // - If an attachment in the template has the same Google file id but different permissions settings, a new document will be created
        // - Otherwise a new document must be created anyway
        const attachments: Attachment[] = newPostTemplate.attachments.map(attachment => {
            const existingAttachment = post.attachments.find(candidateAttachment => {
                return candidateAttachment.googleFileId === attachment.googleFileId
                    && candidateAttachment.shareMode === attachment.shareMode
                    && candidateAttachment.othersCanEdit === attachment.othersCanEdit
            })
            if (existingAttachment) {
                return {
                    ...existingAttachment,
                    // We just need to change the title, thumbnail and mime type
                    title: attachment.title,
                    thumbnail: attachment.thumbnail,
                    mimeType: attachment.mimeType
                }
            } else {
                return {
                    ...attachment,
                    id: new ObjectId()
                }
            }
        })
        // We need to do the same thing for submission templates
        const submissionTemplates: Attachment[] | null = newPostTemplate.submissionTemplates?.map(attachment => {
            const existingAttachment = post.submissionTemplates?.find(candidateAttachment => {
                return candidateAttachment.googleFileId === attachment.googleFileId
                    // Technically we don't actually need any other conditions, since all submission templates are editable individual copies
                    // We keep the check here anyway for consistency
                    && candidateAttachment.shareMode === attachment.shareMode
                    && candidateAttachment.othersCanEdit === attachment.othersCanEdit
            })
            if (existingAttachment) {
                return existingAttachment
            } else {
                return {
                    ...attachment,
                    id: new ObjectId(),
                    perUserFileIds: {},
                    perUserLinks: {},
                    perUserUsersWithAccess: {}
                }
            }
        }) ?? null
        // Now we can update the post
        await getCollection(db).updateOne({
            _id: postId,
            schoolId: school._id
        }, {
            $set: {
                ...newPost,
                // Typescript catches where the template object differs from the database object, so this is fine if Typescript lets it happen
                ...newPostTemplate,
                schoolId: school._id,
                yearGroupId,
                courseId,
                classIds: filteredClassIds ?? classIds,
                linkedSyllabusContentIds,
                attachments,
                submissionTemplates,
                isoDueDate: dueDate,
                markingCriteria: newMarkingCriteria
            }
        }, { session: transaction })
        await transaction.commitTransaction()
        return true
    } catch (e) {
        await transaction.abortTransaction()
        throw e
    }
}
