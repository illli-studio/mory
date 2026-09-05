export interface MoryClientOptions {
    baseUrl?: string;
    token?: string;
}
export interface RememberInput {
    text: string;
    projectId?: string;
    kind?: string;
    metadata?: Record<string, unknown>;
    source?: string;
}
export declare class MoryClient {
    readonly baseUrl: string;
    readonly token: string;
    constructor(options?: MoryClientOptions);
    private request;
    remember(input: RememberInput): Promise<Record<string, unknown>>;
    search(query: string, options?: {
        projectId?: string;
        limit?: number;
    }): Promise<Record<string, unknown>>;
    context(query: string, options?: {
        projectId?: string;
        limit?: number;
    }): Promise<{
        context: string;
        memories: unknown[];
    }>;
    list(options?: {
        projectId?: string;
        limit?: number;
    }): Promise<{
        memories: unknown[];
        total: number;
    }>;
    export(): Promise<{
        schemaVersion: number;
        exportedAt: string;
        memories: unknown[];
    }>;
    import(memories: unknown[]): Promise<{
        addedCount: number;
        duplicateCount: number;
    }>;
    get(id: string): Promise<Record<string, unknown>>;
    update(id: string, input: Partial<RememberInput> & {
        title?: string;
        tags?: string[];
    }): Promise<Record<string, unknown>>;
    forget(id: string): Promise<{
        ok: boolean;
    }>;
}
