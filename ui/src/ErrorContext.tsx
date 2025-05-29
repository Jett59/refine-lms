import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { APIResponse, isFailedAPIResponse } from "./api";

export interface Error {
    displayMessage: string //  User-friendly message to display
    detailMessage: string //  Detailed message for developers
    statusCode?: number
    errorBody?: any
}

export interface ErrorContextValue {
    errors: Error[],
    addError: (error: Error) => void,
    addAPIError: (apiDisplayTitle: string, error: APIResponse<unknown>) => void,
}

const errorContext = createContext<ErrorContextValue>({
    errors: [],
    addError: () => { },
    addAPIError: () => { },
})

export default function ErrorContextProvider({ children }: { children: ReactNode }) {
    const [errors, setErrors] = useState<Error[]>([])

    const addError = useCallback((error: Error) => {
        console.error(error)
        setErrors(errors => [...errors, error])
    }, [])
    return <errorContext.Provider value={{
        errors,
        addError,
        addAPIError: (apiDisplayTitle, response) => {
            if (isFailedAPIResponse(response)) {
                addError({
                    displayMessage: `Failed to ${apiDisplayTitle}`,
                    detailMessage: `API call failed with status ${response.statusCode}: ${response.error || 'Unknown error'}`,
                    statusCode: response.statusCode,
                    errorBody: response.error
                })
            } else {
                addError({
                    displayMessage: `Failed to ${apiDisplayTitle}`,
                    detailMessage: `API call failed with unknown error`,
                    statusCode: response.statusCode,
                    errorBody: response
                })
            }
        }
    }}>
        {children}
    </errorContext.Provider>
}

export const useError = () => useContext(errorContext)
