import { Collection, Db, MongoClient, ObjectId } from "mongodb"
import { createPost, getUsableAttachmentLink, listPosts, getPost, Post, Attachment, AddAttachmentToSubmission, submitAssignment, RecordMarks, RecordFeedback, addComment, deleteComment, convertPostsForApi } from "./posts"
import { createUser } from "./user"
import { School } from "./schools"
import { PostInfo } from "../data/post"

function createSchoolStructure(schoolId: ObjectId, schoolMemberIds: ObjectId[], schoolStudentIds: ObjectId[], yearGroupId: ObjectId, courseId: ObjectId, classId: ObjectId, classStudentIds: ObjectId[]): School {
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
                }],
                syllabusContent: [],
                syllabusOutcomes: []
            }]
        }],
        administratorIds: schoolMemberIds.filter(id => !schoolStudentIds.some(otherId => otherId.equals(id))),
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
    let schoolMemberIds: ObjectId[]

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
        schoolMemberIds = [user1, user2, user3]

        schoolId = new ObjectId()
        yearGroupId = new ObjectId()
        courseId = new ObjectId()
        classId = new ObjectId()
    })

    it("Should create a post", async () => {
        const school: School = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])

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
                id: new ObjectId(),
                title: 'Criteria 1',
                maximumMarks: 10
            }],
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }

        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const postFromDatabase = await postsCollection.findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({ _id: postId, ...post })
    })
    it("Should filter the class list for students", async () => {
        const school: School = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }

        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()
        const postFromDatabase = await postsCollection.findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({ _id: postId, ...post, classIds: [classId] })
    })
    it("Should list posts to a year group", async () => {
        const school: School = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: []
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
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: []
        } as PostInfo])
        expect(posts2.isEnd).toBe(true)

        const posts3 = await listPosts(db, school, user1, date1, 1, yearGroupId, undefined, undefined, undefined)
        expect(posts3.posts).toEqual([])
        expect(posts3.isEnd).toBe(true)
    })
    it("Should list posts to course pages", async () => {
        const school: School = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: []
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
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: []
        } as PostInfo])
        expect(posts2.isEnd).toBe(true)
    })
    it("Should not show year group posts on the course page", async () => {
        const school: School = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

        const posts = await listPosts(db, school, user1, null, 1, yearGroupId, courseId, undefined, undefined)
        expect(posts.posts).toEqual([])
        expect(posts.isEnd).toBe(true)
    })
    it("Should not show course posts on the year group page", async () => {
        const school: School = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

        const posts = await listPosts(db, school, user1, null, 1, yearGroupId, undefined, undefined, undefined)
        expect(posts.posts).toEqual([])
        expect(posts.isEnd).toBe(true)
    })
    it("Should list posts to classes", async () => {
        const school: School = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [user1])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: []
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
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: []
        } as PostInfo])
        expect(posts2.isEnd).toBe(true)
    })
    it("Should show course posts on class lists", async () => {
        const school: School = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [user1])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: []
        } as PostInfo])
        expect(posts.isEnd).toBe(true)
    })
    it("Should not show class posts on the course page", async () => {
        const school: School = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [user1])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

        const posts = await listPosts(db, school, user1, null, 1, yearGroupId, courseId, undefined, undefined)
        expect(posts.posts).toEqual([])
        expect(posts.isEnd).toBe(true)
    })
    it("Should not show studens private posts from others", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1, user2], yearGroupId, courseId, classId, [user1, user2])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

        const posts1 = await listPosts(db, school, user1, null, 1, yearGroupId, courseId, [classId], undefined)
        expect(posts1.posts.length).toBe(1)

        const posts2 = await listPosts(db, school, user2, null, 1, yearGroupId, courseId, [classId], undefined)
        expect(posts2.posts.length).toBe(0)
    })
    it("Should let non-students view private posts", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

        const posts = await listPosts(db, school, user2, null, 1, yearGroupId, courseId, [classId], undefined)
        expect(posts.posts.length).toBe(1)
    })
    it("Should not create posts for non-existent year groups", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).toBeNull()
    })
    it("Should not create posts for non-existent courses", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).toBeNull()
    })
    it("Should not let students post to year groups which they are not members of", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).toBeNull()
    })
    it("Should not let students post to courses which they are not members of", async () => {
        let school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [])
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
            }],
            syllabusContent: [],
            syllabusOutcomes: []
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }

        let postId = await createPost(db, school, post)
        expect(postId).toBeNull()
    })
    it("Should return an empty list for non-existent year groups", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
        const posts = await listPosts(db, school, user1, null, 1, new ObjectId(), undefined, undefined, undefined)
        expect(posts.posts).toEqual([])
        expect(posts.isEnd).toBe(true)
    })
    it("Should get attachment links (minus the google drive part)", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
        const school: School = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: []
        } as PostInfo])
        expect(posts1.isEnd).toBe(true)
    })
    it("Should not let students create assignments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).toBeNull()
    })
    it("Should get an individual post by id", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: [],
        } as PostInfo)
    })
    it("Should re-share per-user files for different accessors", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
    it("Should not let non-owners edit individual copies", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

        let called = false
        let editable = false
        const link = await getUsableAttachmentLink(db, user2, 'user2', user2, 'email', school, postId!, attachmentId, async (_id, _fileName, _email, _userName, hasEditAccess, _createCopy) => {
            called = true
            editable = hasEditAccess
            return { link: 'https://example.com', fileId: '' }
        })
        expect(link).toBe('https://example.com')
        expect(called).toBeTruthy()
        expect(editable).toBeTruthy()

        called = false
        editable = false
        const link2 = await getUsableAttachmentLink(db, user2, 'user2', user1, 'email', school, postId!, attachmentId, async (_id, _fileName, _email, _userName, hasEditAccess, _createCopy) => {
            called = true
            editable = hasEditAccess
            return { link: 'https://example.com', fileId: '' }
        })
        expect(link2).toBe('https://example.com')
        expect(called).toBeTruthy()
        expect(editable).toBeFalsy()
    })
    it("Should not let students get posts from classes which they cannot access", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user2], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: true,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

        const postFromDatabase = await getPost(db, school, user2, postId!, yearGroupId, courseId)
        expect(postFromDatabase).toBeNull()
    })
    it("Should not let students get private posts which they did not create", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1, user2], yearGroupId, courseId, classId, [user1, user2])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user1,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: true,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

        const postFromDatabase = await getPost(db, school, user2, postId!, yearGroupId, courseId)
        expect(postFromDatabase).toBeNull()
    })
    it("Should find submission templates as attachments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            attachments: [],
            markingCriteria: null,
            submissionTemplates: [{
                id: attachmentId,
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456'
            }],
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
    it("Should find attachment in student submissions", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            attachments: [],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: {
                [user1.toHexString()]: [{
                    id: attachmentId,
                    title: 'Attachment 1',
                    mimeType: 'text/plain',
                    thumbnail: '',
                    host: 'google',
                    googleFileId: '123456'
                }]
            },
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
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
    it("Should not create a new copy for non-owners accessing existing per-user files", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

        // First call as the original user to create the copy
        let called = false
        let shouldCreateCopy = false
        const link = await getUsableAttachmentLink(db, user1, 'user1', user1, 'email', school, postId!, attachmentId, async (_id, _fileName, _email, _userName, _hasEditAccess, createCopy) => {
            called = true
            shouldCreateCopy = createCopy
            return { link: 'https://example.com', fileId: '123' }
        }
        )
        expect(link).toBe('https://example.com')
        expect(called).toBeTruthy()
        expect(shouldCreateCopy).toBeTruthy()

        // Second call as a different user to access the copy (should not create a new copy)
        called = false
        shouldCreateCopy = false
        const link2 = await getUsableAttachmentLink(db, user1, 'user1', user2, 'email', school, postId!, attachmentId, async (_id, _fileName, _email, _userName, _hasEditAccess, createCopy) => {
            called = true
            shouldCreateCopy = createCopy
            return { link: 'https://example.com', fileId: '123' }
        }
        )
        expect(link2).toBe('https://example.com')
        expect(called).toBeTruthy()
        expect(shouldCreateCopy).toBeFalsy()

        // Then it should create a new copy for user2 as owner
        called = false
        shouldCreateCopy = false
        const link3 = await getUsableAttachmentLink(db, user2, 'user2', user2, 'email', school, postId!, attachmentId, async (_id, _fileName, _email, _userName, _hasEditAccess, createCopy) => {
            called = true
            shouldCreateCopy = createCopy
            return { link: 'https://example.com', fileId: '123' }
        }
        )
        expect(link3).toBe('https://example.com')
        expect(called).toBeTruthy()
        expect(shouldCreateCopy).toBeTruthy()
    })
    it("Should get a post with attachments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

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
            classIds: undefined,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            linkedSyllabusContentIds: [],
            attachments: [{
                id: attachmentId.toHexString(),
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456',
                shareMode: 'copied',
                othersCanEdit: false,
                accessLink: undefined
            }],
            comments: [],
            submissionTemplates: undefined,
            studentAttachments: undefined,
        })
    })
    it("Should get posts with submission templates", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            attachments: [],
            markingCriteria: null,
            submissionTemplates: [{
                id: attachmentId,
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456'
            }],
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

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
            classIds: undefined,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            linkedSyllabusContentIds: [],
            attachments: [],
            markingCriteria: undefined,
            submissionTemplates: [{
                id: attachmentId.toHexString(),
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456',
                shareMode: 'copied',
                othersCanEdit: true,
                accessLink: undefined
            }],
            comments: [],
            studentAttachments: undefined,
        })
    })
    it("Should get posts with student attachments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
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
            attachments: [],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: {
                [user1.toHexString()]: [{
                    id: attachmentId,
                    title: 'Attachment 1',
                    mimeType: 'text/plain',
                    thumbnail: '',
                    host: 'google',
                    googleFileId: '123456'
                }]
            },
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

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
            classIds: undefined,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: [],
            markingCriteria: undefined,
            submissionTemplates: undefined,
            studentAttachments: {
                [user1.toHexString()]: [{
                    id: attachmentId.toHexString(),
                    title: 'Attachment 1',
                    mimeType: 'text/plain',
                    thumbnail: '',
                    host: 'google',
                    googleFileId: '123456',
                    shareMode: 'shared',
                    othersCanEdit: false,
                    accessLink: undefined
                }]
            },
        })
    })
    it("Should not let students see each other's student attachments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1, user2], yearGroupId, courseId, classId, [user1, user2])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: {
                [user1.toHexString()]: [{
                    id: attachmentId,
                    title: 'Attachment 1',
                    mimeType: 'text/plain',
                    thumbnail: '',
                    host: 'google',
                    googleFileId: '123456'
                }]
            },
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)

        const postFromDatabase = await getPost(db, school, user2, postId!, yearGroupId, courseId)
        expect(postFromDatabase).toEqual({
            id: postId!.toHexString(),
            postDate: post.postDate.toISOString(),
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
            title: 'Hello',
            content: 'Hello World',
            linkedSyllabusContentIds: [],
            attachments: [],
            comments: [],
            markingCriteria: undefined,
            submissionTemplates: undefined,
            studentAttachments: undefined,
        })
    })
    it("Should let students add attachments to their submissions", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1, user2], yearGroupId, courseId, classId, [user1, user2])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const attachment: Attachment = {
            id: new ObjectId(),
            title: 'Title',
            thumbnail: '',
            mimeType: 'text/plain',
            shareMode: 'shared',
            othersCanEdit: false,
            host: 'google',
            googleFileId: '123'
        }

        const result = await AddAttachmentToSubmission(db, user1, school, postId!, attachment)
        expect(result).toBe(attachment.id)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            studentAttachments: {
                [user1.toHexString()]: [attachment]
            }
        })
    })
    it("Should let students have edit access to their own attachments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1, user2], yearGroupId, courseId, classId, [user1, user2])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: {
                [user1.toHexString()]: [{
                    id: attachmentId,
                    title: 'Attachment 1',
                    mimeType: 'text/plain',
                    thumbnail: '',
                    host: 'google',
                    googleFileId: '123456'
                }]
            },
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        let called = false
        let shouldHaveEditAccess = false
        const link = await getUsableAttachmentLink(db, user1, 'user1', user1, 'email', school, postId!, attachmentId, async (_id, _fileName, _email, _userName, hasEditAccess, _createCopy) => {
            called = true
            shouldHaveEditAccess = hasEditAccess
            return { link: 'https://example.com', fileId: '' }
        })
        expect(link).toBe('https://example.com')
        expect(called).toBeTruthy()
        expect(shouldHaveEditAccess).toBe(true)

        called = false
        shouldHaveEditAccess = false
        const link2 = await getUsableAttachmentLink(db, user1, 'user1', user2, 'email', school, postId!, attachmentId, async (_id, _fileName, _email, _userName, hasEditAccess, _createCopy) => {
            called = true
            shouldHaveEditAccess = hasEditAccess
            return { link: 'https://example.com/bleh', fileId: '' }
        })
        expect(link2).toBe('https://example.com/bleh')
        expect(called).toBeTruthy()
        expect(shouldHaveEditAccess).toBe(false)
    })
    it("Should not return the link for an attachment with the wrong school id", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1, user2], yearGroupId, courseId, classId, [user1, user2])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: new ObjectId(),
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
                shareMode: 'shared'
            }],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        let called = false
        const link = await getUsableAttachmentLink(db, user2, 'user2', user1, 'email', school, postId!, attachmentId, async () => {
            called = true
            return { link: 'https://example.com', fileId: '' }
        })
        expect(link).toBeNull()
        expect(called).toBeFalsy()
    })
    it("Should not let students get attachment links from courses to which they do not have access", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1, user2], yearGroupId, courseId, classId, [user2])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
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
                shareMode: 'shared'
            }],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        let called = false
        const link = await getUsableAttachmentLink(db, user1, 'user1', user1, 'email', school, postId!, attachmentId, async () => {
            called = true
            return { link: 'https://example.com', fileId: '' }
        })
        expect(link).toBeNull()
        expect(called).toBeFalsy()
    })
    it("Should not let users edit submitted assignments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: {
                [user1.toHexString()]: [{
                    id: attachmentId,
                    title: 'Attachment 1',
                    mimeType: 'text/plain',
                    thumbnail: '',
                    host: 'google',
                    googleFileId: '123456'
                }]
            },
            isoDueDate: null,
            isoSubmissionDates: {
                [user1.toHexString()]: date
            },
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        let called = false
        let shouldHaveEditAccess = false
        const link = await getUsableAttachmentLink(db, user1, 'user1', user1, 'email', school, postId!, attachmentId, async (_id, _fileName, _email, _userName, hasEditAccess, _createCopy) => {
            called = true
            shouldHaveEditAccess = hasEditAccess
            return { link: 'https://example.com', fileId: '' }
        })
        expect(link).toBe('https://example.com')
        expect(called).toBeTruthy()
        expect(shouldHaveEditAccess).toBe(false)
    })
    it("Should change the google file ids for submission templates and student attachments when submitting", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId1 = new ObjectId()
        const attachmentId2 = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'assignment',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null,
            submissionTemplates: [{
                id: attachmentId1,
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456',
                perUserFileIds: {
                    [user1.toHexString()]: '234561'
                }
            }],
            studentAttachments: {
                [user1.toHexString()]: [{
                    id: attachmentId2,
                    title: 'Attachment 1',
                    mimeType: 'text/plain',
                    thumbnail: '',
                    host: 'google',
                    googleFileId: '654321'
                }]
            },
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        let calledCount = 0
        const result = await submitAssignment(mongoClient, db, user1, school, postId!, async (oldFileId, _newFileName) => {
            calledCount++
            return { fileId: oldFileId + 'new' }
        })
        expect(result).toBe(true)
        expect(calledCount).toBe(2)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            studentAttachments: {
                [user1.toHexString()]: [{
                    id: attachmentId2,
                    title: 'Attachment 1',
                    mimeType: 'text/plain',
                    thumbnail: '',
                    host: 'google',
                    googleFileId: '654321new',
                    usersWithAccess: []
                }]
            },
            submissionTemplates: [{
                id: attachmentId1,
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456',
                perUserFileIds: {
                    [user1.toHexString()]: '234561new'
                },
                perUserUsersWithAccess: {
                    [user1.toHexString()]: []
                }
            }],
            isoSubmissionDates: {
                [user1.toHexString()]: expect.any(Date)
            }
        })
    })
    it("Should not change file ids if the student hasn't created a copy already", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'assignment',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null,
            submissionTemplates: [{
                id: attachmentId,
                title: 'Attachment',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456',
                perUserFileIds: {
                    [user2.toHexString()]: '234561'
                }
            }],
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        let calledCount = 0
        const result = await submitAssignment(mongoClient, db, user1, school, postId!, async (_oldFileId, _newFileName) => {
            calledCount++
            return { fileId: 'new' }
        }
        )
        expect(result).toBe(true)
        expect(calledCount).toBe(0)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            isoSubmissionDates: {
                [user1.toHexString()]: expect.any(Date)
            },
        })
    })
    it("Should revert any changes if a file copy fails", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId1 = new ObjectId()
        const attachmentId2 = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'assignment',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null,
            submissionTemplates: [{
                id: attachmentId1,
                title: 'Attachment 1',
                mimeType: 'text/plain',
                thumbnail: '',
                host: 'google',
                googleFileId: '123456',
                perUserFileIds: {
                    [user1.toHexString()]: '234561'
                }
            }],
            studentAttachments: {
                [user1.toHexString()]: [{
                    id: attachmentId2,
                    title: 'Attachment 1',
                    mimeType: 'text/plain',
                    thumbnail: '',
                    host: 'google',
                    googleFileId: '654321'
                }]
            },
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        let calledCount = 0
        const result = await submitAssignment(mongoClient, db, user1, school, postId!, async (_oldFileId, _newFileName) => {
            calledCount++
            if (calledCount === 2) {
                return null
            }
            return { fileId: 'new' }
        })
        expect(result).toBe(false)
        expect(calledCount).toBe(2)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId
        })
    })
    it("Should not submit a non-existent assignment", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const result = await submitAssignment(mongoClient, db, user1, school, new ObjectId())
        expect(result).toBe(false)
    })
    it("Should record marks against a student's assignment", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user2], yearGroupId, courseId, classId, [user2])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()
        const criterion1Id = new ObjectId()
        const criterion2Id = new ObjectId()

        const post: Post = {
            postDate: date,
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
            markingCriteria: [{
                id: criterion1Id,
                title: 'Marking Criterion 1',
                maximumMarks: 10
            }, {
                id: criterion2Id,
                title: 'Marking Criterion 2',
                maximumMarks: 20
            }],
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const result = await RecordMarks(db, user1, user2, school, postId!, {
            [criterion1Id.toHexString()]: 2,
            [criterion2Id.toHexString()]: 3
        })
        expect(result).toBe(true)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            marks: {
                [user2.toHexString()]: {
                    [criterion1Id.toHexString()]: 2,
                    [criterion2Id.toHexString()]: 3
                }
            }
        })
    })
    it("Should not let students record marks", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()
        const criterion1Id = new ObjectId()
        const criterion2Id = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'assignment',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: [{
                id: criterion1Id,
                title: 'Marking Criterion 1',
                maximumMarks: 10
            }, {
                id: criterion2Id,
                title: 'Marking Criterion 2',
                maximumMarks: 20
            }],
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const result = await RecordMarks(db, user1, user2, school, postId!, {
            [criterion1Id.toHexString()]: 2,
            [criterion2Id.toHexString()]: 3
        })
        expect(result).toBe(false)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId
        })
    })
    it("Should not record marks against teachers", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()
        const criterion1Id = new ObjectId()
        const criterion2Id = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'assignment',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: [{
                id: criterion1Id,
                title: 'Marking Criterion 1',
                maximumMarks: 10
            }, {
                id: criterion2Id,
                title: 'Marking Criterion 2',
                maximumMarks: 20
            }],
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const result = await RecordMarks(db, user1, user2, school, postId!, {
            [criterion1Id.toHexString()]: 2,
            [criterion2Id.toHexString()]: 3
        })
        expect(result).toBe(false)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId
        })
    })
    it("Should not mark a non-assignment", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user2], yearGroupId, courseId, classId, [user2])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const criterion1Id = new ObjectId()
        const criterion2Id = new ObjectId()

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'post',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: [{
                id: criterion1Id,
                title: 'Marking Criterion 1',
                maximumMarks: 10
            }, {
                id: criterion2Id,
                title: 'Marking Criterion 2',
                maximumMarks: 20
            }],
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const result = await RecordMarks(db, user1, user2, school, postId!, {
            [criterion1Id.toHexString()]: 2,
            [criterion2Id.toHexString()]: 3
        })
        expect(result).toBe(false)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId
        })
    })
    it("Should not mark a non-existent post", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user2], yearGroupId, courseId, classId, [user2])
        const result = await RecordMarks(db, user1, user2, school, new ObjectId(), {})
        expect(result).toBe(false)
    })
    it("Should only let students see their own marks", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user2, user3], yearGroupId, courseId, classId, [user2, user3])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const criterion1Id = new ObjectId()
        const criterion2Id = new ObjectId()

        const post: Post = {
            postDate: date,
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
            markingCriteria: [{
                id: criterion1Id,
                title: 'Marking Criterion 1',
                maximumMarks: 10
            }, {
                id: criterion2Id,
                title: 'Marking Criterion 2',
                maximumMarks: 20
            }],
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const result1 = await RecordMarks(db, user1, user2, school, postId!, {
            [criterion1Id.toHexString()]: 2,
            [criterion2Id.toHexString()]: 3
        })
        expect(result1).toBe(true)
        const result2 = await RecordMarks(db, user1, user3, school, postId!, {
            [criterion1Id.toHexString()]: 1,
            [criterion2Id.toHexString()]: 5
        })
        expect(result2).toBe(true)

        const postForTeacher = await getPost(db, school, user1, postId!, yearGroupId, courseId)
        expect(postForTeacher?.marks).toEqual({
            [user2.toHexString()]: {
                [criterion1Id.toHexString()]: 2,
                [criterion2Id.toHexString()]: 3
            },
            [user3.toHexString()]: {
                [criterion1Id.toHexString()]: 1,
                [criterion2Id.toHexString()]: 5
            }
        })
        const postForUser2 = await getPost(db, school, user2, postId!, yearGroupId, courseId)
        expect(postForUser2?.marks).toEqual({
            [user2.toHexString()]: {
                [criterion1Id.toHexString()]: 2,
                [criterion2Id.toHexString()]: 3
            }
        })
        const postForUser3 = await getPost(db, school, user3, postId!, yearGroupId, courseId)
        expect(postForUser3?.marks).toEqual({
            [user3.toHexString()]: {
                [criterion1Id.toHexString()]: 1,
                [criterion2Id.toHexString()]: 5
            }
        })
    })
    it("Should record feedback on assignments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user2], yearGroupId, courseId, classId, [user2])
        const date = new Date('2025-05-12T08:21:31.891Z')

        const post: Post = {
            postDate: date,
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
            markingCriteria: [{
                id: new ObjectId(),
                title: 'Marking Criterion 1',
                maximumMarks: 10
            }, {
                id: new ObjectId(),
                title: 'Marking Criterion 2',
                maximumMarks: 20
            }],
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const result = await RecordFeedback(db, user1, user2, school, postId!, "Great work!")
        expect(result).toBe(true)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            feedback: {
                [user2.toHexString()]: "Great work!"
            }
        })
    })
    it("Should not let students submit feedback", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-05-12T08:21:31.891Z')
        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'assignment',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: [{
                id: new ObjectId(),
                title: 'Marking Criterion 1',
                maximumMarks: 10
            }, {
                id: new ObjectId(),
                title: 'Marking Criterion 2',
                maximumMarks: 20
            }],
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const result = await RecordFeedback(db, user1, user2, school, postId!, "Great work!")
        expect(result).toBe(false)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            feedback: null
        })
    })
    it("Should not record feedback on non-assignments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user2], yearGroupId, courseId, classId, [user2])
        const date = new Date('2025-05-12T08:21:31.891Z')

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
            markingCriteria: [{
                id: new ObjectId(),
                title: 'Marking Criterion 1',
                maximumMarks: 10
            }, {
                id: new ObjectId(),
                title: 'Marking Criterion 2',
                maximumMarks: 20
            }],
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const result = await RecordFeedback(db, user1, user2, school, postId!, "Great work!")
        expect(result).toBe(false)

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId
        })
    })
    it("Should add comments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user2], yearGroupId, courseId, classId, [user2])
        const date = new Date('2025-05-12T08:21:31.891Z')

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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const commentId = await addComment(db, user2, school, postId!, "Great work!")

        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            comments: [{
                id: commentId,
                userId: user2,
                date: expect.any(Date),
                content: "Great work!"
            }]
        })
    })
    it("Should delete comments", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user2], yearGroupId, courseId, classId, [user2])
        const date = new Date('2025-05-12T08:21:31.891Z')
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()
        const commentId = await addComment(db, user2, school, postId!, "Great work!")
        expect(commentId).not.toBeNull()
        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            comments: [{
                id: commentId,
                userId: user2,
                date: expect.any(Date),
                content: "Great work!"
            }]
        })
        const result = await deleteComment(db, user2, school, postId!, commentId!)
        expect(result).toBe(true)

        const postFromDatabase2 = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase2).toEqual({
            ...post,
            _id: postId,
            comments: []
        })
    })
    it("Should not let students comment on posts which they do not have access to", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1, user2], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-05-12T08:21:31.891Z')
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()
        const commentId = await addComment(db, user2, school, postId!, "Great work!")
        expect(commentId).toBeNull()
        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            comments: null
        })
    })
    it("Should not let people delete comments which they did not create", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [], yearGroupId, courseId, classId, [])
        const date = new Date('2025-05-12T08:21:31.891Z')
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()
        const commentId = await addComment(db, user2, school, postId!, "Great work!")
        expect(commentId).not.toBeNull()
        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            comments: [{
                id: commentId,
                userId: user2,
                date: expect.any(Date),
                content: "Great work!"
            }]
        })

        const result = await deleteComment(db, user1, school, postId!, commentId!)
        expect(result).toBe(false)
        const postFromDatabase2 = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase2).toEqual(postFromDatabase)
    })
    it("Should not let students delete comments on posts which are not visible to them", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1, user2], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-05-14T07:59:21.347Z')
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()
        const commentId = await addComment(db, user1, school, postId!, "Great work!")
        expect(commentId).not.toBeNull()
        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            comments: [{
                id: commentId,
                userId: user1,
                date: expect.any(Date),
                content: "Great work!"
            }]
        })

        const result = await deleteComment(db, user2, school, postId!, commentId!)
        expect(result).toBe(false)
        const postFromDatabase2 = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase2).toEqual(postFromDatabase)
    })
    it("Should not let non-school-members comment on posts", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-05-12T08:21:31.891Z')
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()
        const commentId = await addComment(db, new ObjectId(), school, postId!, "Great work!")
        expect(commentId).toBeNull()
        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            comments: null
        })
    })
    it("Should not let users post comments with forged school IDs", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-05-12T08:21:31.891Z')
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()
        const fakeSchool = createSchoolStructure(new ObjectId(), schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const commentId = await addComment(db, user1, fakeSchool, postId!, "Great work!")
        expect(commentId).toBeNull()
        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
            comments: null
        })
    })
    it("Should not let non-school-members record marks", async () => {
        const school = createSchoolStructure(schoolId, [user1], [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-05-15T01:50:18.902Z')
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
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()
        const result = await RecordMarks(db, user2, user1, school, postId!, {})
        expect(result).toBe(false)
        const postFromDatabase = await db.collection('posts').findOne({ _id: postId! })
        expect(postFromDatabase).toEqual({
            ...post,
            _id: postId,
        })
    })
    it("Should not record feedback on non-existent posts", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const result = await RecordFeedback(db, user1, user2, school, new ObjectId(), "Great work!")
        expect(result).toBe(false)
        const postFromDatabase = await db.collection('posts').findOne({ _id: new ObjectId() })
        expect(postFromDatabase).toBeNull()
    })
    it("Should give marks in convertPostsForAPI", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user2], yearGroupId, courseId, classId, [user2])
        const date = new Date('2025-01-14T23:22:43.157Z')
        const attachmentId = new ObjectId()
        const criterion1Id = new ObjectId()
        const criterion2Id = new ObjectId()

        const post: Post = {
            postDate: date,
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
            markingCriteria: [{
                id: criterion1Id,
                title: 'Marking Criterion 1',
                maximumMarks: 10
            }, {
                id: criterion2Id,
                title: 'Marking Criterion 2',
                maximumMarks: 20
            }],
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const result = await RecordMarks(db, user1, user2, school, postId!, {
            [criterion1Id.toHexString()]: 2,
            [criterion2Id.toHexString()]: 3
        })
        expect(result).toBe(true)

        const postFromDatabase = await db.collection<Post>('posts').findOne({ _id: postId! })
        expect(postFromDatabase).not.toBeNull()

        const posts = await convertPostsForApi(db, false, user1, [postFromDatabase!])
        expect(posts[0].marks).toEqual({
            [user2.toHexString()]: {
                [criterion1Id.toHexString()]: 2,
                [criterion2Id.toHexString()]: 3
            }
        })
    })
    it("Should not let users submit assignments multiple times", async () => {
        const school = createSchoolStructure(schoolId, schoolMemberIds, [user1], yearGroupId, courseId, classId, [user1])
        const date = new Date('2025-01-14T23:22:43.157Z')

        const post: Post = {
            postDate: date,
            posterId: user2,
            schoolId: schoolId,
            yearGroupId: yearGroupId,
            courseId: courseId,
            classIds: null,
            private: false,
            type: 'assignment',
            title: 'Hello',
            content: 'Hello World',
            attachments: [],
            markingCriteria: null,
            submissionTemplates: null,
            studentAttachments: null,
            isoDueDate: null,
            isoSubmissionDates: null,
            marks: null,
            linkedSyllabusContentIds: null,
            feedback: null,
            comments: null
        }
        const postId = await createPost(db, school, post)
        expect(postId).not.toBeNull()

        const result = await submitAssignment(mongoClient, db, user1, school, postId!, async () => {
            return null
        })
        expect(result).toBe(true)

        const postFromDatabase = await db.collection<Post>('posts').findOne({ _id: postId! })
        expect(postFromDatabase).not.toBeNull()
        expect(postFromDatabase!.isoSubmissionDates).toEqual({
            [user1.toHexString()]: expect.any(Date)
        })

        const result2 = await submitAssignment(mongoClient, db, user1, school, postId!, async () => {
            return null
        })
        expect(result2).toBe(false)

        const postFromDatabase2 = await db.collection<Post>('posts').findOne({ _id: postId! })
        expect(postFromDatabase2).not.toBeNull()
        expect(postFromDatabase2).toEqual(postFromDatabase)
    })
})
