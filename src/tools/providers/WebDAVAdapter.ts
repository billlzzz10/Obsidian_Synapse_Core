// src/tools/providers/WebDAVAdapter.ts

import { RemoteAdapter } from './RemoteAdapter';

/**
 * An implementation of the RemoteAdapter for interacting with a WebDAV server.
 */
// Full implementation will follow the details in Overview-2.md
export class WebDAVAdapter implements RemoteAdapter {
    pull(since: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    push(change: any): Promise<any> {
        throw new Error('Method not implemented.');
    }
    stat(pathOrId: string): Promise<any | null> {
        throw new Error('Method not implemented.');
    }
    // ...
}
