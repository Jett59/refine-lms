import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Role, SchoolInfo, SchoolStructure } from "../../data/school";
import { AttachmentTemplate, PostInfo, PostTemplate, PostType } from "../../data/post"
import { isSuccessfulAPIResponse, useAuthenticatedAPIs } from "./api";
import { AddAttachmentToSubmissionRequest, AddAttachmentToSubmissionResponse, AddCommentRequest, AddCommentResponse, AddSyllabusContentRequest, AddSyllabusContentResponse, AddSyllabusOutcomeRequest, AddSyllabusOutcomeResponse, AddToClassRequest, AddToClassResponse, AttachmentLinkRequest, AttachmentLinkResponse, CreateClassRequest, CreateClassResponse, CreateCourseRequest, CreateCourseResponse, CreatePostRequest, CreatePostResponse, CreateSchoolRequest, CreateSchoolResponse, CreateYearGroupRequest, CreateYearGroupResponse, DeclineInvitationRequest, DeclineInvitationResponse, DeleteCommentRequest, DeleteCommentResponse, GetPostRequest, GetPostResponse, InviteRequest, InviteResponse, JoinSchoolRequest, JoinSchoolResponse, ListPostsRequest, ListPostsResponse, RecordMarksRequest, RecordMarksResponse, RelevantSchoolInfoResponse, RemoveFromClassRequest, RemoveFromClassResponse, RemoveSyllabusContentRequest, RemoveSyllabusContentResponse, RemoveSyllabusOutcomeRequest, RemoveSyllabusOutcomeResponse, RemoveUserRequest, RemoveUserResponse, RequestToJoinClassRequest, RequestToJoinClassResponse, SchoolStructureResponse, SubmitAssignmentRequest, SubmitAssignmentResponse, VisibleSchoolsResponse } from "../../data/api";
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
    loadingInitialSchoolsList: boolean,
    getRelevantSchoolInfo(schoolId: string, refreshCache?: boolean): Promise<SchoolInfo | null>
    createSchool: (name: string) => Promise<string | null>
    createYearGroup: (schoolId: string, name: string) => Promise<void>
    createCourse: (schoolId: string, yearGroupId: string, name: string, initialClassNames: string[]) => Promise<void>
    createClass: (schoolId: string, yearGroupId: string, courseId: string, name: string) => Promise<void>
    invite: (schoolId: string, role: Role, email: string) => Promise<void>
    joinSchool: (schoolId: string) => Promise<void>
    declineInvitation: (schoolId: string) => Promise<void>
    removeUser: (schoolId: string, userId: string) => Promise<void>
    addToClass: (schoolId: string, yearGroupId: string, courseId: string, classId: string, role: 'student' | 'teacher', userId: string) => Promise<void>
    removeFromClass: (schoolId: string, yearGroupId: string, courseId: string, classId: string, userId: string) => Promise<void>
    getSchoolStructure: (schoolId: string) => Promise<SchoolStructure | null>
    requestToJoinClass: (schoolId: string, yearGroupId: string, courseId: string, classId: string) => Promise<void>
    addSyllabusContent: (schoolId: string, yearGroupId: string, courseId: string, content: string) => Promise<void>
    removeSyllabusContent: (schoolId: string, yearGroupId: string, courseId: string, id: string) => Promise<void>
    addSyllabusOutcome: (schoolId: string, yearGroupId: string, courseId: string, name: string, description: string) => Promise<void>
    removeSyllabusOutcome: (schoolId: string, yearGroupId: string, courseId: string, id: string) => Promise<void>

    createPost: (post: PostTemplate) => Promise<void>
    listPosts: (beforeDate: string | null, limit: number, schoolId: string, yearGroupId: string, courseId?: string, classIds?: string[], postTypes?: PostType[]) => Promise<{
        posts: PostInfo[]
        isEnd: boolean
    } | null>
    getAttachmentLink: (schoolId: string, postId: string, attachmentId: string, individualCopyOwnerId?: string) => Promise<string | null>
    getPost: (postId: string, schoolId: string, yearGroupId: string, courseId?: string, classIds?: string[]) => Promise<PostInfo | null>
    addAttachmentToSubmission: (schoolId: string, postId: string, attachment: AttachmentTemplate) => Promise<string | null>
    submitAssignment: (schoolId: string, postId: string) => Promise<boolean>
    recordMarks: (schoolId: string, postId: string, studentId: string, marks: { [criterionId: string]: number }, feedback?: string) => Promise<boolean>
    addComment: (schoolId: string, postId: string, comment: string) => Promise<string | null>
    deleteComment: (schoolId: string, postId: string, commentId: string) => Promise<void>
}

const DataContext = createContext<DataContextValue>({
    joinedSchools: [],
    invitedSchools: [],
    loadingInitialSchoolsList: true,
    getRelevantSchoolInfo: async () => null,
    createSchool: async () => '',
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
    addSyllabusContent: async () => { },
    removeSyllabusContent: async () => { },
    addSyllabusOutcome: async () => { },
    removeSyllabusOutcome: async () => { },
    createPost: async () => { },
    listPosts: async () => null,
    getAttachmentLink: async () => null,
    getPost: async () => null,
    addAttachmentToSubmission: async () => null,
    submitAssignment: async () => false,
    recordMarks: async () => false,
    addComment: async () => null,
    deleteComment: async () => { },
})

export function DataContextProvider({ children }: { children: React.ReactNode }) {
    const { addAPIError, addError } = useError()

    const { loggedIn } = useUser()

    const authenticatedAPIs = useAuthenticatedAPIs()

    const [joinedSchools, setJoinedSchools] = useState<DataContextValue['joinedSchools']>([])
    const [invitedSchools, setInvitedSchools] = useState<DataContextValue['invitedSchools']>([])
    const [loadingInitialSchoolsList, setLoadingInitialSchoolsList] = useState(true)

    const updateVisibleSchoolList = useCallback(async () => {
        const response = await authenticatedAPIs.call<VisibleSchoolsResponse>('GET', 'visible-schools', undefined)
        if (isSuccessfulAPIResponse(response)) {
            setJoinedSchools(response.body.joinedSchools)
            setInvitedSchools(response.body.invitedSchools)
            setLoadingInitialSchoolsList(false) // Only changes the value after the first fetch
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
    const relevantSchoolInfosCallbacks = useRef<{ [schoolId: string]: ((school: SchoolInfo | null) => void)[] }>({})

    const getRelevantSchoolInfo: (schoolId: string, refreshCache?: boolean) => Promise<SchoolInfo | null> = useCallback(async (schoolId, refreshCache) => {
        if (relevantSchoolInfosCallbacks.current[schoolId]) {
            return new Promise((resolve) => {
                relevantSchoolInfosCallbacks.current[schoolId].push(resolve)
            })
        }
        if (!relevantSchoolInfos[schoolId] || refreshCache) {
            relevantSchoolInfosCallbacks.current[schoolId] = []
            const response = await authenticatedAPIs.call<RelevantSchoolInfoResponse>('GET', 'relevant-school-info', undefined, { id: schoolId })
            if (isSuccessfulAPIResponse(response) && response.body.school) {
                relevantSchoolInfosCallbacks.current[schoolId].forEach(callback => callback(response.body.school))
                delete relevantSchoolInfosCallbacks.current[schoolId]
                setRelevantSchoolInfos(prev => ({ ...prev, [schoolId]: response.body.school }))
            } else {
                relevantSchoolInfosCallbacks.current[schoolId].forEach(callback => callback(null))
                delete relevantSchoolInfosCallbacks.current[schoolId]
                addAPIError(response)
                return null
            }
        }
        return relevantSchoolInfos[schoolId]
    }, [authenticatedAPIs, addAPIError, relevantSchoolInfos])

    const { getGoogleAccessToken } = useUser()

    return <DataContext.Provider value={{
        joinedSchools,
        invitedSchools,
        loadingInitialSchoolsList,
        getRelevantSchoolInfo,
        createSchool: useCallback(async (name) => {
            const response = await authenticatedAPIs.call<CreateSchoolResponse, CreateSchoolRequest>('POST', 'create-school', { name })
            if (isSuccessfulAPIResponse(response)) {
                await updateVisibleSchoolList()
                return response.body.createdId
            } else {
                addAPIError(response)
            }
            return null
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
        createCourse: useCallback(async (schoolId, yearGroupId, name, initialClassNames) => {
            const response = await authenticatedAPIs.call<CreateCourseResponse, CreateCourseRequest>('POST', 'create-course', { schoolId, yearGroupId, name, initialClassNames })
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
        addSyllabusContent: useCallback(async (schoolId, yearGroupId, courseId, content) => {
            const response = await authenticatedAPIs.call<AddSyllabusContentResponse, AddSyllabusContentRequest>('POST', 'add-syllabus-content', { schoolId, yearGroupId, courseId, content })
            if (isSuccessfulAPIResponse(response)) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, getRelevantSchoolInfo]),
        removeSyllabusContent: useCallback(async (schoolId, yearGroupId, courseId, id) => {
            const response = await authenticatedAPIs.call<RemoveSyllabusContentResponse, RemoveSyllabusContentRequest>('POST', 'remove-syllabus-content', { schoolId, yearGroupId, courseId, id })
            if (isSuccessfulAPIResponse(response)) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, getRelevantSchoolInfo]),
        addSyllabusOutcome: useCallback(async (schoolId, yearGroupId, courseId, name, description) => {
            const response = await authenticatedAPIs.call<AddSyllabusOutcomeResponse, AddSyllabusOutcomeRequest>('POST', 'add-syllabus-outcome', { schoolId, yearGroupId, courseId, name, description })
            if (isSuccessfulAPIResponse(response)) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, getRelevantSchoolInfo]),
        removeSyllabusOutcome: useCallback(async (schoolId, yearGroupId, courseId, id) => {
            const response = await authenticatedAPIs.call<RemoveSyllabusOutcomeResponse, RemoveSyllabusOutcomeRequest>('POST', 'remove-syllabus-outcome', { schoolId, yearGroupId, courseId, id })
            if (isSuccessfulAPIResponse(response)) {
                await getRelevantSchoolInfo(schoolId, true)
            } else {
                addAPIError(response)
            }
        }, [authenticatedAPIs, getRelevantSchoolInfo]),
        createPost: useCallback(async (post) => {
            const googleAccessToken = await getGoogleAccessToken()
            if (!googleAccessToken) {
                addError('Google access token not found')
            } else {
                const response = await authenticatedAPIs.call<CreatePostResponse, CreatePostRequest>('POST', 'create-post', { post, googleAccessToken })
                if (!isSuccessfulAPIResponse(response)) {
                    addAPIError(response)
                }
            }
        }, [authenticatedAPIs]),
        listPosts: useCallback(async (beforeDate, limit, schoolId, yearGroupId, courseId, classIds, postTypes) => {
            const response = await authenticatedAPIs.call<ListPostsResponse, ListPostsRequest>('POST', 'list-posts', { beforeDate: beforeDate ?? undefined, limit, schoolId, yearGroupId, courseId, classIds, postTypes })
            if (isSuccessfulAPIResponse(response)) {
                return response.body
            } else {
                addAPIError(response)
                return null
            }
        }, [authenticatedAPIs]),
        getAttachmentLink: useCallback(async (schoolId, postId, attachmentId, individualCopyOwnerId) => {
            const response = await authenticatedAPIs.call<AttachmentLinkResponse, AttachmentLinkRequest>('POST', 'attachment-link', { schoolId, postId, attachmentId, individualCopyOwnerId })
            if (isSuccessfulAPIResponse(response)) {
                return response.body.link
            } else {
                addAPIError(response)
                return null
            }
        }, [authenticatedAPIs]),
        getPost: useCallback(async (postId, schoolId, yearGroupId, courseId, classIds) => {
            const response = await authenticatedAPIs.call<GetPostResponse, GetPostRequest>('POST', 'post', { postId, schoolId, yearGroupId, courseId, classIds })
            if (isSuccessfulAPIResponse(response)) {
                return response.body.post
            } else {
                addAPIError(response)
                return null
            }
        }, [authenticatedAPIs]),
        addAttachmentToSubmission: useCallback(async (schoolId, postId, attachment) => {
            const googleAccessToken = await getGoogleAccessToken()
            if (!googleAccessToken) {
                addError('Google access token not found')
                return null
            }
            const response = await authenticatedAPIs.call<AddAttachmentToSubmissionResponse, AddAttachmentToSubmissionRequest>('POST', 'add-attachment-to-submission', { schoolId, postId, attachment, googleAccessToken })
            if (isSuccessfulAPIResponse(response)) {
                return response.body.attachmentId
            } else {
                addAPIError(response)
                return null
            }
        }, [authenticatedAPIs, getGoogleAccessToken, addError]),
        submitAssignment: useCallback(async (schoolId, postId) => {
            const response = await authenticatedAPIs.call<SubmitAssignmentResponse, SubmitAssignmentRequest>('POST', 'submit-assignment', { schoolId, postId })
            if (isSuccessfulAPIResponse(response) && response.body.success) {
                return true
            } else {
                addAPIError(response)
                return false
            }
        }, [authenticatedAPIs, addError]),
        recordMarks: useCallback(async (schoolId, postId, studentId, marks, feedback) => {
            const response = await authenticatedAPIs.call<RecordMarksResponse, RecordMarksRequest>('POST', 'record-marks', { schoolId, postId, studentUserId: studentId, marks, feedback })
            if (isSuccessfulAPIResponse(response) && response.body.success) {
                return true
            } else {
                addAPIError(response)
                return false
            }
        }, [authenticatedAPIs, addError]),
        addComment: useCallback(async (schoolId, postId, comment) => {
            const response = await authenticatedAPIs.call<AddCommentResponse, AddCommentRequest>('POST', 'add-comment', { schoolId, postId, comment })
            if (isSuccessfulAPIResponse(response)) {
                return response.body.id
            } else {
                addAPIError(response)
                return null
            }
        }, [authenticatedAPIs]),
        deleteComment: useCallback(async (schoolId, postId, commentId) => {
            const response = await authenticatedAPIs.call<DeleteCommentResponse, DeleteCommentRequest>('POST', 'delete-comment', { schoolId, postId, commentId })
            if (!isSuccessfulAPIResponse(response)) {
                addAPIError(response)
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
            setSchool(null)
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

export function getVisibleClassIds(school: SchoolInfo, yearGroupId: string, courseId: string): string[] {
    return school.yearGroups.find(yearGroup => yearGroup.id === yearGroupId)?.courses.find(course => course.id === courseId)?.classes.map(cls => cls.id) ?? []
}
