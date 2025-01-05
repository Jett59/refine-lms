import { Db, ObjectId } from "mongodb"
import { ClassInfo, CourseInfo, SchoolInfo, YearGroupInfo } from "../data/school"
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
}

export interface Class {
    id: ObjectId
    name: string
    teacherIds: ObjectId[]
    studentIds: ObjectId[]
}

const COLLECTION_NAME = 'schools'

function convertClassForApi(cls: Class): ClassInfo {
    return {
        id: cls.id.toHexString(),
        name: cls.name,
        teacherIds: cls.teacherIds.map(id => id.toHexString()),
        studentIds: cls.studentIds.map(id => id.toHexString())
    }
}

function convertCourseForApi(course: Course): CourseInfo {
    return {
        id: course.id.toHexString(),
        name: course.name,
        classes: course.classes.map(convertClassForApi)
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

export async function listVisibleSchools(db: Db, userId: ObjectId): Promise<VisibleSchoolsResponse> {
    const schoolNamesAndIds = await getCollection(db).find({
        $or: [
            { administratorIds: userId },
            { teacherIds: userId },
            { studentIds: userId }
        ]
    }, { projection: { _id: 1, name: 1 } }).toArray()
    return {
        schools: schoolNamesAndIds.map(schoolNameAndId => ({
            id: schoolNameAndId._id.toHexString(),
            name: schoolNameAndId.name,
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
 * - Student: all administrator and teacher infos, all students from the same year group, all courses and classes which include the student
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
                classes: course.classes.filter(cls => cls.studentIds.some(id => id.equals(userId)))
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
                classes: []
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
                studentIds: []
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
