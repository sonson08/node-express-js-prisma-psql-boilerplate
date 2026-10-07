jest.mock('../services/llmService', () => ({ invoke: jest.fn() }));

const llmService = require('../services/llmService');
const summaryService = require('../services/summaryService');

const validSummary = {
  summary: 'Plants turn light into chemical energy.',
  keyPoints: ['Happens in chloroplasts', 'Produces oxygen'],
  terms: ['photosynthesis', 'chlorophyll'],
};

describe('summaryService.generateSummary', () => {
  beforeEach(() => {
    llmService.invoke.mockReset();
  });

  test('sends the notes to the LLM wrapped in <notes> tags', async () => {
    llmService.invoke.mockResolvedValue(JSON.stringify(validSummary));

    await summaryService.generateSummary('Photosynthesis happens in chloroplasts.');

    expect(llmService.invoke).toHaveBeenCalledTimes(1);
    const prompt = llmService.invoke.mock.calls[0][0];
    expect(prompt).toContain('<notes>\nPhotosynthesis happens in chloroplasts.\n</notes>');
  });

  test('returns the parsed summary, key points, and terms', async () => {
    llmService.invoke.mockResolvedValue(JSON.stringify(validSummary));

    await expect(summaryService.generateSummary('notes')).resolves.toEqual(validSummary);
  });

  test('extracts the JSON object when the LLM wraps it in extra text', async () => {
    llmService.invoke.mockResolvedValue(`Here is your summary:\n\`\`\`json\n${JSON.stringify(validSummary)}\n\`\`\`\nHope it helps!`);

    await expect(summaryService.generateSummary('notes')).resolves.toEqual(validSummary);
  });

  test('drops fields the LLM adds beyond the expected shape', async () => {
    llmService.invoke.mockResolvedValue(JSON.stringify({ ...validSummary, extra: 'ignored' }));

    const result = await summaryService.generateSummary('notes');

    expect(result).toEqual(validSummary);
    expect(result).not.toHaveProperty('extra');
  });

  test('accepts empty keyPoints and terms arrays', async () => {
    const summary = { summary: 'Short.', keyPoints: [], terms: [] };
    llmService.invoke.mockResolvedValue(JSON.stringify(summary));

    await expect(summaryService.generateSummary('notes')).resolves.toEqual(summary);
  });

  test('throws when the reply contains no JSON', async () => {
    llmService.invoke.mockResolvedValue('Sorry, I cannot help with that.');

    await expect(summaryService.generateSummary('notes')).rejects.toThrow(SyntaxError);
  });

  test('throws when the reply contains malformed JSON', async () => {
    llmService.invoke.mockResolvedValue('{"summary": "unterminated');

    await expect(summaryService.generateSummary('notes')).rejects.toThrow();
  });

  test.each([
    ['summary is missing', { keyPoints: [], terms: [] }],
    ['summary is not a string', { ...validSummary, summary: 42 }],
    ['keyPoints is missing', { summary: 's', terms: [] }],
    ['keyPoints is not an array', { ...validSummary, keyPoints: 'one point' }],
    ['keyPoints contains a non-string', { ...validSummary, keyPoints: ['ok', 1] }],
    ['terms is missing', { summary: 's', keyPoints: [] }],
    ['terms contains a non-string', { ...validSummary, terms: [{ term: 'x' }] }],
  ])('throws an invalid format error when %s', async (_, reply) => {
    llmService.invoke.mockResolvedValue(JSON.stringify(reply));

    await expect(summaryService.generateSummary('notes')).rejects.toThrow('LLM returned an invalid summary format');
  });

  test('propagates errors from the LLM call', async () => {
    llmService.invoke.mockRejectedValue(new Error('Bedrock throttled'));

    await expect(summaryService.generateSummary('notes')).rejects.toThrow('Bedrock throttled');
  });
});
