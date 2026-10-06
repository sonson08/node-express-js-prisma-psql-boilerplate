const llmService = require("./llmService");

const CHOICE_KEYS = ["A", "B", "C", "D"];

const buildPrompt = (notes, questionCount) => `Create ${questionCount} multiple-choice quiz questions from the study notes inside the <notes> tags.
Respond with ONLY a JSON object, with no other text, in exactly this shape:
{"questions": [{"question": "<question>", "choices": {"A": "<choice>", "B": "<choice>", "C": "<choice>", "D": "<choice>"}, "correctAnswer": "<A, B, C, or D>", "explanation": "<explanation>"}]}

- questions: exactly ${questionCount} questions, each answerable using only the notes.
- choices: exactly 4 choices with keys A, B, C, and D. Only one is correct; the others are plausible but wrong.
- correctAnswer: the key of the correct choice.
- explanation: 1-2 sentences explaining why the correct answer is right.

<notes>
${notes}
</notes>`;

const isValidChoices = (choices) =>
  typeof choices === "object" &&
  choices !== null &&
  CHOICE_KEYS.every((key) => typeof choices[key] === "string");

const isValidQuestion = (item) =>
  typeof item === "object" &&
  item !== null &&
  typeof item.question === "string" &&
  isValidChoices(item.choices) &&
  CHOICE_KEYS.includes(item.correctAnswer) &&
  typeof item.explanation === "string";

const parseQuiz = (text, questionCount) => {
  // The model sometimes wraps the JSON in prose or code fences, so only the outermost object is parsed.
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json);
  const isValid =
    Array.isArray(parsed.questions) &&
    parsed.questions.length > 0 &&
    parsed.questions.every(isValidQuestion);
  if (!isValid) throw new Error("LLM returned an invalid quiz format");

  // Fewer questions than requested are accepted because short notes may not support that many.
  const questions = parsed.questions.slice(0, questionCount).map((item, index) => ({
    id: index + 1,
    question: item.question,
    choices: CHOICE_KEYS.map((key) => ({ key: key, text: item.choices[key] })),
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
  }));
  return { questions: questions };
};

const generateQuiz = async (notes, questionCount) => {
  const text = await llmService.invoke(buildPrompt(notes, questionCount));
  return parseQuiz(text, questionCount);
};

module.exports = { generateQuiz: generateQuiz };
