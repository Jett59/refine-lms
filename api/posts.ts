import { Db, Filter, ObjectId } from "mongodb"
import { Course, School } from "./schools"
import { PostInfo, PostTemplate } from "../data/post"
import { ListPostsResponse } from "../data/api"
import { findUserInfos } from "./user"
import { AttachmentPreparationError, getFileLink, prepareAttachments } from "./google-drive"

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
        }))
    }
}

function getCachedAttachmentLinkIfAvailable(attachment: Attachment, userId: ObjectId) {
    if (attachment.usersWithAccess?.some(id => id.equals(userId)) && attachment.cachedLink) {
        return attachment.cachedLink
    }
    if (attachment.perUserLinks && attachment.perUserLinks[userId.toHexString()]) {
        return attachment.perUserLinks[userId.toHexString()]
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
                host: attachment.host,
                googleFileId: attachment.googleFileId,
                accessLink: getCachedAttachmentLinkIfAvailable(attachment, currentUserId) ?? undefined
            })),
        }
    }).filter(post => post !== null)
}

function canViewPosts(db: Db, userId: ObjectId, school: School, yearGroupId: ObjectId, courseId?: ObjectId) {
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
    if (!canViewPosts(db, post.posterId, school, post.yearGroupId, post.courseId ?? undefined)) {
        return null
    }
    if (post.courseId && post.classIds) {
        const course = school.yearGroups.find(yg => yg.id.equals(post.yearGroupId))?.courses.find(c => c.id.equals(post.courseId))
        if (course) {
            postCopy.classIds = filterClassList(post.posterId, school, course, post.classIds)
        }
    }
    const response = await getCollection(db).insertOne(postCopy)
    return response.insertedId
}

export async function listPosts(db: Db, school: School, userId: ObjectId, beforeDate: Date | null, limit: number, yearGroupId: ObjectId, courseId: ObjectId | undefined, classIds: ObjectId[] | undefined): Promise<ListPostsResponse> {
    if (!canViewPosts(db, userId, school, yearGroupId, courseId)) {
        return { posts: [], isEnd: true }
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

    const collection = getCollection(db)
    const filter = {
        postDate: { $lt: beforeDate ?? new Date() },
        schoolId: school._id,
        yearGroupId,
        $and: [
            studentFilter,
            classFilter,
        ],
        ...courseId ? { courseId } : { courseId: null },
    }

    const cursor = await collection.find(filter).sort({ postDate: -1 })
    const count = await collection.countDocuments(filter)
    const posts = await cursor.limit(limit).toArray()
    return {
        posts: await convertPostsForApi(db, userId, posts),
        isEnd: count <= limit
    }
}

type LinkAccessorType = (googleFileId: string, googleFileName: string, userEmail: string, userName: string, hasEditAccess: boolean, shouldCreateCopy: boolean) => Promise<{link: string, fileId: string} | null>
export async function getUsableAttachmentLink(db: Db, userId: ObjectId, userName: string, userEmail: string, school: School, postId: ObjectId, attachmentId: ObjectId, linkAccessor?: LinkAccessorType): Promise<string | null> {
    const post = await getCollection(db).findOne({ _id: postId })
    if (!post) {
        return null
    }
    if (!post.schoolId.equals(school._id)) {
        return null
    }
    if (!canViewPosts(db, userId, school, post.yearGroupId, post.courseId ?? undefined)) {
        return null
    }
    const attachment = post.attachments.find(attachment => attachment.id.equals(attachmentId))
    if (!attachment) {
        return null
    }
    const hasEditAccess = attachment?.othersCanEdit || post.posterId.equals(userId)
    const shouldCreateCopy = attachment.shareMode === 'copied'
    const cachedLink = getCachedAttachmentLinkIfAvailable(attachment, userId)
    if (cachedLink) {
        return cachedLink
    }
    if (attachment.host === 'google') {
        const realLinkAccessor = linkAccessor ?? getFileLink
        const linkAndId = await realLinkAccessor(attachment.googleFileId, attachment.title, userEmail, userName, hasEditAccess, shouldCreateCopy)
        if (linkAndId) {
            const {link, fileId} = linkAndId
            if (shouldCreateCopy) {
                await getCollection(db).updateOne({
                    _id: postId,
                    'attachments.id': attachmentId
                }, {
                    $set: {
                        [`attachments.$.perUserLinks.${userId.toHexString()}`]: link,
                        [`attachments.$.perUserFileIds.${userId.toHexString()}`]: fileId
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
                        'attachments.$.usersWithAccess': userId
                    }
                })
            }
        }
        return linkAndId?.link ?? null
    } else {
        return null
    }
}
