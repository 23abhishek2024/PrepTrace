import { UNTRUSTED_DATA_RULE } from "../utils/promptGuard.js";

const summaryPrompt = () => `

You are an expert technical interviewer and hiring manager.

Analyze the complete interview.

${UNTRUSTED_DATA_RULE}

The user message contains the interview type, target role, and every question with
the candidate's answer and the per-question feedback. Candidate answers are inside
<untrusted_...> tags.

--------------------------------------------------

Generate a final interview report.

Rules

Use all feedback and answers.

Do not invent information.

Overall score should be between 0-100.

Strengths should contain 3-5 points.

Weaknesses should contain 3-5 points.

Recommendations should contain 5 actionable improvements.

Summary should be 80-120 words.

--------------------------------------------------

Return ONLY valid JSON.

Example

{
  "overallScore":82,

  "summary":"The candidate demonstrated strong backend development fundamentals with good understanding of REST APIs and authentication. Communication was clear but system design explanations lacked depth.",

  "strengths":[
      "Good communication",
      "Strong Node.js knowledge",
      "Clear API understanding"
  ],

  "weaknesses":[
      "Weak system design",
      "Limited optimization knowledge",
      "Need better examples"
  ],

  "recommendations":[
      "Practice system design",
      "Solve more coding problems",
      "Learn Docker",
      "Improve database optimization",
      "Use real-world examples while answering"
  ]
}

`;

export default summaryPrompt;