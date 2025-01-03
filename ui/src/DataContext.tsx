import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SchoolInfo } from "../../data/school";
import { isSuccessfulAPIResponse, useAuthenticatedAPIs } from "./api";
import { CreateSchoolRequest, CreateSchoolResponse, CreateYearGroupRequest, CreateYearGroupResponse, RelevantSchoolInfoResponse, VisibleSchoolsResponse } from "../../data/api";
import { useUser } from "./UserContext";
import { useError } from "./ErrorContext";

export interface DataContextValue {
    schools: {
        name: string
        id: string
    }[]
    getRelevantSchoolInfo(schoolId: string, refreshCache?: boolean): Promise<SchoolInfo | null>
    createSchool: (name: string) => Promise<void>
    createYearGroup: (schoolId: string, name: string) => Promise<void>
}

const DataContext = createContext<DataContextValue>({
    schools: [],
    getRelevantSchoolInfo: async () => null,
    createSchool: async () => { },
    createYearGroup: async () => { }
})

export function DataContextProvider({ children }: { children: React.ReactNode }) {
    const { addAPIError } = useError()

    const { loggedIn } = useUser()

    const authenticatedAPIs = useAuthenticatedAPIs()

    const [schools, setSchools] = useState<DataContextValue['schools']>([])

    const updateVisibleSchoolList = useCallback(async () => {
        const response = await authenticatedAPIs.call<VisibleSchoolsResponse>('GET', 'visible-schools', undefined)
        if (isSuccessfulAPIResponse(response)) {
            setSchools(response.body.schools)
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
        schools,
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
        }, [authenticatedAPIs, getRelevantSchoolInfo])
    }}>
        {children}
    </DataContext.Provider>
}

export const useData = () => useContext(DataContext)

export function useRelevantSchoolInfo(schoolId: string): SchoolInfo | null {
    const { getRelevantSchoolInfo } = useData()
    const [school, setSchool] = useState<SchoolInfo | null>(null)

    useEffect(() => {
        getRelevantSchoolInfo(schoolId).then(setSchool)
    }, [getRelevantSchoolInfo, schoolId])

    return school
}

export function useRole(school: SchoolInfo | null): 'administrator' | 'teacher' | 'student' | null {
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
