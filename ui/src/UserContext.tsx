import { useGoogleLogin } from "@react-oauth/google";
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { callUnauthenticatedApi } from "./api";
import { GoogleAuthenticateRequest, GoogleRefreshRequest, GoogleTokenResponse } from "../../data/api"
import { jwtDecode } from "jwt-decode";

export interface UserContextValue {
    login: () => void,
    getIdToken: () => Promise<string | null>,
    loggedIn: boolean,
    loggingIn: boolean,
    name?: string,
    profile_picture_url?: string,
}

const USER_CONTEXT: React.Context<UserContextValue> = React.createContext({
    login: () => { },
    getIdToken: async () => null as string | null, // Why?
    loggedIn: false as boolean,
    loggingIn: false as boolean,
})

const LOCAL_STORAGE_TOKENS_KEY = 'google_tokens'

export function UserContextProvider({ children }: {
    children: ReactNode
}) {
    const [googleTokens, setGoogleTokens] = useState<GoogleTokenResponse | undefined>(undefined)

    const [loggingIn, setLoggingIn] = useState(false)

    useEffect(() => {
        const tokens = localStorage.getItem(LOCAL_STORAGE_TOKENS_KEY)
        if (tokens !== null) {
            try {
                setGoogleTokens(JSON.parse(tokens))
            } catch (e) { }
        }
    }, [])

    useEffect(() => {
        if (googleTokens !== undefined) {
            localStorage.setItem(LOCAL_STORAGE_TOKENS_KEY, JSON.stringify(googleTokens))
        }
    }, [googleTokens])

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            const response = await callUnauthenticatedApi<GoogleTokenResponse, GoogleAuthenticateRequest>("POST", 'google-authenticate', {
                code: tokenResponse.code
            })
            setGoogleTokens(response)
            setLoggingIn(false)
        },
        flow: 'auth-code'
    })

    const idToken = useMemo(() => googleTokens ? jwtDecode(googleTokens.idToken) : null, [googleTokens?.idToken])

    const getIdToken: () => Promise<string | null> = useCallback(async () => {
        if (googleTokens) {
            if (Date.now() >= googleTokens.expiryDate) {
                const newTokens = await callUnauthenticatedApi<GoogleTokenResponse, GoogleRefreshRequest>("POST", 'google-refresh', {
                    refreshToken: googleTokens.refreshToken
                })
                setGoogleTokens(newTokens)
                return (await newTokens).idToken
            } else {
                return googleTokens.idToken
            }
        } else {
            return null
        }
    }, [googleTokens])

    return <USER_CONTEXT.Provider value={{
        login: () => {
            if (!loggingIn) {
                setLoggingIn(true)
                login()
            }
        },
        getIdToken,
        loggedIn: !!googleTokens,
        loggingIn,
        name: (idToken as any)?.name,
        profile_picture_url: (idToken as any)?.picture,
    }}>
        {children}
    </USER_CONTEXT.Provider>
}

export const useUser = () => React.useContext(USER_CONTEXT)
