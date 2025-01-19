import { Db, Filter, ObjectId } from "mongodb"
import { Course, School } from "./schools"
import { PostInfo, PostTemplate } from "../data/post"
import { ListPostsResponse } from "../data/api"
import { findUserInfos } from "./user"

export interface Post {
    _id?: ObjectId
    postDate: Date
    posterId: ObjectId
    schoolId: ObjectId
    yearGroupId: ObjectId
    courseId: ObjectId | null
    classIds: ObjectId[] | null
    private: boolean
    type: 'post' | 'material' | 'assignment'
    title: string
    content: string
    attachments: Attachment[]
}

export interface Attachment {
    id: ObjectId
    title: string
    link: string
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

export function preparePostFromTemplate(postTemplate: PostTemplate, posterId: ObjectId, schoolId: ObjectId, yearGroupId: ObjectId, courseId?: ObjectId, classIds?: ObjectId[]): Post {
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
        attachments: postTemplate.attachments.map(attachment => ({ id: new ObjectId(), ...attachment }))
    }
}

export async function convertPostsForApi(db: Db, posts: Post[]): Promise<PostInfo[]> {
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
                link: attachment.link
            })),
        }
    }).filter(post => post !== null)
}

export async function createPost(db: Db, school: School, post: Post) {
    const postCopy = { ...post }
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

    const classFilter: Filter<Post> = {$or: [
        { classIds: null },
        { classIds: { $size: 0 } },
        ...classIds ?[{ classIds: { $in: classIds } }] : [],
    ]}

    const collection = getCollection(db)
    const filter = {
        postDate: { $lt: beforeDate ?? new Date() },
        schoolId: school._id,
        yearGroupId,
        $and: [
        studentFilter,
        classFilter,
        ],
        ...courseId ? { courseId } : {},
    }

    const cursor = await collection.find(filter).sort({ postDate: -1 })
    const count = await collection.countDocuments(filter)
    const posts = await cursor.limit(limit).toArray()
    return {
        posts: await convertPostsForApi(db, posts),
        isEnd: count <= limit
    }
}
