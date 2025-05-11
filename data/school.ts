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

    pendingClassJoinRequests: PendingClassJoinRequestInfo[]
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

    syllabusContent: SyllabusContent[]
    syllabusOutcomes: SyllabusOutcome[]
}

export interface ClassInfo {
    id: string
    name: string
    teacherIds: string[]
    studentIds: string[]
    requestingStudentIds: string[]
}

export interface SyllabusContent {
    id: string
    content: string
}
export interface SyllabusOutcome {
    id: string
    name: string
    description: string
}

export interface PendingClassJoinRequestInfo {
    className: string
    courseName: string
    yearGroupName: string
}

export type Role = 'administrator' | 'teacher' | 'student'

export interface SchoolStructure {
    id: string
    name: string
    yearGroups: YearGroupStructure[]
}

export interface YearGroupStructure {
    id: string
    name: string
    courses: CourseStructure[]
}

export interface CourseStructure {
    id: string
    name: string
    classes: ClassStructure[]
}

export interface ClassStructure {
    id: string
    name: string
}
