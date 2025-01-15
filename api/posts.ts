import { Db, ObjectId } from "mongodb"
import { Course, School } from "./schools"
import { PostTemplate } from "../data/post"

export interface Post {
    _id?: ObjectId
    postDate: Date
    posterId: ObjectId
    schoolId: ObjectId
    yearGroupId: ObjectId
    courseId?: ObjectId
    classIds?: ObjectId[]
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

export function preparePostFromTemplate(postTemplate: PostTemplate, posterId: ObjectId, schoolId: ObjectId, yearGroupId: ObjectId, courseId: ObjectId, classIds: ObjectId[]): Post {
    return {
        postDate: new Date(),
        posterId,
        schoolId,
        yearGroupId,
        courseId,
        classIds,
        private: postTemplate.private,
        type: postTemplate.type,
        title: postTemplate.title,
        content: postTemplate.content,
        attachments: postTemplate.attachments.map(attachment => ({ id: new ObjectId(), ...attachment }))
    }
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
