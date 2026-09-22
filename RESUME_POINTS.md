# 🏛️ PrepTrace: Finalized Master Resume Points & Interview Defense Guide

> **Project Name:** PrepTrace — AI-Powered Mock Interview Platform & ATS Resume Analyzer  
> **Tech Stack:** React 19, Node.js, Express.js, MongoDB, Redux Toolkit, LangChain, Groq AI, Tailwind CSS, JWT  
> **GitHub:** `github.com/23abhishek2024/preptrace`  

---

## 📄 Part 1: Finalized Resume Points (Ready to Copy-Paste)

### Option 1: Standard 5-Bullet Format (Recommended for Tech Resumes)
```text
PrepTrace — AI-Powered Mock Interviewer & ATS Resume Analyzer
Tech Stack: React 19, Node.js, Express, MongoDB, Redux Toolkit, LangChain, Groq AI, JWT, Tailwind CSS

• AI Mock Interview Platform: Built an interactive technical and HR interview system using LangChain and Groq AI that generates role-tailored questions, reads them aloud via browser speech synthesis, and provides per-question rubric evaluation and feedback.
• ATS Resume Analyzer: Engineered a resume parser using Multer and pdf-parse to extract candidate profile text from PDFs, compute a 0–100 ATS compatibility score, highlight skill gaps, and suggest targeted role alignments.
• ATS Resume Builder & PDF Exporter: Implemented a multi-step resume creation tool with live ATS-friendly formatting, managing global resume data via Redux Toolkit and enabling direct vector PDF downloads using react-to-print.
• Automated Learning Roadmap: Developed a career roadmap generator that produces milestone-based study curricula for target software roles and automatically integrates video tutorials via the YouTube Data API with fallback search links.
• Secure Authentication & MERN Backend: Implemented stateless email/password authentication using bcrypt password hashing (10 salt rounds) and signed JWTs stored in HTTP-only cookies to safeguard against client-side XSS attacks.
```

---

### Option 2: LaTeX Format (For Overleaf / College Placement CV Template)
```latex
\resumeProjectHeading
  {\textbf{PrepTrace} $|$ \emph{React 19, Node.js, Express, MongoDB, Redux Toolkit, LangChain, Groq AI, JWT}}
  {\href{https://github.com/23abhishek2024/preptrace}{\underline{GitHub Repository}}}
  \resumeItemListStart
    \resumeItem{Developed an interactive mock interview system using \textbf{LangChain} and \textbf{Groq AI} that delivers role-specific technical/HR questions with browser speech synthesis and turn-by-turn rubric scoring.}
    \resumeItem{Engineered an ATS resume parser using \textbf{Multer} and \textbf{pdf-parse} to extract text from PDF resumes, calculate a 0--100 match score, detect missing skills, and auto-delete temporary files post-processing.}
    \resumeItem{Built a multi-step resume builder with real-time ATS preview and vector PDF export using \textbf{react-to-print}, centralizing resume state across components via \textbf{Redux Toolkit}.}
    \resumeItem{Created a personalized career roadmap builder that structures week-by-week study modules for tech roles and enriches them with video lessons via the \textbf{YouTube Data API}.}
    \resumeItem{Implemented custom authentication from scratch using \textbf{bcrypt} password hashing and \textbf{JWT} stored in \textbf{HTTP-only cookies} for secure, stateless session management.}
  \resumeItemListEnd
```

---

### Option 3: Short & Crisp 3-Bullet Format (For Tight 1-Page Resumes)
```text
• Built a full-stack AI mock interview platform using React 19, Node.js, MongoDB, and LangChain (Groq AI) that conducts live voice-assisted technical and HR interviews with real-time answer scoring.
• Engineered an ATS resume analyzer and builder using Multer, pdf-parse, and Redux Toolkit that calculates a 0–100 compatibility score, detects missing skills, and exports ATS-formatted PDFs.
• Implemented secure JWT authentication stored in HTTP-only cookies with bcrypt hashing, and an automated learning roadmap generator integrated with the YouTube Data API.
```

---

### Option 4: Action + Impact (Google XYZ Format: "Accomplished [X] through [Y], resulting in [Z]")
```text
• Engineered an interactive AI mock interview platform using React 19, LangChain, and Groq AI, delivering real-time role-specific technical evaluations and turn-by-turn answer scoring with browser speech synthesis.
• Developed an automated ATS resume evaluator and builder using Multer and pdf-parse, achieving instant 0–100 match scoring and missing skill identification with direct client-side PDF export via react-to-print.
• Architected a secure, production-grade MERN REST API utilizing MongoDB atomic document schemas, Redux Toolkit state management, and bcrypt/JWT authentication with HTTP-only cookies to eliminate XSS token theft.
```

---

## 🎯 Part 2: Line-by-Line Code References (To Show the Interviewer)

When the interviewer asks: *"Where in your code did you implement this?"*, you can confidently point to these exact files:

| Resume Feature | Implementation File | Key Code / Function |
|---|---|---|
| **AI LLM Setup** | [`backend/config/llm.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/backend/config/llm.js) | `new ChatGroq({ model: "openai/gpt-oss-120b", temperature: 0.2 })` |
| **Interview Generator** | [`backend/agents/interview.agent.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/backend/agents/interview.agent.js) | `interviewAgent({ role, type, useResume, resume })` |
| **Real-Time Feedback** | [`backend/agents/feedback.agent.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/backend/agents/feedback.agent.js) | `feedbackAgent({ question, answer, difficulty })` |
| **Final Summary Report** | [`backend/agents/summary.agent.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/backend/agents/summary.agent.js) | `summaryAgent({ role, type, questions })` |
| **PDF Text Extraction** | [`backend/config/pdf.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/backend/config/pdf.js) | `PDFParse({ data: buffer }).getText()` |
| **File Upload & Cleanup** | [`backend/controllers/resume.controller.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/backend/controllers/resume.controller.js) | `upload.single("resume")` and `fs.unlinkSync(file.path)` |
| **Roadmap Generation** | [`backend/agents/roadmap.agent.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/backend/agents/roadmap.agent.js) | `roadmapAgent({ role, targetPackage, useResume, resume })` |
| **YouTube Video Fetcher** | [`backend/config/youtube.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/backend/config/youtube.js) | `axios.get(BASE_URL, { params: { q: ... } })` with fallback URL |
| **Password Hashing & JWT** | [`backend/controllers/auth.controller.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/backend/controllers/auth.controller.js) | `bcrypt.hash(password, 10)` and `res.cookie("token", token, { httpOnly: true })` |
| **Auth Middleware** | [`backend/middleware/isAuth.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/backend/middleware/isAuth.js) | `jwt.verify(token, process.env.JWT_SECRET)` |
| **Global State** | [`frontend/src/redux/resumeSlice.js`](file:///c:/local_files/2.fresherAI/2.fresherAI/frontend/src/redux/resumeSlice.js) | `createSlice({ name: "resume", initialState: { resume: null } })` |
| **Speech Audio (Voice)** | [`frontend/src/components/interview/Step2interview.jsx`](file:///c:/local_files/2.fresherAI/2.fresherAI/frontend/src/components/interview/Step2interview.jsx) | `window.speechSynthesis.speak(utter)` |
| **PDF Download** | [`frontend/src/components/resume/DownloadBtn.jsx`](file:///c:/local_files/2.fresherAI/2.fresherAI/frontend/src/components/resume/DownloadBtn.jsx) | `useReactToPrint({ contentRef: docRef })` |

---

## 💬 Part 3: Winning Interview Answers (Simple & Confident)

### Q1: "Walk me through what PrepTrace does and why you built it."
> *"PrepTrace is a full-stack web application designed to help students and fresh graduates prepare for software engineering placements. It brings three key tools into one place:*  
> *1. An AI mock interview simulator that asks role-specific technical and HR questions, reads them aloud using browser speech synthesis, and scores each response on correctness, clarity, and relevance.*  
> *2. An ATS resume analyzer that parses PDF resumes, calculates a compatibility score, and highlights missing skills.*  
> *3. An automated roadmap generator that builds week-by-week study topics for a target role and fetches relevant YouTube tutorial videos.*  
> *I built it using the MERN stack—React 19, Node.js, Express, and MongoDB—with LangChain and Groq AI for fast AI responses, and custom JWT authentication in HTTP-only cookies."*

---

### Q2: "How does the AI interview work from start to finish?"
> *"When a user selects an interview role and type (technical or HR), the client makes a request to `/api/interview/start`. The backend passes the role and optional resume details to our LangChain interview agent, which prompts Groq AI to return structured JSON containing 6 curated questions with timers and difficulty levels.*  
> *The questions are stored in MongoDB, and the first question is sent to the frontend. On the frontend, the browser's Web Speech API speaks the question aloud. The candidate speaks or types their response (they can also write code in an embedded Monaco editor). When submitted, our feedback agent scores the answer out of 100 with improvement points. Once all questions are finished, a summary agent generates an overall report with strengths, weaknesses, and a skill breakdown graph."*

---

### Q3: "How do you parse resumes and calculate the ATS score?"
> *"We accept PDF resumes through Multer middleware, restricting the file size to 20MB and verifying the MIME type. On the server, `pdf-parse` extracts the raw text from the document. That text is fed into our LangChain resume analysis agent with strict prompt instructions to extract skills, education, experience, and calculate a 0–100 ATS score based on keyword coverage, clarity, and relevance. Once processed, we immediately delete the temporary file from the disk using `fs.unlinkSync` to save storage and ensure privacy."*

---

### Q4: "Why did you use HTTP-only cookies for JWT instead of localStorage?"
> *"Storing JWTs in `localStorage` makes them accessible to JavaScript, which means any third-party script or Cross-Site Scripting (XSS) vulnerability can steal the token. By storing the JWT in an `httpOnly` cookie with `sameSite: 'lax'` (or `'strict'`) and `secure` in production, the browser engine prevents client-side scripts from reading the cookie (`document.cookie` returns empty). The browser automatically attaches the cookie to requests made to our backend via `withCredentials: true`."*

---

### Q5: "Why Redux Toolkit instead of regular React useState?"
> *"The user's resume data needs to be accessible in multiple independent screens: the ATS Scorer page, the Resume Builder form, the Live ATS Preview template, and the Dashboard overview. If we used component `useState`, we would have had to pass props through multiple parent and child components (prop drilling). Redux Toolkit gave us a clean, centralized slice (`resumeSlice`) with predictable actions (`setResume`) and easy debugging."*

---

### Q6: "What happens if the YouTube API quota is exceeded or fails?"
> *"In `config/youtube.js`, our video search function is wrapped in a try/catch block. If the YouTube API key is missing, invalid, or reaches its quota, the function automatically falls back to generating a direct YouTube search query URL (`https://www.youtube.com/results?search_query=...`). This guarantees that the user always gets working study links and the roadmap generator never crashes."*

---

### ✅ Checklist Before Your Interview:
- [x] Simple, clean bullet points without artificial numbers or comparative traps.
- [x] Every bullet point maps 100% to actual code in the repository.
- [x] LaTeX version formatted and tested for Overleaf.
- [x] Confident answers prepared for all common questions.
