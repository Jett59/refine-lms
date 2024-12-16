const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export async function callUnauthenticatedApi<Res, Req = undefined>(method: 'GET' | 'POST', path: string, body: Req): Promise<Res> {
    const res = await fetch(`${API_BASE_URL}/api/${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    })
    return await res.json()
}
