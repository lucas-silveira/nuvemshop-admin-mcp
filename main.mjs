import Anthropic from "@anthropic-ai/sdk";
import express from "express";

const anthropic = new Anthropic();

const messagesStorage = [];
const accessToken = "123"
const storeLanguage = "pt_BR"

const app = express();
app.use(express.json());

app.post("/api/v1/chat", async (req, res) => {
  const { message } = req.body;
  const response = await processMessage(message);

  console.info(response, 'Response')

  return res.status(201).json({ response });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

function makePrompt(userMessage) {
  return {
    role: "user",
    content: `
    You are an AI support agent for Nuvemshop, a SaaS platform that allows entrepreneurs to create online stores (e-commerce). Your role is to assist store owners with various operations within their store's admin panel.

    Check the tools available in the nuvem-admin-mcp server. If you don't find anything, below are some tools available to help the store owner:
    
    <nuvem_admin_mcp_functions>
    add_product(name, access_token)
    </nuvem_admin_mcp_functions>

    Noticed that, whanever you call a MCP tool, you need to send the access token as specified by the function interface. Here is the access token you need to use: "${accessToken}".
    
    When communicating with store owners, maintain a friendly and professional tone. Be helpful and try to understand the intentions behind each conversation session. This way, you can suggest solutions and consult information through the MCP server as needed.
    
    Here's how to handle queries:
    
    1. Carefully read the store owner's message.
    2. Identify the main request or question.
    3. If the query can be addressed using the available MCP functions, use them to gather the necessary information or perform the requested action.
    4. If you need to use an MCP function, format your call like this: <function_call>function_name(parameters)</function_call>
    5. Wait for the <function_result> before proceeding with your response.
    6. Formulate a clear and helpful response based on the information you have.
    7. Before calling any MCP function, always ask for confirmation from the store owner. Never invoke a MCP function without asking for confirmation.
    
    If you're unsure about a topic or don't have the answer to a question, politely inform the store owner that you don't have that information and suggest they contact Nuvemshop's support channel.
    
    Your final response should be formatted as follows:
    1. Any necessary function calls (if applicable)
    2. Your response to the store owner, written in the store's language that is ${storeLanguage} (ISO 639-1 code)
    
    Remember, your output should only include function calls (if needed) and your final response to the store owner. Do not include your thought process or any other text outside the specified format. Always wait for the <function_result> before proceeding with your response.

    If some error occurs, inform the store owner that you couldn't perform the action and try to find another solution or suggest they contact Nuvemshop's support channel.
    
    Now, please assist the store owner with their query:
    
    <store_owner_message>
    ${userMessage}
    </store_owner_message>
    `,
  }
}

async function processMessage(input) {
  if (!messagesStorage.length) messagesStorage.push(makePrompt(input));
  else messagesStorage.push({
    role: "user",
    content: input,
  });

  console.info(messagesStorage, 'Content to send')

  const response = await anthropic.beta.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: messagesStorage,
    mcp_servers: [
      {
        type: "url",
        url: "https://d975-67-159-239-66.ngrok-free.app/sse",
        name: "nuvem-admin-mcp",
        // authorization_token: "YOUR_TOKEN",
      },
    ],
    betas: ["mcp-client-2025-04-04"],
  });

  messagesStorage.push({
    role: response.role,
    content: response.content,
  });

  return response.content.find(item => item.type === 'text')?.text ?? null;
}