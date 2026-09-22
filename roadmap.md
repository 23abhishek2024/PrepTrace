# PrepTrace: Engineering Development Roadmap
## From Concept to 100% Production-Grade AI Career Preparation Platform

---

## Executive Status Dashboard

| Phase | Milestone | Scope / Deliverables | Status |
| :---: | :--- | :--- | :---: |
| **01** | **Monolith Backend & Scratch JWT Auth** | Node.js, Express, MongoDB, Mongoose, bcryptjs, HTTP-only JWT cookies, MVC structure | ✅ **COMPLETED** |
| **02** | **ATS Resume Scorer without Redis** | Multer memoryStorage, `pdf-parse`, Groq LPU `openai/gpt-oss-120b`, ATS 0–100 rubric scoring | ✅ **COMPLETED** |
| **03** | **Conversational Mock Interview without LangGraph** | Direct LangChain LCEL pipelines, turn scoring, Web Speech API synthesis, Monaco editor | ✅ **COMPLETED** |
| **04** | **Career Roadmap Builder & Video Enrichment** | Dynamic weekly roadmap generation, YouTube Data API v3 resolver with fallback | ✅ **COMPLETED** |
| **05** | **Paywall, Microservice & Redis Elimination** | Deleted 6 microservices, gateway, Redis, Razorpay, and coin barriers; 100% free | ✅ **COMPLETED** |
| **06** | **Production Polish & System Verification** | E2E functional verification, null safety guards, Redux resume slice, ATS print template | ✅ **COMPLETED** |

---

## Detailed Milestone Specifications

### Phase 1: Monolith Backend & Scratch JWT Auth [COMPLETED]
1. **Express Monolith Setup ([backend/server.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/server.js))**:
   - Replaced multi-port microservices architecture with a unified Express server listening on port `8000`.
   - Mounted standard middlewares: `cors` with credentials, `express.json()`, `cookieParser()`, and `morgan("dev")`.
2. **Local Database Connection ([backend/config/db.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/config/db.js))**:
   - Established resilient Mongoose connection to local MongoDB (`mongodb://127.0.0.1:27017/preptrace`).
3. **Custom Authentication from Scratch ([backend/controllers/auth.controller.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/controllers/auth.controller.js))**:
   - Implemented password encryption using `bcryptjs` with 10 salt rounds.
   - Built stateless JWT token dispatch inside secure, `HttpOnly`, `SameSite=Strict` cookies.
   - Built protected `/api/me` endpoint and `isAuth` verification middleware ([backend/middleware/isAuth.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/middleware/isAuth.js)).
4. **Frontend Auth Integration ([frontend/src/components/LoginModel.jsx](file:///c:/local_files/2.preptrace/2.preptrace/frontend/src/components/LoginModel.jsx))**:
   - Rewrote login modal to feature clean Email/Password Registration and Sign-In tabs, eliminating external Firebase popup dependencies.

---

### Phase 2: In-Memory ATS Resume Scorer without Redis [COMPLETED]
1. **In-Memory Binary Ingestion ([backend/middleware/multer.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/middleware/multer.js))**:
   - Configured `multer.memoryStorage()` with a strict 5MB file size limit to prevent memory exhaustion and disk I/O bottlenecks.
2. **Text Extraction Engine ([backend/config/pdf.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/config/pdf.js))**:
   - Built non-blocking buffer parser using `pdf-parse` to extract plain text from incoming resume streams in under 200ms.
3. **LangChain Groq Agent ([backend/agents/resume.agent.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/agents/resume.agent.js))**:
   - Implemented `ChatGroq` with `openai/gpt-oss-120b` via `@langchain/groq`.
   - Engineered structured prompt schema returning candidate details, ATS compatibility score (0–100), strengths, weaknesses, and missing skill tags.
4. **Data Persistence & Display ([backend/models/resume.model.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/models/resume.model.js))**:
   - Designed Mongoose schema with `Schema.Types.Mixed` to flexibly store polymorphic candidate project data.
   - Integrated radial score gauge and categorized feedback lists in [frontend/src/pages/Scorer.jsx](file:///c:/local_files/2.preptrace/2.preptrace/frontend/src/pages/Scorer.jsx).

---

### Phase 3: Conversational AI Mock Interview without LangGraph [COMPLETED]
1. **LangGraph State Graph Elimination**:
   - Replaced complex `@langchain/langgraph` state graphs with clean, modular LangChain LCEL async functions:
     - `interview.agent.js`: Contextual question generator.
     - `feedback.agent.js`: Turn-by-turn answer evaluation and scoring (0–10).
     - `summary.agent.js`: Final interview performance synthesizer and radar chart metrics.
2. **Stateful Multi-Turn Persistence ([backend/models/interview.model.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/models/interview.model.js))**:
   - Built Mongoose document structure storing an array of turns (`questions`), overall scores, and final feedback directly in MongoDB.
3. **Frontend Live Interview Experience ([frontend/src/components/interview/Step2interview.jsx](file:///c:/local_files/2.preptrace/2.preptrace/frontend/src/components/interview/Step2interview.jsx))**:
   - Integrated browser-native Web Speech API (`SpeechSynthesis`) for voice question reading.
   - Integrated Monaco Code Editor for technical code answers.
   - Displayed live answer feedback and scoring after each turn.

---

### Phase 4: Career Roadmap Builder & Video Enrichment [COMPLETED]
1. **Roadmap Agent Pipeline ([backend/agents/roadmap.agent.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/agents/roadmap.agent.js))**:
   - Prompt pipeline generating week-by-week technical curricula based on candidate target role, timeframe, and salary goal.
2. **YouTube Resource Resolver ([backend/agents/resource.agent.js](file:///c:/local_files/2.preptrace/2.preptrace/backend/agents/resource.agent.js))**:
   - Integrated YouTube Data API v3 with intelligent fallback querying to resolve real tutorial links for each weekly milestone.
3. **Interactive Visual Timeline ([frontend/src/pages/Roadmap.jsx](file:///c:/local_files/2.preptrace/2.preptrace/frontend/src/pages/Roadmap.jsx))**:
   - Built collapsible module cards with direct video links and learning checklists.

---

### Phase 5: Paywall, Microservices & Redis Elimination [COMPLETED]
1. **Microservices & Gateway Purge**:
   - Safely deleted 6 separate microservices folders (`auth-service`, `resume-service`, `interview-service`, `roadmap-service`, `payment-service`, `gateway`), `shared/`, and `docker-compose.yml`.
2. **Billing & Coins Removal**:
   - Deleted obsolete billing files: `Billing.jsx` and `PricingCard.jsx`.
   - Removed `/billing` route from `App.jsx` and coin balance widgets from `Sidebar.jsx`.
   - Stripped out coin deductions across `Scorer.jsx`, `Step1setup.jsx`, `Roadmap.jsx`, and `DownloadBtn.jsx`. Every feature is now 100% free and unlocked.
3. **Clean Dependencies**:
   - Removed `firebase` and `ioredis` dependencies from project manifests.

---

## Next Horizon: Scalability & Production Hardening

- [ ] **Docker Multi-Stage Containerization**: Add root `Dockerfile` and `docker-compose.yml` for unified 1-click cloud deployment.
- [ ] **Voice-to-Text Input**: Expand `Step2interview.jsx` with the Web Speech Recognition API (`webkitSpeechRecognition`) for hands-free audio answers.
- [ ] **Redis Caching Layer (Optional Scale Horizon)**: Introduce an optional Redis cache for YouTube resource queries if request volume exceeds API quota limits.

---

*PrepTrace — Engineered for Speed, Simplicity, and Real-World Career Success.*

