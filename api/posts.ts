import { Db, Filter, MongoClient, ObjectId } from "mongodb"
import { Course, School } from "./schools"
import { MarkingCriterion, PostInfo, PostTemplate, PostType } from "../data/post"
import { ListPostsResponse } from "../data/api"
import { findUserInfos } from "./user"
import { AttachmentPreparationError, createCopy, getFileLink, prepareAttachments } from "./google-drive"
import { access } from "fs"

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
    attachments: Attachment[]

    // For assignments:
    isoDueDate: string | null
    submissionTemplates: Attachment[] | null // 'copied', othersCanEdit
    studentAttachments: { [studentId: string]: Attachment[] } | null // 'shared', !othersCanEdit
    isoSubmissionDates: { [studentId: string]: string } | null
    markingCriteria: MarkingCriterion[] | null
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
        isoDueDate: postTemplate.isoDueDate ?? null,
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
        markingCriteria: postTemplate.markingCriteria ?? null
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
    const posterIds = posts.map(post => post.posterId).filter(id => id !== undefined)
    const userInfos = await findUserInfos(db, posterIds)

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
            isoDueDate: post.isoDueDate ?? undefined,
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
            markingCriteria: post.markingCriteria ?? undefined
        }
    }).filter(post => post !== null)
}

function canViewPosts(userId: ObjectId, school: School, yearGroupId: ObjectId, courseId?: ObjectId) {
    const isStudent = school.studentIds.some(studentId => studentId.equals(userId))
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
    } else {
        // Teachers can view everything, but we should check that everything exists
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

export async function getPost(db: Db, school: School, userId: ObjectId, postId: ObjectId, yearGroupId: ObjectId, courseId?: ObjectId, classIds?: ObjectId[]): Promise<PostInfo | null> {
    // We use the same filter as listPosts, but with the post id added
    const filter = getFilterForPosts(school, userId, null, yearGroupId, courseId, classIds, undefined)
    if (!filter) {
        return null
    }
    filter._id = postId

    const isStudent = school.studentIds.some(student => student.equals(userId))

    const post = await getCollection(db).findOne(filter)
    if (!post) {
        return null
    }
    return (await convertPostsForApi(db, isStudent, userId, [post]))[0]
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
    const isoSubmissionDate = new Date().toISOString()
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
        for (const attachment of post.submissionTemplates ?? []) {
            const fileId = getPerUserFileId(attachment, userId)
            if (fileId) {
                const newFileId = await realCopyFile(fileId, attachment.title)
                if (!newFileId) {
                    await transaction.abortTransaction()
                    return false
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
        }
        // For each student attachment, we should copy the user's copy and replace the old file id and link
        for (const attachment of post.studentAttachments?.[userId.toHexString()] ?? []) {
            const fileId = attachment.googleFileId
            if (fileId) {
                const newFileId = await realCopyFile(fileId, attachment.title)
                if (!newFileId) {
                    await transaction.abortTransaction()
                    return false
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
                [`isoSubmissionDates.${userId.toHexString()}`]: isoSubmissionDate
            }
        }, { session: transaction })
        await transaction.commitTransaction()
    } catch (e) {
        await transaction.abortTransaction()
        throw e
    }
    return true
}
