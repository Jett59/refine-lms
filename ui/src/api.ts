export async function callUnauthenticatedApi<Res, Req = undefined>(method: 'GET' | 'POST', path: string, body: Req): Promise<Res> {
    const res = await fetch(`http://localhost:3000/${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
}
