/**
 * API Request Helper for Tests
 */

export function createMockRequest(body?: any, headers?: Record<string, string>): Request {
    return {
        json: async () => body || {},
        headers: new Headers(headers || {}),
        url: 'http://localhost:3000/api/test',
    } as Request;
}

export function createMockNextRequest(body?: any, headers?: Record<string, string>) {
    return {
        json: async () => body || {},
        headers: new Headers(headers || {}),
        url: 'http://localhost:3000/api/test',
        nextUrl: new URL('http://localhost:3000/api/test'),
    };
}







