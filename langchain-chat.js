import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

// Function to load context from file
async function loadContext(contextFilePath) {
  try {
    const fileContent = await fs.readFile(contextFilePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading context file:', error.message);
    console.log('Using default context instead.');
    return {
      projectInfo: {
        name: "Default Project",
        version: "1.0.0",
        environment: "development"
      },
      systemInstructions: "You are an AI assistant. Please help the user with their queries."
    };
  }
}

// Function to generate system message from context
function generateSystemMessage(context) {
  // Use the system instructions from context if available
  if (context.systemInstructions) {
    return context.systemInstructions + '\n\nProject Context:\n' +
           JSON.stringify(context, null, 2);
  }

  // Generate a default system message using available context
  return `You are an AI assistant with access to the following context:
${JSON.stringify(context, null, 2)}

Please use this context when providing assistance and ensure all operations comply with any specified rules.`;
}

async function createChatInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function setupAgent() {
  const client = new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",

    mcpServers: {
      fetch: {
        transport: "stdio",
        command: "uvx",
        args: ["mcp-server-fetch"],
        restart: {
          enabled: true,
          maxAttempts: 3,
          delayMs: 1000,
        },
      },

      filesystem: {
        transport: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/Users/C5395253/Desktop/tester/langchain"],
      },

      graph: {
        transport: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-memory"],
      }
    },
  });

  const tools = await client.getTools();

  const model = new ChatAnthropic({
    modelName: "claude-3-5-sonnet-20240620",
    temperature: 0,
  });

  const agent = createReactAgent({
    llm: model,
    tools,
  });

  return { agent, client };
}

async function enrichMessageWithContext(message, context) {
  return {
    content: message,
    globalContext: context,
  };
}

async function chatLoop() {
  console.log("\nInitializing chat system...");
  
  let agent, client, rl, GLOBAL_CONTEXT;
  try {
    // Load context from file
    const contextPath = path.join(process.cwd(), 'agent-context.json');
    GLOBAL_CONTEXT = await loadContext(contextPath);
    console.log('\nContext loaded successfully from:', contextPath);

    // Generate system message from context
    const SYSTEM_MESSAGE = generateSystemMessage(GLOBAL_CONTEXT);

    ({ agent, client } = await setupAgent());
    rl = await createChatInterface();
    
    console.log("\n=== Chat initialized successfully ===");
    console.log("Type 'exit' or 'quit' to end the conversation");
    console.log("Type 'help' to see available commands");
    console.log("Type 'context' to see current global context");
    console.log("Type 'reload-context' to reload context from file");
    console.log("=====================================\n");

    // Initialize conversation history with system message
    const conversationHistory = [
      { role: "system", content: SYSTEM_MESSAGE }
    ];

    while (true) {
      const userInput = await new Promise((resolve) => {
        rl.question('You: ', resolve);
      });

      // Handle exit commands
      if (['exit', 'quit'].includes(userInput.toLowerCase())) {
        console.log('\nEnding chat session...');
        break;
      }

      // Handle help command
      if (userInput.toLowerCase() === 'help') {
        console.log('\nAvailable commands:');
        console.log('- exit/quit: End the chat session');
        console.log('- help: Show this help message');
        console.log('- clear: Clear the conversation history');
        console.log('- context: Show current global context');
        console.log('- reload-context: Reload context from file');
        continue;
      }

      // Handle context command
      if (userInput.toLowerCase() === 'context') {
        console.log('\nCurrent Global Context:');
        console.log(JSON.stringify(GLOBAL_CONTEXT, null, 2));
        continue;
      }

      // Handle reload-context command
      if (userInput.toLowerCase() === 'reload-context') {
        GLOBAL_CONTEXT = await loadContext(contextPath);
        const newSystemMessage = generateSystemMessage(GLOBAL_CONTEXT);
        // Clear history and add new system message
        conversationHistory.length = 0;
        conversationHistory.push({ role: "system", content: newSystemMessage });
        console.log('\nContext reloaded successfully.');
        continue;
      }

      // Handle clear command
      if (userInput.toLowerCase() === 'clear') {
        conversationHistory.length = 0;
        // Restore system message after clearing
        conversationHistory.push({ role: "system", content: SYSTEM_MESSAGE });
        console.log('\nConversation history cleared.');
        continue;
      }

      try {
        // Enrich user message with context
        const enrichedMessage = await enrichMessageWithContext(userInput, GLOBAL_CONTEXT);
        
        // Add user message to history
        conversationHistory.push({ 
          role: "user", 
          content: JSON.stringify(enrichedMessage)
        });

        // Get agent's response
        const response = await agent.invoke({
          messages: conversationHistory,
        });

        // Add assistant's response to history
        conversationHistory.push(response.messages[response.messages.length - 1]);

        // Display the response
        console.log('\nAssistant:', response.messages[response.messages.length - 1].content, '\n');

      } catch (error) {
        console.error('\nError processing your request:', error.message);
        console.log('Please try again with a different query.\n');
      }
    }
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    // Cleanup
    if (rl) rl.close();
    if (client) await client.close();
    console.log('\nChat session ended. Goodbye!');
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Cleaning up...');
  process.exit(0);
});

// Start the chat loop
chatLoop().catch(console.error);