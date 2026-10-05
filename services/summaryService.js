var llmService = require("./llmService");

var buildPrompt = (notes) => `Summarize the study notes inside the <notes> tags.
Respond with ONLY a JSON object, with no other text, in exactly this shape:
{"summary": "<summary>", "keyPoints": ["<key point>", "..."], "terms": ["<term>", "..."]}

- summary: A summary of notes. Only include the important details.
- keyPoints: maximum of 5 of the most important ideas, each one short sentence.
- terms: maximum of 5 key terms from the notes, each 1-3 words, no definitions.

<notes>
${notes}
</notes>`;

var isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/* Pull the JSON object out of the reply and check its shape. Throws if invalid. */
var parseSummary = (text) => {
  var json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  var parsed = JSON.parse(json);
  var isValid =
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

/* Generate a summary, key points, and terms. The LLM call is logged to llm_logs by llmService. */
var generateSummary = async (notes) => {
  var text = await llmService.invoke(buildPrompt(notes));
  return parseSummary(text);
};

module.exports = { generateSummary: generateSummary };
