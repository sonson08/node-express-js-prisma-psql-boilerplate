const llmService = require("./llmService");

const buildPrompt = (notes) => `Summarize the study notes inside the <notes> tags.
Respond with ONLY a JSON object, with no other text, in exactly this shape:
{"summary": "<summary>", "keyPoints": ["<key point>", "..."], "terms": ["<term>", "..."]}

- summary: A summary of notes. Only include the important details.
- keyPoints: maximum of 5 of the most important ideas, each one short sentence.
- terms: maximum of 5 key terms from the notes, each 1-3 words, no definitions.

<notes>
${notes}
</notes>`;

const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const parseSummary = (text) => {
  // The model sometimes wraps the JSON in prose or code fences, so only the outermost object is parsed.
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json);
  const isValid =
    typeof parsed.summary === "string" &&
    isStringArray(parsed.keyPoints) &&
    isStringArray(parsed.terms);
  if (!isValid) throw new Error("LLM returned an invalid summary format");
  return {
    summary: parsed.summary,
    keyPoints: parsed.keyPoints,
    terms: parsed.terms,
  };
};

const generateSummary = async (notes) => {
  const text = await llmService.invoke(buildPrompt(notes));
  return parseSummary(text);
};

module.exports = { generateSummary: generateSummary };
