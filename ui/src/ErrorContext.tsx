import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { APIResponse, isFailedAPIResponse } from "./api";

export interface ErrorContextValue {
    errors: string[],
    addError: (error: string) => void,
    addAPIError: (error: APIResponse<unknown>) => void,
}

const errorContext = createContext<ErrorContextValue>({
    errors: [],
    addError: () => { },
    addAPIError: () => { },
})

export default function ErrorContextProvider({ children }: { children: ReactNode }) {
    const [errors, setErrors] = useState<string[]>([])

    const addError = useCallback((error: string) => {
        console.error(error)
        setErrors(errors => [...errors, error])
    }, [])
    return <errorContext.Provider value={{
        errors,
        addError,
        addAPIError: response => {
            if (isFailedAPIResponse(response)) {
                addError(`Error ${response.statusCode} from API: ${response.error}`)
            } else {
                addError(`Unexpected response from API: ${JSON.stringify(response)}`)
            }
        }
    }}>
        {children}
    </errorContext.Provider>
}

export const useError = () => useContext(errorContext)
