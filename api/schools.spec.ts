import { Collection, Db, MongoClient, ObjectId } from "mongodb"
import { addSyllabusContent, addToClass, createClass, createCourse, createSchool, createYearGroup, declineInvitation, getRelevantSchoolInfo, getSchoolStructure, invite, joinSchool, listVisibleSchools, removeFromClass, removeUser, requestToJoinClass, School } from "./schools"
import { createUser } from "./user"

describe('Schools API', () => {
    const mongoClient: MongoClient = new MongoClient('mongodb://localhost:27017')
    let db: Db
    let schoolsCollection: Collection<School>

    let user1: ObjectId
    let user2: ObjectId
    let user3: ObjectId

    beforeAll(async () => {
        await mongoClient.connect()
        db = mongoClient.db('refine-test')
        schoolsCollection = db.collection('schools')
        schoolsCollection.drop()
    })
    afterAll(async () => {
        await mongoClient.close()
    })

    beforeEach(async () => {
        user1 = await createUser(db, { jwtUserId: '', name: 'User 1', email: 'user1', picture: '' })
        user2 = await createUser(db, { jwtUserId: '', name: 'User 2', email: 'user2', picture: '' })
        user3 = await createUser(db, { jwtUserId: '', name: 'User 3', email: 'user3', picture: '' })
    })

    it("Should create a school", async () => {
        await createSchool(db, user1, 'School 1')
        const schools = await schoolsCollection.find().toArray()
        expect(schools.length).toBe(1)
        const school = schools[0]
        expect(school.name).toBe('School 1')
        expect(school).toEqual({
            _id: expect.any(ObjectId),
            name: 'School 1',
            yearGroups: [],
            administratorIds: [user1],
            teacherIds: [],
            studentIds: [],
            invitedAdministratorEmails: [],
            invitedTeacherEmails: [],
            invitedStudentEmails: []
        })
    })
    it("Should list visible schools", async () => {
        const school1 = await createSchool(db, user1, 'School 1')
        const school2 = await createSchool(db, user2, 'School 2')
        const visibleSchoolsToUser1 = await listVisibleSchools(db, user1, '')
        expect(visibleSchoolsToUser1).toEqual({
            invitedSchools: [],
            joinedSchools: [{ id: school1.toHexString(), name: 'School 1' }]
        })
        const visibleSchoolsToUser2 = await listVisibleSchools(db, user2, '')
        expect(visibleSchoolsToUser2).toEqual({
            invitedSchools: [],
            joinedSchools: [{ id: school2.toHexString(), name: 'School 2' }]
        })
    })
    it("Should create year groups, courses and classes", async () => {
        const school = await createSchool(db, user1, 'School 1')
        const yearGroup1 = await createYearGroup(db, user1, school, 'Year 1')
        const course1 = await createCourse(db, user1, school, yearGroup1, 'Maths')
        const class1 = await createClass(db, user1, school, yearGroup1, course1, 'Maths 1')
        const schoolData = await schoolsCollection.findOne({ _id: school })
        expect(schoolData).toEqual({
            _id: school,
            name: 'School 1',
            yearGroups: [{
                id: yearGroup1,
                name: 'Year 1',
                courses: [{
                    id: course1,
                    name: 'Maths',
                    classes: [{
                        id: class1,
                        name: 'Maths 1',
                        studentIds: [],
                        teacherIds: [],
                        requestingStudentIds: []
                    }],
                    syllabusContent: [],
                    syllabusOutcomes: []
                }]
            }],
            administratorIds: [user1],
            teacherIds: [],
            studentIds: [],
            invitedAdministratorEmails: [],
            invitedTeacherEmails: [],
            invitedStudentEmails: []
        })
    })
    it("Should not allow a non-member to create year groups, courses or classes", async () => {
        const school = await createSchool(db, user1, 'School 1')
        await createYearGroup(db, user2, school, 'Year 1')
        const schoolData1 = await schoolsCollection.findOne({ _id: school })
        expect(schoolData1?.yearGroups).toEqual([])
        const yearGroup1 = await createYearGroup(db, user1, school, 'Year 1')
        await createCourse(db, user2, school, yearGroup1, 'Maths')
        const schoolData2 = await schoolsCollection.findOne({ _id: school })
        expect(schoolData2?.yearGroups[0].courses).toEqual([])
        const course1 = await createCourse(db, user1, school, yearGroup1, 'Maths')
        await createClass(db, user2, school, yearGroup1, course1, 'Maths 1')
        const schoolData3 = await schoolsCollection.findOne({ _id: school })
        expect(schoolData3?.yearGroups[0].courses[0].classes).toEqual([])
    })
    it("Should provide all data to an administrator", async () => {
        const school = await createSchool(db, user1, 'School 1')
        const yearGroup1 = await createYearGroup(db, user1, school, 'Year 1')
        const course1 = await createCourse(db, user1, school, yearGroup1, 'Maths')
        const class1 = await createClass(db, user1, school, yearGroup1, course1, 'Maths 1')
        const relevantSchoolInfo = await getRelevantSchoolInfo(db, user1, school)
        expect(relevantSchoolInfo).toEqual({
            id: school.toHexString(),
            name: 'School 1',
            yearGroups: [{
                id: yearGroup1.toHexString(),
                name: 'Year 1',
                courses: [{
                    id: course1.toHexString(),
                    name: 'Maths',
                    classes: [{
                        id: class1.toHexString(),
                        name: 'Maths 1',
                        studentIds: [],
                        teacherIds: [],
                        requestingStudentIds: []
                    }],
                    syllabusContent: [],
                    syllabusOutcomes: []
                }]
            }],
            administrators: [{ id: user1.toHexString(), name: 'User 1', email: 'user1', picture: '' }],
            teachers: [],
            students: [],
            invitedAdministratorEmails: [],
            invitedTeacherEmails: [],
            invitedStudentEmails: []
        })
    })
    it("Should let people join a school", async () => {
        const school = await createSchool(db, user1, 'School 1')
        await invite(db, user1, school, "administrator", 'user2')
        const schoolData1 = await schoolsCollection.findOne({ _id: school })
        expect(schoolData1?.invitedAdministratorEmails).toEqual(['user2'])
        await joinSchool(db, user2, 'user2', school)
        const schoolData2 = await schoolsCollection.findOne({ _id: school })
        expect(schoolData2?.administratorIds).toEqual([user1, user2])
        expect(schoolData2?.invitedAdministratorEmails).toEqual([])
    })
    it("Should not let people join a school if they are not invited", async () => {
        const school = await createSchool(db, user1, 'School 1')
        await joinSchool(db, user2, 'user2', school)
        const schoolData = await schoolsCollection.findOne({ _id: school })
        expect(schoolData?.administratorIds).toEqual([user1])
    })
    it("Should let people join a school if they are invited as a teacher or student", async () => {
        const school = await createSchool(db, user1, 'School 1')
        await invite(db, user1, school, "teacher", 'user2')
        await invite(db, user1, school, "student", 'user3')
        await joinSchool(db, user2, 'user2', school)
        await joinSchool(db, user3, 'user3', school)
        const schoolData = await schoolsCollection.findOne({ _id: school })
        expect(schoolData?.teacherIds).toEqual([user2])
        expect(schoolData?.studentIds).toEqual([user3])
        expect(schoolData?.invitedTeacherEmails).toEqual([])
        expect(schoolData?.invitedStudentEmails).toEqual([])
    })
    it("Should show invites in visible schools", async () => {
        const school = await createSchool(db, user1, 'School 1')
        await invite(db, user1, school, "administrator", 'user2')
        const visibleSchools = await listVisibleSchools(db, user2, 'user2')
        expect(visibleSchools).toEqual({
            invitedSchools: [{ id: school.toHexString(), name: 'School 1' }],
            joinedSchools: []
        })
    })
    it("Should allow declining invitations", async () => {
        const school = await createSchool(db, user1, 'School 1')
        await invite(db, user1, school, "student", 'user2')
        await declineInvitation(db, 'user2', school)
        const schoolData = await schoolsCollection.findOne({ _id: school })
        expect(schoolData?.invitedStudentEmails).toEqual([])
    })
    it("Should limit information for students", async () => {
        const school = await createSchool(db, user1, 'School 1')
        const yearGroup1 = await createYearGroup(db, user1, school, 'Year 1')
        const course1 = await createCourse(db, user1, school, yearGroup1, 'Maths')
        const class1 = await createClass(db, user1, school, yearGroup1, course1, 'Maths 1')
        await invite(db, user1, school, "student", 'user2')
        await joinSchool(db, user2, 'user2', school)
        const relevantSchoolInfo = await getRelevantSchoolInfo(db, user2, school)
        expect(relevantSchoolInfo?.yearGroups).toEqual([])
    })
    it("Should show students the classes they are members of", async () => {
        const school = await createSchool(db, user1, 'School 1')
        const yearGroup1 = await createYearGroup(db, user1, school, 'Year 1')
        const course1 = await createCourse(db, user1, school, yearGroup1, 'Maths')
        const class1 = await createClass(db, user1, school, yearGroup1, course1, 'Maths 1')
        await invite(db, user1, school, "student", 'user2')
        await joinSchool(db, user2, 'user2', school)
        await addToClass(db, user1, school, yearGroup1, course1, class1, 'student', user2)
        const relevantSchoolInfo = await getRelevantSchoolInfo(db, user2, school)
        expect(relevantSchoolInfo?.yearGroups).toEqual([{
            id: yearGroup1.toHexString(),
            name: 'Year 1',
            courses: [{
                id: course1.toHexString(),
                name: 'Maths',
                classes: [{
                    id: class1.toHexString(),
                    name: 'Maths 1',
                    studentIds: [user2.toHexString()],
                    teacherIds: [],
                    requestingStudentIds: []
                }],
                syllabusContent: [],
                syllabusOutcomes: []
            }]
        }])
        await createClass(db, user1, school, yearGroup1, course1, 'Maths 2')
        const relevantSchoolInfo2 = await getRelevantSchoolInfo(db, user2, school)
        expect(relevantSchoolInfo2?.yearGroups[0].courses[0].classes.length).toBe(1)
        await createCourse(db, user1, school, yearGroup1, 'English')
        const relevantSchoolInfo3 = await getRelevantSchoolInfo(db, user2, school)
        expect(relevantSchoolInfo3?.yearGroups[0].courses.length).toBe(1)
        await createYearGroup(db, user1, school, 'Year 2')
        const relevantSchoolInfo4 = await getRelevantSchoolInfo(db, user2, school)
        expect(relevantSchoolInfo4?.yearGroups.length).toBe(1)
    })
    it("Should show teachers everything", async () => {
        const school = await createSchool(db, user1, 'School 1')
        const yearGroup1 = await createYearGroup(db, user1, school, 'Year 1')
        const course1 = await createCourse(db, user1, school, yearGroup1, 'Maths')
        const class1 = await createClass(db, user1, school, yearGroup1, course1, 'Maths 1')
        await invite(db, user1, school, "teacher", 'user2')
        await joinSchool(db, user2, 'user2', school)
        const relevantSchoolInfo = await getRelevantSchoolInfo(db, user2, school)
        expect(relevantSchoolInfo).toEqual({
            id: school.toHexString(),
            name: 'School 1',
            yearGroups: [{
                id: yearGroup1.toHexString(),
                name: 'Year 1',
                courses: [{
                    id: course1.toHexString(),
                    name: 'Maths',
                    classes: [{
                        id: class1.toHexString(),
                        name: 'Maths 1',
                        studentIds: [],
                        teacherIds: [],
                        requestingStudentIds: []
                    }],
                    syllabusContent: [],
                    syllabusOutcomes: []
                }]
            }],
            administrators: [{ id: user1.toHexString(), name: 'User 1', email: 'user1', picture: '' }],
            teachers: [{ id: user2.toHexString(), name: 'User 2', email: 'user2', picture: '' }],
            students: [],
            invitedAdministratorEmails: [],
            invitedTeacherEmails: [],
            invitedStudentEmails: []
        })
    })
    it("Should support adding teachers to classes", async () => {
        const school = await createSchool(db, user1, 'School 1')
        const yearGroup1 = await createYearGroup(db, user1, school, 'Year 1')
        const course1 = await createCourse(db, user1, school, yearGroup1, 'Maths')
        const class1 = await createClass(db, user1, school, yearGroup1, course1, 'Maths 1')
        await invite(db, user1, school, "teacher", 'user2')
        await joinSchool(db, user2, 'user2', school)
        await addToClass(db, user1, school, yearGroup1, course1, class1, 'teacher', user2)
        const relevantSchoolInfo = await getRelevantSchoolInfo(db, user2, school)
        expect(relevantSchoolInfo?.yearGroups[0].courses[0].classes[0].teacherIds).toEqual([user2.toHexString()])
    })
    it("Should provide school structure to students", async () => {
        const school = await createSchool(db, user1, 'School 1')
        const yearGroup1 = await createYearGroup(db, user1, school, 'Year 1')
        const course1 = await createCourse(db, user1, school, yearGroup1, 'Maths')
        const class1 = await createClass(db, user1, school, yearGroup1, course1, 'Maths 1')
        await invite(db, user1, school, "student", 'user2')
        await joinSchool(db, user2, 'user2', school)
        const schoolStructure = await getSchoolStructure(db, user2, school)
        expect(schoolStructure).toEqual({
            id: school.toHexString(),
            name: 'School 1',
            yearGroups: [{
                id: yearGroup1.toHexString(),
                name: 'Year 1',
                courses: [{
                    id: course1.toHexString(),
                    name: 'Maths',
                    classes: [{
                        id: class1.toHexString(),
                        name: 'Maths 1'
                    }]
                }]
            }]
        })
    })
    it("Should let students request to join classes", async () => {
        const school = await createSchool(db, user1, 'School 1')
        const yearGroup1 = await createYearGroup(db, user1, school, 'Year 1')
        const course1 = await createCourse(db, user1, school, yearGroup1, 'Maths')
        const class1 = await createClass(db, user1, school, yearGroup1, course1, 'Maths 1')
        await invite(db, user1, school, "student", 'user2')
        await joinSchool(db, user2, 'user2', school)
        await requestToJoinClass(db, user2, school, yearGroup1, course1, class1)
        const schoolInfo = await getRelevantSchoolInfo(db, user1, school)
        expect(schoolInfo?.yearGroups[0].courses[0].classes[0].requestingStudentIds).toEqual([user2.toHexString()])
    })
    it("Should remove users from schools", async () => {
        const school = await createSchool(db, user1, 'School 1')
        await invite(db, user1, school, "administrator", 'user2')
        await invite(db, user1, school, "teacher", 'user3')
        await removeUser(db, user1, school, user2)
        await removeUser(db, user1, school, user3)
        const schoolData = await schoolsCollection.findOne({ _id: school })
        expect(schoolData?.administratorIds).toEqual([user1])
        expect(schoolData?.teacherIds).toEqual([])
        // Also test students
        await invite(db, user1, school, "student", 'user2')
        await joinSchool(db, user2, 'user2', school)
        await removeUser(db, user1, school, user2)
        const schoolData2 = await schoolsCollection.findOne({ _id: school })
        expect(schoolData2?.studentIds).toEqual([])
    })
    it("Should remove teachers and students from classes", async () => {
        const school = await createSchool(db, user1, 'School 1')
        const yearGroup1 = await createYearGroup(db, user1, school, 'Year 1')
        const course1 = await createCourse(db, user1, school, yearGroup1, 'Maths')
        const class1 = await createClass(db, user1, school, yearGroup1, course1, 'Maths 1')
        await invite(db, user1, school, "teacher", 'user2')
        await joinSchool(db, user2, 'user2', school)
        await invite(db, user1, school, "student", 'user3')
        await joinSchool(db, user3, 'user3', school)
        await addToClass(db, user1, school, yearGroup1, course1, class1, 'teacher', user2)
        await addToClass(db, user1, school, yearGroup1, course1, class1, 'student', user3)
        await removeFromClass(db, user1, school, yearGroup1, course1, class1, user2)
        await removeFromClass(db, user1, school, yearGroup1, course1, class1, user3)
        const schoolData = await schoolsCollection.findOne({ _id: school })
        expect(schoolData?.yearGroups[0].courses[0].classes[0].teacherIds).toEqual([])
        expect(schoolData?.yearGroups[0].courses[0].classes[0].studentIds).toEqual([])
    })
    it("Should add syllabus content", async() => {
        const school = await createSchool(db, user1, 'School 1')
        const yearGroup = await createYearGroup(db, user1, school, 'Year 1')
        const course = await createCourse(db, user1, school, yearGroup, 'Maths')
        const schoolData1 = await schoolsCollection.findOne({ _id: school })
        expect(schoolData1?.yearGroups[0].courses[0].syllabusContent).toEqual([])
        await addSyllabusContent(db, user1, school, yearGroup, course, 'Does the stuff')
        const schoolData2 = await schoolsCollection.findOne({ _id: school })
        expect(schoolData2?.yearGroups[0].courses[0].syllabusContent).toEqual(['Does the stuff'])
    })
})
