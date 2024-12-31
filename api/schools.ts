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
        students: await findUserInfos(db, school.studentIds)
    }
}

export async function listVisibleSchools(db: Db, userId: ObjectId): Promise<VisibleSchoolsResponse> {
    const schoolNamesAndIds = await db.collection<School>(COLLECTION_NAME).find({
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
    const school = {
        name,
        yearGroups: [],
        administratorIds: [creatorId],
        teacherIds: [],
        studentIds: []
    }
    const result = await db.collection(COLLECTION_NAME).insertOne(school)
    return result.insertedId
}
