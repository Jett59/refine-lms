import { Db, Filter, ObjectId } from "mongodb"
import { Course, School } from "./schools"
import { MarkingCriterion, PostInfo, PostTemplate, PostType } from "../data/post"
import { ListPostsResponse } from "../data/api"
import { findUserInfos } from "./user"
import { AttachmentPreparationError, getFileLink, prepareAttachments } from "./google-drive"
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

export async function convertPostsForApi(db: Db, currentUserId: ObjectId, posts: Post[]): Promise<PostInfo[]> {
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

    const collection = getCollection(db)
    const cursor = await collection.find(filter).sort({ postDate: -1 })
    const count = await collection.countDocuments(filter)
    const posts = await cursor.limit(limit).toArray()
    return {
        posts: await convertPostsForApi(db, userId, posts),
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
    const post = await getCollection(db).findOne(filter)
    if (!post) {
        return null
    }
    return (await convertPostsForApi(db, userId, [post]))[0]
}

type LinkAccessorType = (googleFileId: string, googleFileName: string, userEmail: string, userName: string, hasEditAccess: boolean, shouldCreateCopy: boolean) => Promise<{link: string, fileId: string} | null>
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
    const attachment = post.attachments.find(attachment => attachment.id.equals(attachmentId))
    if (!attachment) {
        return null
    }
    // The rules for edit access:
    // - If the accessing user is the same as the owning user:
    //   * If othersCanEdit, then the attachment is editable
    //   * If the user created the post, then it is editable
    // - If the accessing user is not the owning user, then they can't edit
    const hasEditAccess = owningUserId.equals(accessingUserId) && (attachment?.othersCanEdit || post.posterId.equals(accessingUserId))
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
            const {link, fileId} = linkAndId
            if (shouldCreateCopy) {
                await getCollection(db).updateOne({
                    _id: postId,
                    'attachments.id': attachmentId
                }, {
                    $set: {
                        [`attachments.$.perUserLinks.${owningUserId.toHexString()}`]: link,
                        [`attachments.$.perUserFileIds.${owningUserId.toHexString()}`]: fileId
                    },
                    $addToSet: {
                        [`attachments.$.perUserUsersWithAccess.${owningUserId.toHexString()}`]: accessingUserId
                    }
                })
            } else {
                await getCollection(db).updateOne({
                    _id: postId,
                    'attachments.id': attachmentId
                }, {
                    $set: {
                        'attachments.$.cachedLink': link
                    },
                    $addToSet: {
                        'attachments.$.usersWithAccess': accessingUserId
                    }
                })
            }
        }
        return linkAndId?.link ?? null
    } else {
        return null
    }
}
