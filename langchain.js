import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import 'dotenv/config'
  

// Create client and connect to server
const client = new MultiServerMCPClient({
  // Global tool configuration options
  // Whether to throw on errors if a tool fails to load (optional, default: true)
  throwOnLoadError: true,
  // Whether to prefix tool names with the server name (optional, default: true)
  prefixToolNameWithServerName: true,
  // Optional additional prefix for tool names (optional, default: "mcp")
  additionalToolNamePrefix: "mcp",

  // Server configuration
  mcpServers: {
    // adds a STDIO connection to a server named "math"
    fetch: {
      transport: "stdio",
      command: "uvx",
      args: ["mcp-server-fetch"],
      // Restart configuration for stdio transport
      restart: {
        enabled: true,
        maxAttempts: 3,
        delayMs: 1000,
      },
    },

    // here's a filesystem server
    filesystem: {
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/Users/C5395253/Desktop/tester/langchain"],
    },

    // SSE transport example with reconnection configuration
    // weather: {
    //   transport: "sse",
    //   url: "https://example.com/mcp-weather",
    //   headers: {
    //     Authorization: "Bearer token123",
    //   },
    //   useNodeEventSource: true,
    //   reconnect: {
    //     enabled: true,
    //     maxAttempts: 5,
    //     delayMs: 2000,
    //   },
    // },
  },
});

const tools = await client.getTools();

// Create an OpenAI model
const model = new ChatAnthropic({
  modelName: "claude-3-5-sonnet-20240620",
  temperature: 0,
});

// Create the React agent
const agent = createReactAgent({
  llm: model,
  tools,
});

// Run the agent
try {
  const mathResponse = await agent.invoke({
    messages: [{ role: "user", content: "What tools are available?" }],
  });
  console.log(mathResponse.messages[1].content);
} catch (error) {
  console.error("Error during agent execution:", error);
  // Tools throw ToolException for tool-specific errors
  if (error.name === "ToolException") {
    console.error("Tool execution failed:", error.message);
  }
}

await client.close();