const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const LlmLog = require('../models/llmLog');

const MODEL_ID = 'apac.anthropic.claude-3-haiku-20240307-v1:0';
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

module.exports = { invoke: invoke };
