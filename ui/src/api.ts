import { useMemo } from "react"
import { useUser } from "./UserContext"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export interface APIResponse<_Res> {
    statusCode: number
    ok: boolean
}

export interface SuccessfulAPIResponse<Res> extends APIResponse<Res> {
    ok: true
    body: Res
}
export interface FailedAPIResponse extends APIResponse<unknown> {
    ok: false
    error: string
}

export function isSuccessfulAPIResponse<Res>(res: APIResponse<Res>): res is SuccessfulAPIResponse<Res> {
    return res.ok
}
export function isFailedAPIResponse(res: APIResponse<unknown>): res is FailedAPIResponse {
    return !res.ok
}

export async function callUnauthenticatedApi<Res, Req = undefined>(method: 'GET' | 'POST', path: string, body: Req): Promise<APIResponse<Res>> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        })
        if (res.ok) {
            return {
                statusCode: res.status,
                ok: true,
                body: await res.json()
            } as SuccessfulAPIResponse<Res>
        } else {
            return {
                statusCode: res.status,
                ok: false,
                error: await res.text()
            } as FailedAPIResponse
        }
    } catch (e: any) {
        return {
            statusCode: -1,
            ok: false,
            error: e.toString?.() ?? JSON.stringify(e)
        } as FailedAPIResponse
    }
}

export class AuthenticatedAPIs {
    constructor (private readonly getIDToken: () => Promise<string | null>) { }

    async call<Res, Req = undefined>(method: 'GET' | 'POST', path: string, body: Req, queryParams?: {[key: string]: string}): Promise<APIResponse<Res>> {
        try {
            const token = await this.getIDToken()
            if (token === null) {
                return {
                    statusCode: -1,
                    ok: false,
                    error: 'Not logged in'
                } as FailedAPIResponse
            }
            const queryString = new URLSearchParams(queryParams).toString()
            const res = await fetch(`${API_BASE_URL}/api/${path}?${queryString}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: body ? JSON.stringify(body) : undefined,
            })
            if (res.ok) {
                return {
                    statusCode: res.status,
                    ok: true,
                    body: await res.json()
                } as SuccessfulAPIResponse<Res>
            } else {
                return {
                    statusCode: res.status,
                    ok: false,
                    error: await res.text()
                } as FailedAPIResponse
            }
        } catch (e: any) {
            return {
                statusCode: -1,
                ok: false,
                error: e.toString?.() ?? JSON.stringify(e)
            } as FailedAPIResponse
        }
    }
}

export function useAuthenticatedAPIs() {
    const {getIdToken} = useUser()
    return useMemo(() => new AuthenticatedAPIs(getIdToken), [getIdToken])
}
