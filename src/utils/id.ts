const FALLBACK_RANDOM_CHARS = 8;

function randomString(): string {
    return Math.random().toString(36).slice(2, 2 + FALLBACK_RANDOM_CHARS);
}

/**
 * Generates a reasonably unique identifier that is stable across runtimes
 * without requiring external dependencies. When available it uses
 * `crypto.randomUUID` for high quality randomness and falls back to a
 * timestamp-based id.
 */
export function createId(prefix: string): string {
    const cryptoApi = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
        return `${prefix}-${cryptoApi.randomUUID()}`;
    }

    const timestamp = Date.now().toString(36);
    return `${prefix}-${timestamp}-${randomString()}`;
}
