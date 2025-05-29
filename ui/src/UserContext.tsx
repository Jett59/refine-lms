import { useGoogleLogin } from "@react-oauth/google";
import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { APIResponse, callUnauthenticatedApi, isSuccessfulAPIResponse } from "./api";
import { GoogleAuthenticateRequest, GoogleRefreshRequest, GoogleRevokeRequest, GoogleRevokeResponse, GoogleTokenResponse } from "../../data/api"
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useError } from "./ErrorContext";

export interface UserContextValue {
    login: () => void
    logOut: () => void
    getIdToken: () => Promise<string | null>
    getGoogleAccessToken: () => Promise<string | null>
    loggedIn: boolean
    loggingIn: boolean
    name?: string
    profile_picture_url?: string
    userId?: string
}

const USER_CONTEXT: React.Context<UserContextValue> = React.createContext({
    login: () => { },
    logOut: () => { },
    getIdToken: async () => null as string | null, // Why?
    getGoogleAccessToken: async () => null as string | null,
    loggedIn: false as boolean,
    loggingIn: false as boolean,
})

const LOCAL_STORAGE_TOKENS_KEY = 'google_tokens'

const SCOPES = ['openid', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/drive.file']

export function UserContextProvider({ children }: {
    children: ReactNode
}) {
    const { addAPIError } = useError()

    const [googleTokens, setGoogleTokens] = useState<GoogleTokenResponse | undefined>(undefined)

    const [loggingIn, setLoggingIn] = useState(false)

    useEffect(() => {
        const tokens = localStorage.getItem(LOCAL_STORAGE_TOKENS_KEY)
        if (tokens !== null) {
            try {
                const parsedTokens: GoogleTokenResponse = JSON.parse(tokens)
                if (parsedTokens.scopes && SCOPES.every(scope => parsedTokens.scopes.includes(scope))) {
                    setGoogleTokens(parsedTokens)
                }
            } catch (e) {
                console.error(`Invalid google token structure: ${tokens}`)
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

    const loginHooks = useRef<((tokens: GoogleTokenResponse) => void)[]>([])

    const handleLoggedOut = async (apiResponse: APIResponse<unknown>): Promise<GoogleTokenResponse | null> => {
        console.log(apiResponse)
        setHandlingLogout(true)
        return await new Promise(resolve => {
            loginHooks.current.push(resolve)
        })
    }

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            const response = await callUnauthenticatedApi<GoogleTokenResponse, GoogleAuthenticateRequest>("POST", 'google-authenticate', {
                code: tokenResponse.code
            })
            if (isSuccessfulAPIResponse(response)) {
                setGoogleTokens(response.body)
                loginHooks.current.forEach(hook => hook(response.body))
                loginHooks.current = []
                setHandlingLogout(false)
            } else {
                addAPIError('log in', response)
            }
            setLoggingIn(false)
        },
        scope: SCOPES.join(' '),
        flow: 'auth-code'
    })

    const getTokens: () => Promise<GoogleTokenResponse | null> = useCallback(async () => {
        if (googleTokens) {
            if (Date.now() >= googleTokens.expiryDate) {
                const response = await callUnauthenticatedApi<GoogleTokenResponse, GoogleRefreshRequest>("POST", 'google-refresh', {
                    refreshToken: googleTokens.refreshToken
                })
                if (isSuccessfulAPIResponse(response) && response.body.accessToken) {
                    setGoogleTokens({ ...response.body, userInfo: googleTokens.userInfo })
                    return response.body
                } else {
                    return await handleLoggedOut(response)
                }
            } else {
                return googleTokens
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
        logOut: async () => {
            const tokens = await getTokens()
            if (tokens) {
                const response = await callUnauthenticatedApi<GoogleRevokeResponse, GoogleRevokeRequest>("POST", 'google-revoke', {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken
                })
                if (isSuccessfulAPIResponse(response) && response.body.success) {
                    removeTokens()
                } else {
                    addAPIError('log out', response)
                }
            }
        },
        getIdToken: useCallback(async () => {
            const tokens = await getTokens()
            return tokens?.idToken ?? null
        }, [getTokens]),
        getGoogleAccessToken: useCallback(async () => {
            const tokens = await getTokens()
            return tokens?.accessToken ?? null
        }, [getTokens]),
        loggedIn: !!googleTokens,
        loggingIn,
        name: googleTokens?.userInfo?.name,
        profile_picture_url: googleTokens?.userInfo?.picture,
        userId: googleTokens?.userInfo?.id
    }}>
        {children}
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
