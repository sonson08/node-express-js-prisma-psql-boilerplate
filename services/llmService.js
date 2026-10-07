const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const LlmLog = require('../models/llmLog');

// Claude 3 Haiku often returned nested tool input as a JSON-encoded string, breaking quiz generation.
// Haiku 4.5 has no apac inference profile, so the global one is used.
const MODEL_ID = 'global.anthropic.claude-haiku-4-5-20251001-v1:0';
const client = new BedrockRuntimeClient({ region: 'ap-southeast-1' });

const invoke = async (prompt) => {
  const response = await client.send(new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
  }));
  const text = response.output.message.content[0].text;
  await LlmLog.create(prompt, text);
  return text;
};

// Forcing a tool call makes Bedrock return the tool input as an already-parsed object,
// which avoids the malformed JSON the model sometimes writes in free-text replies.
const invokeTool = async (prompt, tool) => {
  const response = await client.send(new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    toolConfig: {
      tools: [{ toolSpec: { name: tool.name, description: tool.description, inputSchema: { json: tool.inputSchema } } }],
      toolChoice: { tool: { name: tool.name } },
    },
  }));
  const toolUse = response.output.message.content.find((block) => block.toolUse);
  const input = toolUse ? toolUse.toolUse.input : null;
  await LlmLog.create(prompt, JSON.stringify(input));
  if (!input) throw new Error('LLM did not return a tool call');
  return input;
};

module.exports = { invoke: invoke, invokeTool: invokeTool };
