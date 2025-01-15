import { Collection, Db, MongoClient, ObjectId } from "mongodb"
import { createPost, Post } from "./posts"
import { createUser } from "./user"
import { School } from "./schools"

function createSchoolStructure(schoolId: ObjectId, schoolStudentIds: ObjectId[], yearGroupId: ObjectId, courseId: ObjectId, classId: ObjectId, classStudentIds: ObjectId[]): School {
    return {
        _id: schoolId,
        name: 'School 1',
        yearGroups: [{
            id: yearGroupId,
            name: 'Year 1',
            courses: [{
                id: courseId,
                name: 'Course 1',
                classes: [{
                    id: classId,
                    name: 'Class 1',
                    teacherIds: [],
                    studentIds: classStudentIds,
                    requestingStudentIds: []
                }]
            }]
        }],
        administratorIds: [],
        teacherIds: [],
        studentIds: schoolStudentIds,
        invitedAdministratorEmails: [],
        invitedTeacherEmails: [],
        invitedStudentEmails: []
    }
}

describe("Posts", () => {
    const mongoClient: MongoClient = new MongoClient('mongodb://localhost:27017')
    let db: Db
    let postsCollection: Collection<Post>

    let user1: ObjectId
    let user2: ObjectId
    let user3: ObjectId

    const schoolId = new ObjectId()
    const yearGroupId = new ObjectId()
    const courseId = new ObjectId()
    const classId = new ObjectId()

    beforeAll(async () => {
        await mongoClient.connect()
        db = mongoClient.db('test')
        postsCollection = db.collection('posts')
        await postsCollection.drop()
    })
    afterAll(async () => {
        await mongoClient.close()
    })

    beforeEach(async () => {
        user1 = await createUser(db, { name: 'User 1', jwtUserId: 'abc123', email: 'user1', picture: '' })
        user2 = await createUser(db, { name: 'User 2', jwtUserId: 'bcd234', email: 'user2', picture: '' })
        user3 = await createUser(db, { name: 'User 3', jwtUserId: 'cde345', email: 'user3', picture: '' })
    })

    it("Should create a post", async () => {
        const school: School = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])

        const post: Post = {
            postDate: new Date(),
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: [classId],
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: []
        }

        const postId = await createPost(db, school, post)

        const postFromDatabase = await postsCollection.findOne({ _id: postId })
        expect(postFromDatabase).toEqual({ _id: postId, ...post })
    })
    it("Should filter the class list for students", async () => {
        const school: School = createSchoolStructure(schoolId, [user1], yearGroupId, courseId, classId, [user1])
        const post: Post = {
            postDate: new Date(),
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: [classId, new ObjectId()],
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: []
        }

        const postId = await createPost(db, school, post)
        const postFromDatabase = await postsCollection.findOne({ _id: postId })
        expect(postFromDatabase).toEqual({ _id: postId, ...post, classIds: [classId] })
    })
})
