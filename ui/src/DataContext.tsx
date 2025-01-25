import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Role, SchoolInfo, SchoolStructure } from "../../data/school";
import { PostInfo, PostTemplate } from "../../data/post"
import { isSuccessfulAPIResponse, useAuthenticatedAPIs } from "./api";
import { AddToClassRequest, AddToClassResponse, CreateClassRequest, CreateClassResponse, CreateCourseRequest, CreateCourseResponse, CreatePostRequest, CreatePostResponse, CreateSchoolRequest, CreateSchoolResponse, CreateYearGroupRequest, CreateYearGroupResponse, DeclineInvitationRequest, DeclineInvitationResponse, InviteRequest, InviteResponse, JoinSchoolRequest, JoinSchoolResponse, ListPostsRequest, ListPostsResponse, RelevantSchoolInfoResponse, RemoveFromClassRequest, RemoveFromClassResponse, RemoveUserRequest, RemoveUserResponse, RequestToJoinClassRequest, RequestToJoinClassResponse, SchoolStructureResponse, VisibleSchoolsResponse } from "../../data/api";
import { useUser } from "./UserContext";
import { useError } from "./ErrorContext";

export interface DataContextValue {
    joinedSchools: {
        name: string
        id: string
    }[],
    invitedSchools: {
        name: string
        id: string
    }[],
    getRelevantSchoolInfo(schoolId: string, refreshCache?: boolean): Promise<SchoolInfo | null>
    createSchool: (name: string) => Promise<void>
    createYearGroup: (schoolId: string, name: string) => Promise<void>
    createCourse: (schoolId: string, yearGroupId: string, name: string) => Promise<void>
    createClass: (schoolId: string, yearGroupId: string, courseId: string, name: string) => Promise<void>
    invite: (schoolId: string, role: Role, email: string) => Promise<void>
    joinSchool: (schoolId: string) => Promise<void>
    declineInvitation: (schoolId: string) => Promise<void>
    removeUser: (schoolId: string, userId: string) => Promise<void>
    addToClass: (schoolId: string, yearGroupId: string, courseId: string, classId: string, role: 'student' | 'teacher', userId: string) => Promise<void>
    removeFromClass: (schoolId: string, yearGroupId: string, courseId: string, classId: string, userId: string) => Promise<void>
    getSchoolStructure: (schoolId: string) => Promise<SchoolStructure | null>
    requestToJoinClass: (schoolId: string, yearGroupId: string, courseId: string, classId: string) => Promise<void>

    createPost: (post: PostTemplate, googleAccessToken: string) => Promise<void>
    listPosts: (beforeDate: string | null, limit: number, schoolId: string, yearGroupId: string, courseId?: string, classIds?: string[]) => Promise<{
        posts: PostInfo[]
        isEnd: boolean
    } | null>
}

const DataContext = createContext<DataContextValue>({
    joinedSchools: [],
    invitedSchools: [],
    getRelevantSchoolInfo: async () => null,
    createSchool: async () => { },
    createYearGroup: async () => { },
    createCourse: async () => { },
    createClass: async () => { },
    invite: async () => { },
    joinSchool: async () => { },
    declineInvitation: async () => { },
    removeUser: async () => { },
    addToClass: async () => { },
    removeFromClass: async () => { },
    getSchoolStructure: async () => null,
    requestToJoinClass: async () => { },
    createPost: async () => { },
    listPosts: async () => null,
})

export function DataContextProvider({ children }: { children: React.ReactNode }) {
    const { addAPIError } = useError()

    const { loggedIn } = useUser()

    const authenticatedAPIs = useAuthenticatedAPIs()

    const [joinedSchools, setJoinedSchools] = useState<DataContextValue['joinedSchools']>([])
    const [invitedSchools, setInvitedSchools] = useState<DataContextValue['invitedSchools']>([])

    const updateVisibleSchoolList = useCallback(async () => {
        const response = await authenticatedAPIs.call<VisibleSchoolsResponse>('GET', 'visible-schools', undefined)
        if (isSuccessfulAPIResponse(response)) {
            setJoinedSchools(response.body.joinedSchools)
            setInvitedSchools(response.body.invitedSchools)
        } else {
            addAPIError(response)
        }
    }, [authenticatedAPIs, addAPIError])

    useEffect(() => {
        if (loggedIn) {
            updateVisibleSchoolList()
        }
    }, [loggedIn, updateVisibleSchoolList])

    const [relevantSchoolInfos, setRelevantSchoolInfos] = useState<{ [schoolId: string]: SchoolInfo }>({})

    const getRelevantSchoolInfo: (schoolId: string, refreshCache?: boolean) => Promise<SchoolInfo | null> = useCallback(async (schoolId, refreshCache) => {
        if (!relevantSchoolInfos[schoolId] || refreshCache) {
            const response = await authenticatedAPIs.call<RelevantSchoolInfoResponse>('GET', 'relevant-school-info', undefined, { id: schoolId })
            if (isSuccessfulAPIResponse(response) && response.body.school) {
                setRelevantSchoolInfos(schoolInfos => ({
                    ...schoolInfos,
                    [schoolId]: response.body.school
                }))
            } else {
                addAPIError(response)
                return null
            }
        }
        return relevantSchoolInfos[schoolId]
    }, [authenticatedAPIs, relevantSchoolInfos])

    return <DataContext.Provider value={{
        joinedSchools,
        invitedSchools,
        getRelevantSchoolInfo,
        createSchool: useCallback(async (name) => {
            const response = await authenticatedAPIs.call<CreateSchoolResponse, CreateSchoolRequest>('POST', 'create-school', { name })
            if (isSuccessfulAPIResponse(response)) {
                await updateVisibleSchoolList()
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs]),
        createYearGroup: useCallback(async (schoolId, name) => {
            const response = await authenticatedAPIs.call<CreateYearGroupResponse, CreateYearGroupRequest>('POST', 'create-year-group', { schoolId, name })
            if (isSuccessfulAPIResponse(response)) {
                // Refresh the school info cache
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, getRelevantSchoolInfo]),
        createCourse: useCallback(async (schoolId, yearGroupId, name) => {
            const response = await authenticatedAPIs.call<CreateCourseResponse, CreateCourseRequest>('POST', 'create-course', { schoolId, yearGroupId, name })
            if (isSuccessfulAPIResponse(response)) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs]),
        createClass: useCallback(async (schoolId, yearGroupId, courseId, name) => {
            const response = await authenticatedAPIs.call<CreateClassResponse, CreateClassRequest>('POST', 'create-class', { schoolId, yearGroupId, courseId, name })
            if (isSuccessfulAPIResponse(response)) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs]),
        invite: useCallback(async (schoolId, role, email) => {
            const response = await authenticatedAPIs.call<InviteResponse, InviteRequest>('POST', 'invite', { schoolId, role, email })
            if (isSuccessfulAPIResponse(response) && response.body.success) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs]),
        joinSchool: useCallback(async (schoolId) => {
            const response = await authenticatedAPIs.call<JoinSchoolResponse, JoinSchoolRequest>('POST', 'join-school', { schoolId })
            if (isSuccessfulAPIResponse(response) && response.body.success) {
                await updateVisibleSchoolList()
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, updateVisibleSchoolList]),
        declineInvitation: useCallback(async (schoolId) => {
            const response = await authenticatedAPIs.call<DeclineInvitationResponse, DeclineInvitationRequest>('POST', 'decline-invitation', { schoolId })
            if (isSuccessfulAPIResponse(response) && response.body.success) {
                await updateVisibleSchoolList()
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, updateVisibleSchoolList]),
        removeUser: useCallback(async (schoolId, userId) => {
            const response = await authenticatedAPIs.call<RemoveUserResponse, RemoveUserRequest>('POST', 'remove-user', { schoolId, userId })
            if (isSuccessfulAPIResponse(response) && response.body.success) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, getRelevantSchoolInfo]),
        addToClass: useCallback(async (schoolId, yearGroupId, courseId, classId, role, userId) => {
            const response = await authenticatedAPIs.call<AddToClassResponse, AddToClassRequest>('POST', 'add-to-class', { schoolId, yearGroupId, courseId, classId, role, userId })
            if (isSuccessfulAPIResponse(response) && response.body.success) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, getRelevantSchoolInfo]),
        removeFromClass: useCallback(async (schoolId, yearGroupId, courseId, classId, userId) => {
            const response = await authenticatedAPIs.call<RemoveFromClassResponse, RemoveFromClassRequest>('POST', 'remove-from-class', { schoolId, yearGroupId, courseId, classId, userId })
            if (isSuccessfulAPIResponse(response) && response.body.success) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, getRelevantSchoolInfo]),
        getSchoolStructure: useCallback(async (schoolId) => {
            const response = await authenticatedAPIs.call<SchoolStructureResponse>('GET', 'school-structure', undefined, { id: schoolId })
            if (isSuccessfulAPIResponse(response)) {
                return response.body.school
            } else {
                addAPIError(response)
                return null
            }
        }, [authenticatedAPIs]),
        requestToJoinClass: useCallback(async (schoolId, yearGroupId, courseId, classId) => {
            const response = await authenticatedAPIs.call<RequestToJoinClassResponse, RequestToJoinClassRequest>('POST', 'request-to-join-class', { schoolId, yearGroupId, courseId, classId })
            if (isSuccessfulAPIResponse(response)) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, getRelevantSchoolInfo]),
        createPost: useCallback(async (post, googleAccessToken) => {
            const response = await authenticatedAPIs.call<CreatePostResponse, CreatePostRequest>('POST', 'create-post', { post, googleAccessToken })
            if (!isSuccessfulAPIResponse(response)) {
                addAPIError(response)
            }
        }, [authenticatedAPIs]),
        listPosts: useCallback(async (beforeDate, limit, schoolId, yearGroupId, courseId, classIds) => {
            const response = await authenticatedAPIs.call<ListPostsResponse, ListPostsRequest>('POST', 'list-posts', { beforeDate: beforeDate ?? undefined, limit, schoolId, yearGroupId, courseId, classIds })
            if (isSuccessfulAPIResponse(response)) {
                return response.body
            } else {
                addAPIError(response)
                return null
            }
        }, [authenticatedAPIs]),
    }}>
        {children}
    </DataContext.Provider>
}

export const useData = () => useContext(DataContext)

export function useRelevantSchoolInfo(schoolId?: string): SchoolInfo | null {
    const { getRelevantSchoolInfo } = useData()
    const [school, setSchool] = useState<SchoolInfo | null>(null)

    useEffect(() => {
        if (schoolId) {
            getRelevantSchoolInfo(schoolId).then(setSchool)
        } else {
            setSchool(null)
        }
    }, [getRelevantSchoolInfo, schoolId])

    return school
}

export function useRole(school: SchoolInfo | null): Role | null {
    const { userId } = useUser()

    if (!school || !userId) {
        return null
    }

    if (school.administrators.some(admin => admin.id === userId)) {
        return 'administrator'
    }
    if (school.teachers.some(teacher => teacher.id === userId)) {
        return 'teacher'
    }
    if (school.students.some(student => student.id === userId)) {
        return 'student'
    }

    console.error('User is not a member of school', school)
    return null
}

export function useIsTeacherOrAdministrator(school: SchoolInfo | null): boolean {
    return ['teacher', 'administrator'].includes(useRole(school) ?? '')
}

export function lookupUser(schoolInfo: SchoolInfo, userId: string) {
    return schoolInfo.administrators.find(admin => admin.id === userId)
        ?? schoolInfo.teachers.find(teacher => teacher.id === userId)
        ?? schoolInfo.students.find(student => student.id === userId)
}

export function useSchoolStructure(schoolId: string): SchoolStructure | null {
    const { getSchoolStructure } = useData()
    const [structure, setStructure] = useState<SchoolStructure | null>(null)

    useEffect(() => {
        getSchoolStructure(schoolId).then(setStructure)
    }, [getSchoolStructure, schoolId])

    return structure
}
