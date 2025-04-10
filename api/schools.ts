import { Db, ObjectId } from "mongodb"
import { ClassInfo, CourseInfo, SchoolInfo, SchoolStructure, YearGroupInfo } from "../data/school"
import { findUserInfos } from "./user"
import { VisibleSchoolsResponse } from "../data/api"

export interface School {
    _id: ObjectId
    name: string
    yearGroups: YearGroup[]
    administratorIds: ObjectId[]
    teacherIds: ObjectId[]
    studentIds: ObjectId[]
    invitedAdministratorEmails: string[]
    invitedTeacherEmails: string[]
    invitedStudentEmails: string[]
}

export interface YearGroup {
    id: ObjectId
    name: string
    courses: Course[]
}

export interface Course {
    id: ObjectId
    name: string
    classes: Class[]

    syllabusContent?: string[]
    syllabusOutcomes?: [string, string][]
}

export interface Class {
    id: ObjectId
    name: string
    teacherIds: ObjectId[]
    studentIds: ObjectId[]
    requestingStudentIds: ObjectId[]
}

const COLLECTION_NAME = 'schools'

function convertClassForApi(cls: Class): ClassInfo {
    return {
        id: cls.id.toHexString(),
        name: cls.name,
        teacherIds: cls.teacherIds.map(id => id.toHexString()),
        studentIds: cls.studentIds.map(id => id.toHexString()),
        requestingStudentIds: cls.requestingStudentIds.map(id => id.toHexString())
    }
}

function convertCourseForApi(course: Course): CourseInfo {
    return {
        id: course.id.toHexString(),
        name: course.name,
        classes: course.classes.map(convertClassForApi),
        syllabusContent: course.syllabusContent ?? [],
        syllabusOutcomes: course.syllabusOutcomes ?? []
    }
}

function convertYearGroupForApi(yearGroup: YearGroup): YearGroupInfo {
    return {
        id: yearGroup.id.toHexString(),
        name: yearGroup.name,
        courses: yearGroup.courses.map(convertCourseForApi)
    }
}

async function convertSchoolForApi(db: Db, school: School): Promise<SchoolInfo> {
    return {
        id: school._id.toHexString(),
        name: school.name,
        yearGroups: school.yearGroups.map(convertYearGroupForApi),
        administrators: await findUserInfos(db, school.administratorIds),
        teachers: await findUserInfos(db, school.teacherIds),
        students: await findUserInfos(db, school.studentIds),
        invitedAdministratorEmails: school.invitedAdministratorEmails,
        invitedTeacherEmails: school.invitedTeacherEmails,
        invitedStudentEmails: school.invitedStudentEmails
    }
}

function getCollection(db: Db) {
    return db.collection<School>(COLLECTION_NAME)
}

export async function getSchool(db: Db, userId: ObjectId, schoolId: ObjectId): Promise<School | null> {
    const school = await getCollection(db).findOne({
        _id: schoolId,
        $or: [
            { administratorIds: userId },
            { teacherIds: userId },
            { studentIds: userId }
        ]
    })
    if (!school) {
        return null
    }
    return school
}

export async function listVisibleSchools(db: Db, userId: ObjectId, email: string): Promise<VisibleSchoolsResponse> {
    const joinedSchools = await getCollection(db).find({
        $or: [
            { administratorIds: userId },
            { teacherIds: userId },
            { studentIds: userId }
        ]
    }, { projection: { _id: 1, name: 1 } }).toArray()
    const invitedSchools = await getCollection(db).find({
        $or: [
            { invitedAdministratorEmails: email },
            { invitedTeacherEmails: email },
            { invitedStudentEmails: email }
        ]
    }, { projection: { _id: 1, name: 1 } }).toArray()
    return {
        joinedSchools: joinedSchools.map(school => ({
            id: school._id.toHexString(),
            name: school.name,
        })),
        invitedSchools: invitedSchools.map(school => ({
            id: school._id.toHexString(),
            name: school.name,
        }))
    }
}

export async function createSchool(db: Db, creatorId: ObjectId, name: string): Promise<ObjectId> {
    const id = new ObjectId()
    const school = {
        _id: id,
        name,
        yearGroups: [],
        administratorIds: [creatorId],
        teacherIds: [],
        studentIds: [],
        invitedAdministratorEmails: [],
        invitedTeacherEmails: [],
        invitedStudentEmails: []
    }
    const result = await getCollection(db).insertOne(school)
    return result.insertedId ?? id
}

export async function getRelevantSchoolInfo(db: Db, userId: ObjectId, schoolId: ObjectId): Promise<SchoolInfo | null> {
    // From the api documentation:
    /**
     * A trimmed version of the full school info. Depending on the user's role, this includes:
     * - Administrator/teacher: everything
     * - Student: all administrator and teacher infos, all courses and classes which include the student, all students who share a class with the current student
     */
    // TODO: Find a way of removing irrelevant data from the school info in this query
    const wholeSchool: School = await getCollection(db).findOne({
        _id: schoolId,
        $or: [
            { administratorIds: userId },
            { teacherIds: userId },
            { studentIds: userId }
        ]
    }) as School
    if (!wholeSchool) {
        return null
    }
    if (wholeSchool.administratorIds.some(id => id.equals(userId)) || wholeSchool.teacherIds.some(id => id.equals(userId))) {
        return convertSchoolForApi(db, wholeSchool)
    }
    let relevantSchool: School = {
        _id: wholeSchool._id,
        name: wholeSchool.name,
        yearGroups: wholeSchool.yearGroups.map(yearGroup => ({
            id: yearGroup.id,
            name: yearGroup.name,
            courses: yearGroup.courses.map(course => ({
                id: course.id,
                name: course.name,
                syllabusContent: course.syllabusContent,
                syllabusOutcomes: course.syllabusOutcomes,
                classes: course.classes.map(cls => ({
                    id: cls.id,
                    name: cls.name,
                    teacherIds: cls.teacherIds,
                    studentIds: cls.studentIds,
                    requestingStudentIds: []
                })).filter(cls => cls.studentIds.some(id => id.equals(userId)))
            })).filter(course => course.classes.length > 0)
        })).filter(yearGroup => yearGroup.courses.length > 0),
        administratorIds: wholeSchool.administratorIds,
        teacherIds: wholeSchool.teacherIds,
        studentIds: wholeSchool.studentIds,
        invitedAdministratorEmails: [],
        invitedTeacherEmails: [],
        invitedStudentEmails: []
    }
    // Remove irrelevant student IDs
    relevantSchool.studentIds = relevantSchool.studentIds.filter(id => (
        relevantSchool.yearGroups.some(yearGroup => (
            yearGroup.courses.some(course => (
                course.classes.some(cls => (
                    cls.studentIds.some(otherId => otherId.equals(id))
                ))
            ))
        ))
    ))
    return convertSchoolForApi(db, relevantSchool)
}

export async function createYearGroup(db: Db, userId: ObjectId, schoolId: ObjectId, name: string): Promise<ObjectId> {
    const yearGroupId = new ObjectId()
    await getCollection(db).updateOne({
        _id: schoolId,
        $or: [
            { administratorIds: userId },
            { teacherIds: userId }
        ]
    }, {
        $push: {
            yearGroups: {
                id: yearGroupId,
                name,
                courses: []
            }
        }
    })
    return yearGroupId
}

export async function createCourse(db: Db, userId: ObjectId, schoolId: ObjectId, yearGroupId: ObjectId, name: string): Promise<ObjectId> {
    const courseId = new ObjectId()
    await getCollection(db).updateOne({
        _id: schoolId,
        $or: [
            { administratorIds: userId },
            { teacherIds: userId }
        ],
        'yearGroups.id': yearGroupId
    }, {
        $push: {
            'yearGroups.$.courses': {
                id: courseId,
                name,
                classes: [],
                syllabusContent: [],
                syllabusOutcomes: []
            }
        }
    })
    return courseId
}

export async function createClass(db: Db, userId: ObjectId, schoolId: ObjectId, yearGroupId: ObjectId, courseId: ObjectId, name: string): Promise<ObjectId> {
    const classId = new ObjectId()
    await getCollection(db).updateOne({
        _id: schoolId,
        $or: [
            { administratorIds: userId },
            { teacherIds: userId }
        ],
        'yearGroups.id': yearGroupId,
        'yearGroups.courses.id': courseId
    }, {
        // REF: https://stackoverflow.com/questions/24046470/mongodb-too-many-positional-i-e-elements-found-in-path
        $push: {
            'yearGroups.$[i].courses.$[j].classes': {
                id: classId,
                name,
                teacherIds: [],
                studentIds: [],
                requestingStudentIds: []
            }
        }
    }, {
        arrayFilters: [
            { 'i.id': yearGroupId },
            { 'j.id': courseId }
        ]
    })
    return classId
}

export async function invite(db: Db, userId: ObjectId, schoolId: ObjectId, role: 'administrator' | 'teacher' | 'student', email: string) {
    const key = `invited${role.charAt(0).toUpperCase()}${role.slice(1)}Emails`
    await getCollection(db).updateOne({
        _id: schoolId,
        administratorIds: userId
    }, {
        $push: {
            [key]: email
        }
    })
}

export async function joinSchool(db: Db, userId: ObjectId, email: string, schoolId: ObjectId) {
    // We have to do these one-at-a-time to ensure that the user is only added to the school once
    const result1 = await getCollection(db).updateOne({
        _id: schoolId,
        invitedAdministratorEmails: email
    }, {
        $push: {
            administratorIds: userId
        },
        $pull: {
            invitedAdministratorEmails: email
        }
    })
    if (result1.modifiedCount === 0) {
        const result2 = await getCollection(db).updateOne({
            _id: schoolId,
            invitedTeacherEmails: email
        }, {
            $push: {
                teacherIds: userId
            },
            $pull: {
                invitedTeacherEmails: email
            }
        })
        if (result2.modifiedCount === 0) {
            await getCollection(db).updateOne({
                _id: schoolId,
                invitedStudentEmails: email
            }, {
                $push: {
                    studentIds: userId
                },
                $pull: {
                    invitedStudentEmails: email
                }
            })
        }
    }
}

export async function declineInvitation(db: Db, email: string, schoolId: ObjectId) {
    await getCollection(db).updateOne({
        _id: schoolId,
        $or: [
            { invitedAdministratorEmails: email },
            { invitedTeacherEmails: email },
            { invitedStudentEmails: email }
        ]
    }, {
        $pull: {
            invitedAdministratorEmails: email,
            invitedTeacherEmails: email,
            invitedStudentEmails: email
        }
    })
}

export async function removeUser(db: Db, ourUserId: ObjectId, schoolId: ObjectId, userIdToRemove: ObjectId) {
    await getCollection(db).updateOne({
        _id: schoolId,
        administratorIds: ourUserId
    }, {
        $pull: {
            administratorIds: userIdToRemove,
            teacherIds: userIdToRemove,
            studentIds: userIdToRemove,
            "yearGroups.$[].courses.$[].classes.$[].teacherIds": userIdToRemove,
            "yearGroups.$[].courses.$[].classes.$[].studentIds": userIdToRemove
        }
    })
}

export async function addToClass(db: Db, ourUserId: ObjectId, schoolId: ObjectId, yearGroupId: ObjectId, courseId: ObjectId, classId: ObjectId, role: 'student' | 'teacher', userIdToAdd: ObjectId) {
    const key = role === 'student' ? 'studentIds' : 'teacherIds'
    await getCollection(db).updateOne({
        _id: schoolId,
        $or: [
            { administratorIds: ourUserId },
            { teacherIds: ourUserId }
        ],
        'yearGroups.id': yearGroupId,
        'yearGroups.courses.id': courseId,
        'yearGroups.courses.classes.id': classId
    }, {
        $push: {
            [`yearGroups.$[i].courses.$[j].classes.$[k].${key}`]: userIdToAdd
        },
        $pull: {
            'yearGroups.$[i].courses.$[j].classes.$[k].requestingStudentIds': userIdToAdd
        }
    }, {
        arrayFilters: [
            { 'i.id': yearGroupId },
            { 'j.id': courseId },
            { 'k.id': classId }
        ]
    })
}

export async function removeFromClass(db: Db, ourUserId: ObjectId, schoolId: ObjectId, yearGroupId: ObjectId, courseId: ObjectId, classId: ObjectId, userIdToRemove: ObjectId) {
    await getCollection(db).updateOne({
        _id: schoolId,
        $or: [
            { administratorIds: ourUserId },
            { teacherIds: ourUserId }
        ],
        'yearGroups.id': yearGroupId,
        'yearGroups.courses.id': courseId,
        'yearGroups.courses.classes.id': classId
    }, {
        $pull: {
            'yearGroups.$[i].courses.$[j].classes.$[k].teacherIds': userIdToRemove,
            'yearGroups.$[i].courses.$[j].classes.$[k].studentIds': userIdToRemove,
            'yearGroups.$[i].courses.$[j].classes.$[k].requestingStudentIds': userIdToRemove
        }
    }, {
        arrayFilters: [
            { 'i.id': yearGroupId },
            { 'j.id': courseId },
            { 'k.id': classId }
        ]
    })
}

export async function getSchoolStructure(db: Db, userId: ObjectId, schoolId: ObjectId): Promise<SchoolStructure | null> {
    const schoolStructureFromDatabase = await getCollection(db).findOne({
        _id: schoolId,
        $or: [
            { administratorIds: userId },
            { teacherIds: userId },
            { studentIds: userId }
        ]
    }, {
        projection: {
            name: 1,
            'yearGroups.id': 1,
            'yearGroups.name': 1,
            'yearGroups.courses.id': 1,
            'yearGroups.courses.name': 1,
            'yearGroups.courses.classes.id': 1,
            'yearGroups.courses.classes.name': 1
        }
    })
    if (!schoolStructureFromDatabase) {
        return null
    }
    return {
        id: schoolId.toHexString(),
        name: schoolStructureFromDatabase.name,
        yearGroups: schoolStructureFromDatabase.yearGroups.map((yearGroup: { id: ObjectId, name: string, courses: { id: ObjectId, name: string, classes: { id: ObjectId, name: string }[] }[] }) => ({
            id: yearGroup.id.toHexString(),
            name: yearGroup.name,
            courses: yearGroup.courses.map(course => ({
                id: course.id.toHexString(),
                name: course.name,
                classes: course.classes.map(cls => ({
                    id: cls.id.toHexString(),
                    name: cls.name
                }))
            }))
        }))
    }
}

export async function requestToJoinClass(db: Db, userId: ObjectId, schoolId: ObjectId, yearGroupId: ObjectId, courseId: ObjectId, classId: ObjectId) {
    await getCollection(db).updateOne({
        _id: schoolId,
        studentIds: userId,
        'yearGroups.id': yearGroupId,
        'yearGroups.courses.id': courseId,
        'yearGroups.courses.classes.id': classId
    }, {
        $push: {
            'yearGroups.$[i].courses.$[j].classes.$[k].requestingStudentIds': userId
        }
    }, {
        arrayFilters: [
            { 'i.id': yearGroupId },
            { 'j.id': courseId },
            { 'k.id': classId }
        ]
    })
}

export async function addSyllabusContent(db: Db, userId: ObjectId, schoolId: ObjectId, yearGroupId: ObjectId, courseId: ObjectId, content: string) {
    await getCollection(db).updateOne({
        _id: schoolId,
        $or: [
            { administratorIds: userId },
            { teacherIds: userId }
        ],
        'yearGroups.id': yearGroupId,
        'yearGroups.courses.id': courseId
    }, {
        $push: {
            'yearGroups.$[i].courses.$[j].syllabusContent': content
        }
    }, {
        arrayFilters: [
            { 'i.id': yearGroupId },
            { 'j.id': courseId }
        ]
    })
}
