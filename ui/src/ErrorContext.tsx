import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { APIResponse, isFailedAPIResponse } from "./api";
import { AttachmentPreparationError } from "../../data/api";

export interface Error {
    displayMessage: string //  User-friendly message to display
    detailMessage: string //  Detailed message for developers
    statusCode?: number
    errorBody?: string
    deleteOnView: boolean
}

export interface ErrorContextValue {
    errors: Error[],
    addError: (error: Error) => void,
    addAPIError: (apiDisplayTitle: string, error: APIResponse<unknown>, deleteOnView?: boolean) => void,
    deleteDeleteOnViewErrors: () => void
    addAttachmentPreparationError: (error: AttachmentPreparationError) => void
}

const errorContext = createContext<ErrorContextValue>({
    errors: [],
    addError: () => { },
    addAPIError: () => { },
    deleteDeleteOnViewErrors: () => { },
    addAttachmentPreparationError: () => { },
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
        addAPIError: (apiDisplayTitle, response, deleteOnView) => {
            if (isFailedAPIResponse(response)) {
                addError({
                    displayMessage: `Failed to ${apiDisplayTitle}`,
                    detailMessage: `API call failed with status ${response.statusCode}: ${response.error || 'Unknown error'}`,
                    statusCode: response.statusCode,
                    errorBody: response.error,
                    deleteOnView: Boolean(deleteOnView)
                })
            } else {
                addError({
                    displayMessage: `Failed to ${apiDisplayTitle}`,
                    detailMessage: `API call failed with unknown error`,
                    statusCode: response.statusCode,
                    errorBody: JSON.stringify(response),
                    deleteOnView: Boolean(deleteOnView)
                })
            }
        },
        deleteDeleteOnViewErrors: () => setErrors(errors => errors.filter(error => !error.deleteOnView)),
        addAttachmentPreparationError: error => addError({
            displayMessage: `Failed to attach ${error.attachmentTitle}. Make sure you have edit access.`,
            detailMessage: error.message,
            errorBody: JSON.stringify(error),
            deleteOnView: true
        })
    }}>
        {children}
    </errorContext.Provider>
}

export const useError = () => useContext(errorContext)
