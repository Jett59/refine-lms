import { UserInfo } from "./user"

export interface SchoolInfo {
    id: string
    name: string
    yearGroups: YearGroupInfo[]
    administrators: UserInfo[]
    teachers: UserInfo[]
    students: UserInfo[],
    invitedAdministratorEmails: string[],
    invitedTeacherEmails: string[],
    invitedStudentEmails: string[]
}

export interface YearGroupInfo {
    id: string
    name: string
    courses: CourseInfo[]
}

export interface CourseInfo {
    id: string
    name: string
    classes: ClassInfo[]
}

export interface ClassInfo {
    id: string
    name: string
    teacherIds: string[]
    studentIds: string[]
    requestingStudentIds: string[]
}

export type Role = 'administrator' | 'teacher' | 'student'
