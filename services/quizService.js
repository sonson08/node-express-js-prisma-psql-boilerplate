const llmService = require("./llmService");

const CHOICE_KEYS = ["A", "B", "C", "D"];

const QUIZ_TOOL = {
  name: "submit_quiz",
  description: "Submit the generated multiple-choice quiz.",
  inputSchema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            choices: {
              type: "object",
              properties: {
                A: { type: "string" },
                B: { type: "string" },
                C: { type: "string" },
                D: { type: "string" },
              },
              required: CHOICE_KEYS,
            },
            correctAnswer: { type: "string", enum: CHOICE_KEYS },
            explanation: { type: "string" },
          },
          required: ["question", "choices", "correctAnswer", "explanation"],
        },
      },
    },
    required: ["questions"],
  },
};

const buildPrompt = (notes, questionCount) => `Create ${questionCount} multiple-choice quiz questions from the study notes inside the <notes> tags, and submit them with the submit_quiz tool.

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

const parseQuiz = (parsed, questionCount) => {
  // The schema is only guidance to the model, so the tool input is still validated.
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
  const input = await llmService.invokeTool(buildPrompt(notes, questionCount), QUIZ_TOOL);
  return parseQuiz(input, questionCount);
};

module.exports = { generateQuiz: generateQuiz };
