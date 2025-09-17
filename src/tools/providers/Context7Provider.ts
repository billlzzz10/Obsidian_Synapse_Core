// src/tools/providers/Context7Provider.ts

// These imports are based on the user's provided snippet.
// In a real environment, they would need to be installed via npm.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export class Context7Provider {
    private client: Client;
    private isConnected = false;

    constructor() {
        this.client = new Client({
            name: "Blink-Note-Obsidian-Plugin",
            version: "0.1.0"
        });
    }

    /**
     * Connects to the Context7 MCP server.
     * This must be called before any tools can be executed.
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            console.log("Context7 client is already connected.");
            return;
        }

        try {
            // Construct server URL with authentication, as shown in the user's example.
            // Using a placeholder for the actual API key.
            const url = new URL("https://server.smithery.ai/@upstash/context7-mcp/mcp");
            const apiKey = "YOUR_API_KEY_HERE"; // This should come from settings.
            url.searchParams.set("api_key", apiKey);
            const serverUrl = url.toString();

            const transport = new StreamableHTTPClientTransport(serverUrl);
            await this.client.connect(transport);

            this.isConnected = true;
            console.log("Successfully connected to Context7 MCP server.");

            // For debugging, let's list the available tools upon connection.
            const tools = await this.client.listTools();
            console.log(`[Context7] Available tools: ${tools.map(t => t.name).join(", ")}`);

        } catch (error) {
            console.error("Failed to connect to Context7 MCP server:", error);
            this.isConnected = false;
        }
    }

    /**
     * Executes a tool by calling the remote MCP server.
     * @param toolName The name of the tool to execute (e.g., "resolve-library-id").
     * @param params The parameters for the tool.
     * @returns The result from the tool execution.
     */
    async execute(toolName: string, params: Record<string, any>): Promise<any> {
        if (!this.isConnected) {
            // Attempt to connect automatically if not already connected.
            console.log("Client not connected. Attempting to connect now...");
            await this.connect();
            if (!this.isConnected) {
                 throw new Error("Cannot execute tool: Context7 client is not connected.");
            }
        }

        console.log(`[Context7] Executing tool "${toolName}" with params:`, params);

        try {
            const result = await this.client.callTool(toolName, params);
            console.log(`[Context7] Received result for "${toolName}":`, result);
            return result;
        } catch (error) {
            console.error(`[Context7] Error executing tool "${toolName}":`, error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.client.disconnect();
            this.isConnected = false;
            console.log("Disconnected from Context7 MCP server.");
        }
    }
}
