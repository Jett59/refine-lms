import { useGoogleLogin } from "@react-oauth/google";
import React, { ReactNode, useCallback, useEffect, useState } from "react";
import { APIResponse, callUnauthenticatedApi, isSuccessfulAPIResponse } from "./api";
import { GoogleAuthenticateRequest, GoogleRefreshRequest, GoogleTokenResponse } from "../../data/api"
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useError } from "./ErrorContext";

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
    const { addAPIError, addError } = useError()

    const [googleTokens, setGoogleTokens] = useState<GoogleTokenResponse | undefined>(undefined)

    const [loggingIn, setLoggingIn] = useState(false)

    useEffect(() => {
        const tokens = localStorage.getItem(LOCAL_STORAGE_TOKENS_KEY)
        if (tokens !== null) {
            try {
                setGoogleTokens(JSON.parse(tokens))
            } catch (e) {
                addError(`Invalid google token structure: ${tokens}`)
            }
        }
    }, [])

    useEffect(() => {
        if (googleTokens !== undefined) {
            localStorage.setItem(LOCAL_STORAGE_TOKENS_KEY, JSON.stringify(googleTokens))
        }
    }, [googleTokens])

const removeTokens = useCallback(() => {
        setGoogleTokens(undefined)
        localStorage.removeItem(LOCAL_STORAGE_TOKENS_KEY)
}, [])

    const [handlingLogout, setHandlingLogout] = useState<boolean>(false)

    // The loginHooks value here should never be read. It should be updated using the setter which provides an up-to-date copy.
    const [_loginHooks, setLoginHooks] = useState<((token: string) => void)[]>([])

    const handleLoggedOut = async (apiResponse: APIResponse<unknown>): Promise<string | null> => {
        console.log(apiResponse)
        setHandlingLogout(true)
        return await new Promise(resolve => {
            setLoginHooks(loginHooks => [...loginHooks, resolve])
        })
    }

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            const response = await callUnauthenticatedApi<GoogleTokenResponse, GoogleAuthenticateRequest>("POST", 'google-authenticate', {
                code: tokenResponse.code
            })
            if (isSuccessfulAPIResponse(response)) {
                setGoogleTokens(response.body)
                setLoginHooks(loginHooks => {
                    loginHooks.forEach(hook => hook(response.body.idToken))
                    return []
                })
                setHandlingLogout(false)
            } else {
                addAPIError(response)
            }
            setLoggingIn(false)
        },
        scope: 'openid profile email',
        flow: 'auth-code'
    })

    const getIdToken: () => Promise<string | null> = useCallback(async () => {
        if (googleTokens) {
            if (Date.now() >= googleTokens.expiryDate) {
                const response = await callUnauthenticatedApi<GoogleTokenResponse, GoogleRefreshRequest>("POST", 'google-refresh', {
                    refreshToken: googleTokens.refreshToken
                })
                if (isSuccessfulAPIResponse(response) && response.body.accessToken) {
                    setGoogleTokens({ ...response.body, userInfo: googleTokens.userInfo })
                    return response.body.idToken
                } else {
                    return await handleLoggedOut(response)
                }
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
        name: googleTokens?.userInfo?.name,
        profile_picture_url: googleTokens?.userInfo?.picture,
    }}>
        {children}
        {/* TODO: Should this go somewhere else? */}
        <Dialog open={handlingLogout}>
            <DialogTitle>Logged out</DialogTitle>
            <DialogContent>
                You have been logged out. Please log in again to continue.
            </DialogContent>
            <DialogActions>
                <Button variant="contained" color='primary' onClick={login}>Log in</Button>
                <Button variant="outlined" color='secondary' onClick={() => {
                    setHandlingLogout(false)
                    removeTokens()
                }}>Stay logged out</Button>
            </DialogActions>
        </Dialog>
    </USER_CONTEXT.Provider>
}

export const useUser = () => React.useContext(USER_CONTEXT)
