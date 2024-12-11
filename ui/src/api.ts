export async function callApi<T>(token: string, method: 'GET' | 'POST', path: string, body?: any): Promise<T> {
    const res = await fetch(`http://localhost:3000/${path}`, {
        method,
        headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
    return await res.json();
}
