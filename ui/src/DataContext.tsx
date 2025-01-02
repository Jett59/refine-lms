import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SchoolInfo } from "../../data/school";
import { isSuccessfulAPIResponse, useAuthenticatedAPIs } from "./api";
import { RelevantSchoolInfoResponse, VisibleSchoolsResponse } from "../../data/api";
import { useUser } from "./UserContext";
import { useError } from "./ErrorContext";

export interface DataContextValue {
    schools: {
        name: string
        id: string
    }[]
    getRelevantSchoolInfo(schoolId: string, refreshCache?: boolean): Promise<SchoolInfo | null>
    createSchool: (name: string) => Promise<void>
}

const DataContext = createContext<DataContextValue>({
    schools: [],
    getRelevantSchoolInfo: async () => null,
    createSchool: async () => { }
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

    return <DataContext.Provider value={{
        schools,
        getRelevantSchoolInfo: useCallback(async (schoolId, refreshCache) => {
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
        }, [authenticatedAPIs, relevantSchoolInfos]),
        createSchool: useCallback(async (name) => {
            const response = await authenticatedAPIs.call('POST', 'create-school', { name })
            if (!isSuccessfulAPIResponse(response)) {
                addAPIError(response)
            } else {
                updateVisibleSchoolList()
            }
        }, [authenticatedAPIs])
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
