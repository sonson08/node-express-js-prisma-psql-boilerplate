# Quiz App API

API for turning pasted notes into a summary and a multiple-choice quiz.

- **Base URL:** `/api/v1`
- **Format:** JSON (`Content-Type: application/json`)
- **Auth:** none
- **State:** stateless. Nothing is saved, so every request returns new content.
- **Scoring:** done in the frontend. The quiz response includes the correct answers.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/summaries` | Generate a summary from notes |
| `POST` | `/api/v1/quizzes` | Generate multiple-choice questions from notes |
| `GET` | `/api/v1/health` | Check that the backend is up |

`/summaries` and `/quizzes` each make their own LLM call. Send both requests in parallel with the same notes. The summary usually returns first, so you can show it while the quiz is still generating.

---

## `POST /api/v1/summaries`

Generates a summary, key points, and terms from the notes.

### Request

```ts
{
  notes: string;          // required, 1–20,000 characters
}
```

### Response `200 OK`

```ts
{
  data: {
    summary: string;      // short paragraph, 2–4 sentences
    keyPoints: string[];  // 3–6 short sentences
    terms: string[];      // 3–8 terms, 1–3 words each
  }
}
```

### Example

```sh
curl -X POST http://localhost:3000/api/v1/summaries \
  -H 'Content-Type: application/json' \
  -d '{"notes":"Photosynthesis converts light energy into chemical energy..."}'
```

```json
{
  "data": {
    "summary": "Photosynthesis is the process plants use to convert light energy into chemical energy stored in glucose...",
    "keyPoints": [
      "Sunlight is the primary energy source for photosynthesis",
      "Chlorophyll absorbs light inside the chloroplasts"
    ],
    "terms": ["Photosynthesis", "Chlorophyll", "Chloroplast"]
  }
}
```

---

## `POST /api/v1/quizzes`

Generates multiple-choice questions from the notes. Each question has 4 choices, exactly one correct answer, and an explanation.

### Request

```ts
{
  notes: string;          // required, 1–20,000 characters
  questionCount?: number; // optional, integer 1–20, default 10
}
```

### Response `200 OK`

```ts
{
  data: {
    questions: {
      id: number;                                      // 1..n, the question's position in this response
      question: string;
      choices: { key: "A" | "B" | "C" | "D"; text: string }[];  // always 4
      correctAnswer: "A" | "B" | "C" | "D";
      explanation: string;
    }[]
  }
}
```

### Example

```sh
curl -X POST http://localhost:3000/api/v1/quizzes \
  -H 'Content-Type: application/json' \
  -d '{"notes":"Photosynthesis converts light energy into chemical energy...","questionCount":1}'
```

```json
{
  "data": {
    "questions": [
      {
        "id": 1,
        "question": "Where in the plant cell does photosynthesis take place?",
        "choices": [
          { "key": "A", "text": "Mitochondria" },
          { "key": "B", "text": "Chloroplasts" },
          { "key": "C", "text": "Nucleus" },
          { "key": "D", "text": "Ribosomes" }
        ],
        "correctAnswer": "B",
        "explanation": "Chloroplasts contain chlorophyll, which captures light energy for photosynthesis."
      }
    ]
  }
}
```

### Scoring in the frontend

For each question, compare the choice the user picked with `correctAnswer`, then show `explanation`. The score is the number of correct picks divided by `questions.length`. The backend has no endpoint for submitting answers.

---

## `GET /api/v1/health`

### Response `200 OK`

```json
{ "status": "ok" }
```

---

## Errors

Every error response has this shape:

```ts
{
  error: {
    code: string;
    message: string;      // readable by people, may be shown to the user
  }
}
```

| Status | `code` | When | What the frontend should do |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `notes` is missing, empty, or too long, or `questionCount` is out of range | Show `message` and ask the user to fix the input |
| 413 | `PAYLOAD_TOO_LARGE` | The request body is too large | Ask the user to shorten their notes |
| 502 | `LLM_ERROR` | The AI call failed or returned an invalid format | Show a retry button |
| 500 | `INTERNAL_ERROR` | Unexpected server error | Show a generic error and offer a retry |

Example:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "notes is required" } }
```
