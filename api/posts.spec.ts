import { Collection, Db, MongoClient, ObjectId } from "mongodb"
import { createPost, getUsableAttachmentLink, listPosts, getPost, Post } from "./posts"
import { createUser } from "./user"
import { School } from "./schools"
import { PostInfo } from "../data/post"

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

    let schoolId: ObjectId
    let yearGroupId: ObjectId
    let courseId: ObjectId
    let classId: ObjectId

    beforeAll(async () => {
        await mongoClient.connect()
        db = mongoClient.db('refine-test')
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

        schoolId = new ObjectId()
        yearGroupId = new ObjectId()
        courseId = new ObjectId()
        classId = new ObjectId()
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
            attachments: [],
            markingCriteria: [{
                title: 'Criteria 1',
                maximumMarks: 10
            }]
        }

        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const postFromDatabase = await postsCollection.findOne({ _id: postId! })
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
            attachments: [],
            markingCriteria: null
        }

        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()
        const postFromDatabase = await postsCollection.findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({ _id: postId, ...post, classIds: [classId] })
    })
    it("Should list posts to a year group", async () => {
        const school: School = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date1 = new Date('2025-01-14T23:22:43.157Z')
        const date2 = new Date('2025-01-15T23:22:43.157Z')

        const post1: Post = {
            postDate: date1,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: null,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const post2: Post = {
            postDate: date2,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: null,
            classIds: null,
            private: false,
            type: 'post',
            title: 'World',
            content: 'World Hello',
            attachments: [],
            markingCriteria: null
        }
        const post1Id = await createPost(db, school, post1)
        const post2Id = await createPost(db, school, post2)
        expect(post1Id).not.toBeNull()
        expect(post2Id).not.toBeNull()

        const posts1 = await listPosts(db, school, user1, null, 1, yearGroupId, undefined, undefined, undefined)
        expect(posts1.posts).toEqual([{
            id: post2Id!.toHexString(),
            postDate: post2.postDate.toISOString(),
            poster: {
                id: user2.toHexString(),
                name: 'User 2',
                email: 'user2',
                picture: ''
            },
            schoolId: schoolId.toHexString(),
            yearGroupId: yearGroupId.toHexString(),
            courseId: undefined,
            classIds: undefined,
            private: false,
            type: 'post',
            title: 'World',
            content: 'World Hello',
            attachments: []
        } as PostInfo])
        expect(posts1.isEnd).toBe(false)

        const posts2 = await listPosts(db, school, user1, date2, 1, yearGroupId, undefined, undefined, undefined)
        expect(posts2.posts).toEqual([{
            id: post1Id!.toHexString(),
            postDate: post1.postDate.toISOString(),
            poster: {
                id: user1.toHexString(),
                name: 'User 1',
                email: 'user1',
                picture: ''
            },
            schoolId: schoolId.toHexString(),
            yearGroupId: yearGroupId.toHexString(),
            courseId: undefined,
            classIds: undefined,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: []
        } as PostInfo])
        expect(posts2.isEnd).toBe(true)

        const posts3 = await listPosts(db, school, user1, date1, 1, yearGroupId, undefined, undefined, undefined)
        expect(posts3.posts).toEqual([])
        expect(posts3.isEnd).toBe(true)
    })
    it("Should list posts to course pages", async () => {
        const school: School = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date1 = new Date('2025-01-14T23:22:43.157Z')
        const date2 = new Date('2025-01-15T23:22:43.157Z')

        const post1: Post = {
            postDate: date1,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const post2: Post = {
            postDate: date2,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'World',
            content: 'World Hello',
            attachments: [],
            markingCriteria: null
        }
        const post1Id = await createPost(db, school, post1)
        const post2Id = await createPost(db, school, post2)
        expect(post1Id).not.toBeNull()
        expect(post2Id).not.toBeNull

        const posts1 = await listPosts(db, school, user1, null, 1, yearGroupId, courseId, undefined, undefined)
        expect(posts1.posts).toEqual([{
            id: post2Id!.toHexString(),
            postDate: post2.postDate.toISOString(),
            poster: {
                id: user2.toHexString(),
                name: 'User 2',
                email: 'user2',
                picture: ''
            },
            schoolId: schoolId.toHexString(),
            yearGroupId: yearGroupId.toHexString(),
            courseId: courseId.toHexString(),
            classIds: undefined,
            private: false,
            type: 'post',
            title: 'World',
            content: 'World Hello',
            attachments: []
        } as PostInfo])
        expect(posts1.isEnd).toBe(false)

        const posts2 = await listPosts(db, school, user1, date2, 1, yearGroupId, courseId, undefined, undefined)
        expect(posts2.posts).toEqual([{
            id: post1Id!.toHexString(),
            postDate: post1.postDate.toISOString(),
            poster: {
                id: user1.toHexString(),
                name: 'User 1',
                email: 'user1',
                picture: ''
            },
            schoolId: schoolId.toHexString(),
            yearGroupId: yearGroupId.toHexString(),
            courseId: courseId.toHexString(),
            classIds: undefined,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: []
        } as PostInfo])
        expect(posts2.isEnd).toBe(true)
    })
    it("Should not show year group posts on the course page", async () => {
        const school: School = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: null,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)

        const posts = await listPosts(db, school, user1, null, 1, yearGroupId, courseId, undefined, undefined)
        expect(posts.posts).toEqual([])
        expect(posts.isEnd).toBe(true)
    })
    it("Should not show course posts on the year group page", async () => {
        const school: School = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)

        const posts = await listPosts(db, school, user1, null, 1, yearGroupId, undefined, undefined, undefined)
        expect(posts.posts).toEqual([])
        expect(posts.isEnd).toBe(true)
    })
    it("Should list posts to classes", async () => {
        const school: School = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [user1])
        const date1 = new Date('2025-01-14T23:22:43.157Z')
        const date2 = new Date('2025-01-15T23:22:43.157Z')

        const post1: Post = {
            postDate: date1,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: [classId],
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const post2: Post = {
            postDate: date2,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: [classId],
            private: false,
            type: 'post',
            title: 'World',
            content: 'World Hello',
            attachments: [],
            markingCriteria: null
        }
        const post1Id = await createPost(db, school, post1)
        const post2Id = await createPost(db, school, post2)
        expect(post1Id).not.toBeNull()
        expect(post2Id).not.toBeNull

        const posts1 = await listPosts(db, school, user1, null, 1, yearGroupId, courseId, [classId], undefined)
        expect(posts1.posts).toEqual([{
            id: post2Id!.toHexString(),
            postDate: post2.postDate.toISOString(),
            poster: {
                id: user2.toHexString(),
                name: 'User 2',
                email: 'user2',
                picture: ''
            },
            schoolId: schoolId.toHexString(),
            yearGroupId: yearGroupId.toHexString(),
            courseId: courseId.toHexString(),
            classIds: [classId.toHexString()],
            private: false,
            type: 'post',
            title: 'World',
            content: 'World Hello',
            attachments: []
        } as PostInfo])
        expect(posts1.isEnd).toBe(false)

        const posts2 = await listPosts(db, school, user1, date2, 1, yearGroupId, courseId, [classId], undefined)
        expect(posts2.posts).toEqual([{
            id: post1Id!.toHexString(),
            postDate: post1.postDate.toISOString(),
            poster: {
                id: user1.toHexString(),
                name: 'User 1',
                email: 'user1',
                picture: ''
            },
            schoolId: schoolId.toHexString(),
            yearGroupId: yearGroupId.toHexString(),
            courseId: courseId.toHexString(),
            classIds: [classId.toHexString()],
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: []
        } as PostInfo])
        expect(posts2.isEnd).toBe(true)
    })
    it("Should show course posts on class lists", async () => {
        const school: School = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const posts = await listPosts(db, school, user1, null, 1, yearGroupId, courseId, [classId], undefined)
        expect(posts.posts).toEqual([{
            id: postId!.toHexString(),
            postDate: post.postDate.toISOString(),
            poster: {
                id: user1.toHexString(),
                name: 'User 1',
                email: 'user1',
                picture: ''
            },
            schoolId: schoolId.toHexString(),
            yearGroupId: yearGroupId.toHexString(),
            courseId: courseId.toHexString(),
            classIds: undefined,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: []
        } as PostInfo])
        expect(posts.isEnd).toBe(true)
    })
    it("Should not show class posts on the course page", async () => {
        const school: School = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId,
            classIds: [classId],
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)

        const posts = await listPosts(db, school, user1, null, 1, yearGroupId, courseId, undefined, undefined)
        expect(posts.posts).toEqual([])
        expect(posts.isEnd).toBe(true)
    })
    it("Should not show studens private posts from others", async () => {
        const school = createSchoolStructure(schoolId, [user1, user2], yearGroupId, courseId, classId, [user1, user2])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: [classId],
            private: true,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)

        const posts1 = await listPosts(db, school, user1, null, 1, yearGroupId, courseId, [classId], undefined)
        expect(posts1.posts.length).toBe(1)

        const posts2 = await listPosts(db, school, user2, null, 1, yearGroupId, courseId, [classId], undefined)
        expect(posts2.posts.length).toBe(0)
    })
    it("Should let non-students view private posts", async () => {
        const school = createSchoolStructure(schoolId, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: [classId],
            private: true,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)

        const posts = await listPosts(db, school, user2, null, 1, yearGroupId, courseId, [classId], undefined)
        expect(posts.posts.length).toBe(1)
    })
    it("Should not create posts for non-existent year groups", async () => {
        const school = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: new ObjectId(),
            courseId: null,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).toBeNull()
    })
    it("Should not create posts for non-existent courses", async () => {
        const school = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: new ObjectId(),
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).toBeNull()
    })
    it("Should not let students post to year groups which they are not members of", async () => {
        const school = createSchoolStructure(schoolId, [user1], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: null,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).toBeNull()
    })
    it("Should not let students post to courses which they are not members of", async () => {
        let school = createSchoolStructure(schoolId, [user1], yearGroupId, courseId, classId, [])
        // We have to create another course to avoid hitting the year group branch
        const courseId2 = new ObjectId()
        school.yearGroups[0].courses.push({
            id: courseId2,
            name: 'Course 2',
            classes: [{
                id: new ObjectId(),
                name: 'Class 1',
                teacherIds: [],
                studentIds: [user1],
                requestingStudentIds: []
            }]
        })

        const date = new Date('2025-01-14T23:22:43.157Z')
        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }

        let postId = await createPost(db, school, post)
        expect(postId).toBeNull()
    })
    it("Should return an empty list for non-existant year groups", async () => {
        const school = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const posts = await listPosts(db, school, user1, null, 1, new ObjectId(), undefined, undefined, undefined)
        expect(posts.posts).toEqual([])
        expect(posts.isEnd).toBe(true)
    })
    it("Should get attachment links (minus the google drive part)", async () => {
        const school = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [{
                id: attachmentId,
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456'
            }],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        let googleFileId
        let userEmail
        let userName
        let hasEditAccess
        let shouldCreateCopy
        const link = await getUsableAttachmentLink(db, user1, 'user1', user1, 'email', school, postId!, attachmentId, async (fileId, fileName, email, name, canEdit, createCopy) => {
            googleFileId = fileId
            userEmail = email
            userName = name
            hasEditAccess = canEdit
            shouldCreateCopy = createCopy

            return { link: 'https://example.com', fileId: '123456' }
        })
        expect(link).toBe('https://example.com')
        expect(googleFileId).toBe('123456')
        expect(userEmail).toBe('email')
        expect(userName).toBe('user1')
        expect(hasEditAccess).toBe(true)
        expect(shouldCreateCopy).toBe(false)
    })
    it("Should cache links", async () => {
        const school = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [{
                id: attachmentId,
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456'
            }],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)

        let called = false
        const link = await getUsableAttachmentLink(db, user1, 'user1', user1, 'email', school, postId!, attachmentId, async () => {
            called = true
            return { link: 'https://example.com', fileId: '' }
        })
        expect(link).toBe('https://example.com')
        expect(called).toBeTruthy()

        called = false
        const link2 = await getUsableAttachmentLink(db, user1, 'user1', user1, 'email', school, postId!, attachmentId, async () => {
            called = true
            return { link: 'https://example.com', fileId: '' }
        })
        expect(link2).toBe('https://example.com')
        expect(called).toBeFalsy()
    })
    it("Should cache per-user links", async () => {
        const school = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [{
                id: attachmentId,
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                shareMode: 'copied',
                host: 'google',
                googleFileId: '123456'
            }],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)

        let called = false
        let shouldCreateCopy = false
        const link = await getUsableAttachmentLink(db, user1, 'user1', user1, 'email', school, postId!, attachmentId, async (_id, _fileName, _email, _userName, _hasEditAccess, createCopy) => {
            called = true
            shouldCreateCopy = createCopy
            return { link: 'https://example.com/1', fileId: '' }
        })
        expect(link).toBe('https://example.com/1')
        expect(called).toBeTruthy()

        called = false
        const link2 = await getUsableAttachmentLink(db, user1, 'user1', user1, 'email', school, postId!, attachmentId, async () => {
            called = true
            return { link: 'https://example.com/1', fileId: '' }
        })
        expect(link2).toBe('https://example.com/1')
        expect(called).toBeFalsy()

        called = false
        const link3 = await getUsableAttachmentLink(db, user2, 'user2', user2, 'email', school, postId!, attachmentId, async () => {
            called = true
            return { link: 'https://example.com/2', fileId: '' }
        })
        expect(link3).toBe('https://example.com/2')
        expect(called).toBeTruthy()

        called = false
        const link4 = await getUsableAttachmentLink(db, user2, 'user2', user2, 'email', school, postId!, attachmentId, async () => {
            called = true
            return { link: 'https://example.com/2', fileId: '' }
        })
        expect(link4).toBe('https://example.com/2')
        expect(called).toBeFalsy()
    })
    it("Should filter based on post type", async () => {
        const school: School = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date1 = new Date('2025-01-14T23:22:43.157Z')
        const date2 = new Date('2025-01-15T23:22:43.157Z')

        const post1: Post = {
            postDate: date1,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'assignment',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const post2: Post = {
            postDate: date2,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'World',
            content: 'World Hello',
            attachments: [],
            markingCriteria: null
        }
        const post1Id = await createPost(db, school, post1)
        const post2Id = await createPost(db, school, post2)
        expect(post1Id).not.toBeNull()
        expect(post2Id).not.toBeNull

        const posts1 = await listPosts(db, school, user1, null, 1, yearGroupId, courseId, undefined, ['assignment'])
        expect(posts1.posts).toEqual([{
            id: post1Id!.toHexString(),
            postDate: post1.postDate.toISOString(),
            poster: {
                id: user1.toHexString(),
                name: 'User 1',
                email: 'user1',
                picture: ''
            },
            schoolId: schoolId.toHexString(),
            yearGroupId: yearGroupId.toHexString(),
            courseId: courseId.toHexString(),
            classIds: undefined,
            private: false,
            type: 'assignment',
            title: 'Hello',
            content: 'Hello World',
            attachments: []
        } as PostInfo])
        expect(posts1.isEnd).toBe(true)
    })
    it("Should not let students create assignments", async () => {
        const school = createSchoolStructure(schoolId, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-03-02T04:21:17.490Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: [classId],
            private: false,
            type: 'assignment',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).toBeNull()
    })
    it("Should get an individual post by id", async () => {
        const school = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-03-03T06:00:51.510Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const postFromDatabase = await getPost(db, school, user1, postId!, yearGroupId, courseId)
        expect(postFromDatabase).toEqual({
            id: postId!.toHexString(),
            postDate: post.postDate.toISOString(),
            poster: {
                id: user1.toHexString(),
                name: 'User 1',
                email: 'user1',
                picture: ''
            },
            schoolId: schoolId.toHexString(),
            yearGroupId: yearGroupId.toHexString(),
            courseId: courseId.toHexString(),
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: []
        } as PostInfo)
    })
    it("Should re-share per-user files for different accessors", async () => {
        const school = createSchoolStructure(schoolId, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [{
                id: attachmentId,
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456',
                shareMode: 'copied'
            }],
            markingCriteria: null
        }
        const postId = await createPost(db, school, post)

        let called = false
        let emailForCall = ''
        const link = await getUsableAttachmentLink(db, user1, 'user1', user1, 'email', school, postId!, attachmentId, async (googleFileId, googleFileName, userEmail, userName, hasEditAccess, shouldCreateCopy) => {
            called = true
            emailForCall = userEmail
            return { link: 'https://example.com', fileId: '' }
        })
        expect(link).toBe('https://example.com')
        expect(called).toBeTruthy()
        expect(emailForCall).toBe('email')

        called = false
        emailForCall = ''
        const link2 = await getUsableAttachmentLink(db, user1, 'user1', user2, 'gmail', school, postId!, attachmentId, async (googleFileId, googleFileName, userEmail, userName, hasEditAccess, shouldCreateCopy) => {
            called = true
            emailForCall = userEmail
            return { link: 'https://example.com/blah', fileId: '' }
        })
        expect(link2).toBe('https://example.com/blah')
        expect(called).toBeTruthy()
        expect(emailForCall).toBe('gmail')

        called = false
        const link3 = await getUsableAttachmentLink(db, user1, 'user1', user2, 'email', school, postId!, attachmentId, async () => {
            called = true
            return { link: 'https://example.com/blah/bleh', fileId: '' }
        })
        expect(link2).toBe('https://example.com/blah')
        expect(called).toBeFalsy()
    })
})
