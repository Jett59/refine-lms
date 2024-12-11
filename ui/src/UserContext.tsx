import { useGoogleLogin } from "@react-oauth/google";
import React, { ReactNode, useEffect, useState } from "react";
import { callApi } from "./api";

export interface UserContextValue {
    login: () => void,
    token?: string,
    name?: string,
    profile_picture_url?: string,
}

const USER_CONTEXT: React.Context<UserContextValue> = React.createContext({
    login: () => { },
})

const LOCAL_STORAGE_TOKEN_KEY = 'access_token'

export function UserContextProvider({ children }: {
    children: ReactNode
}) {
    const [tokenString, setTokenString] = useState<string | undefined>(undefined)

    useEffect(() => {
        const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)
        if (token !== null) {
            setTokenString(token)
        }
    }, [])

    useEffect(() => {
        if (tokenString !== undefined) {
            localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, tokenString)
        }
    }, [tokenString])

    const login = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            callApi<any>('', "POST", 'google-authenticate', {
                code: tokenResponse.code
            }).then(console.log)
        },
        flow: 'auth-code'
    })
    return <USER_CONTEXT.Provider value={{
        login
    }}>
        {children}
    </USER_CONTEXT.Provider>
}

export const useUser = () => React.useContext(USER_CONTEXT)
