import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SchoolInfo } from "../../data/school";
import { isSuccessfulAPIResponse, useAuthenticatedAPIs } from "./api";
import { SchoolInfoResponse, VisibleSchoolsResponse } from "../../data/api";
import { useUser } from "./UserContext";
import { useError } from "./ErrorContext";

export interface DataContextValue {
    schools: {
        name: string
        id: string
    }[]
    getSchoolInfo(schoolId: string, refreshCache?: boolean): Promise<SchoolInfo | null>
    createSchool: (name: string) => Promise<void>
}

const DataContext = createContext<DataContextValue>({
    schools: [],
    getSchoolInfo: async () => null,
    createSchool: async () => { }
})

export function DataContextProvider({ children }: { children: React.ReactNode }) {
    const { addAPIError } = useError()

    const { loggedIn } = useUser()

    const authenticatedAPIs = useAuthenticatedAPIs()

    const [schools, setSchools] = useState<DataContextValue['schools']>([])

    const updateVisibleSchoolList = async () => {
        const response = await authenticatedAPIs.call<VisibleSchoolsResponse>('GET', 'visible-schools', undefined)
        if (isSuccessfulAPIResponse(response)) {
            setSchools(response.body.schools)
        } else {
            addAPIError(response)
        }
    }

    useEffect(() => {
        if (loggedIn) {
            updateVisibleSchoolList()
        }
    }, [loggedIn])

    const [schoolInfos, setSchoolInfos] = useState<{ [schoolId: string]: SchoolInfo }>({})

    return <DataContext.Provider value={{
        schools,
        getSchoolInfo: useCallback(async (schoolId, refreshCache) => {
            if (!schoolInfos[schoolId] || refreshCache) {
                const response = await authenticatedAPIs.call<SchoolInfoResponse>('GET', 'school-info', undefined, { id: schoolId })
                if (isSuccessfulAPIResponse(response)) {
                    setSchoolInfos(schoolInfos => ({
                        ...schoolInfos,
                        [schoolId]: response.body.school
                    }))
                } else {
                    addAPIError(response)
                    return null
                }
            }
            return schoolInfos[schoolId]
        }, [authenticatedAPIs, schoolInfos]),
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

export function useSchool(schoolId: string) {
    const { getSchoolInfo } = useData()
    const [school, setSchool] = useState<SchoolInfo | null>(null)

    useEffect(() => {
        getSchoolInfo(schoolId).then(setSchool)
    }, [getSchoolInfo, schoolId])

    return school
}
