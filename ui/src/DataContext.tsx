import { createContext, useContext, useEffect, useState } from "react";
import { SchoolInfo } from "../../data/school";
import { isSuccessfulAPIResponse, useAuthenticatedAPIs } from "./api";
import { VisibleSchoolsResponse } from "../../data/api";
import { useUser } from "./UserContext";
import { useError } from "./ErrorContext";

export interface DataContextValue {
    schools: {
        name: string
        id: string
    }[]
    getSchoolInfo(schoolId: string, refreshCache?: boolean): SchoolInfo | null
}

const DataContext = createContext<DataContextValue>({
    schools: [],
    getSchoolInfo: () => null
})

export function DataContextProvider({ children }: { children: React.ReactNode }) {
    const { addAPIError } = useError()

    const { loggedIn } = useUser()

    const authenticatedAPIs = useAuthenticatedAPIs()

    const [schools, setSchools] = useState<DataContextValue['schools']>([])

    useEffect(() => {
        if (loggedIn) {
            (async () => {
                const response = await authenticatedAPIs.call<VisibleSchoolsResponse>('GET', 'visible-schools', undefined)
                if (isSuccessfulAPIResponse(response)) {
                    setSchools(response.body.schools)
                } else {
                    addAPIError(response)
                }
            })()
        }
    }, [loggedIn])

    return <DataContext.Provider value={{
        schools,
        getSchoolInfo: () => null
    }}>
        {children}
    </DataContext.Provider>
}

export const useData = () => useContext(DataContext)
