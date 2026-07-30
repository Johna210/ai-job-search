---
framework_version: 1.0.0
---

# Interview Preparation Guide

## STAR Format

Structure answers as: **Situation** (context), **Task** (your responsibility), **Action** (what you did), **Result** (outcome).

Keep answers to 1-2 minutes. Be specific. End with what you learned or would do differently.

## Ready-Made STAR Examples

### 1. Adisu Serategna - Bilingual Agentic RAG Platform (Complex System Design)
**S:** Ethiopian entrepreneurs struggled with business formalization processes. Existing tools were English-only and didn't address local needs. My capstone project aimed to build a bilingual (Amharic + English) AI platform to help.
**T:** I was responsible for architecting and building the entire platform across 4 tech stacks: Go backend, Python AI agent, Next.js dashboard, and Flutter mobile app.
**A:** Designed a Go modular monolith with clean architecture (Gin framework) handling API gateway, auth, and business logic with 60-85% test coverage. Built a Python FastAPI agentic service using ReAct loops with tool-calling, multi-LLM orchestration (Gemini + Cohere), and bilingual embeddings in pgVector across a 500+ document knowledge base. Integrated gRPC for communication between layers. Built the Next.js admin dashboard for document ingestion and agent debugging with tool-call tracing.
**R:** Successfully defended the capstone. Platform is public on GitHub with screenshots and video. Demonstrates ability to architect and ship complex distributed systems end-to-end.
**Use for:** "Tell me about a complex project", "Describe a time you designed a system architecture", "How do you approach building something from scratch?"

### 2. Eskalate - Gemini API Integration (AI in Production)
**S:** The engineering and operations teams at Eskalate spent significant time manually reviewing documents. There was an opportunity to automate this using AI.
**T:** I was tasked with integrating Google Gemini API into the production backend to create an internal document summarization tool.
**A:** Integrated Gemini API into the existing Go (Gin) backend monolith. Designed the API endpoints for document submission and summarization. Handled error cases, rate limiting, and response formatting. Tested with real documents from the operations team and iterated based on feedback.
**R:** Shipped a production-ready tool that reduced manual document review time. Tool was adopted by both engineering and operations teams.
**Use for:** "Tell me about a time you integrated AI into production", "Describe a project where you automated something", "How do you handle working with external APIs?"

### 3. Perago - Multi-Tenant eProcurement (Scalable Backend)
**S:** Perago was building a multi-tenant enterprise eProcurement platform deployed across Ethiopia, Malawi, and Sierra Leone, each country operating as an isolated database tenant. The system needed to handle government procurement workflows at national scale.
**T:** I owned backend modules on the platform, responsible for building and maintaining microservices using NestJS and TypeScript.
**A:** Built RESTful APIs with database-per-tenant isolation and multi-tenant query safety. Designed data models for government procurement workflows. Collaborated in a backend team of 3-5 engineers, shipping in 2-week sprint cadence. Reviewed peer PRs and contributed to architecture decisions across services.
**R:** Platform successfully deployed across 3 countries, handling national-scale procurement data with proper tenant isolation.
**Use for:** "Tell me about working on a multi-tenant system", "Describe your experience with microservices", "How do you handle working with strict data isolation requirements?"

### 4. Weather Forecast ML Model (ML Pipeline)
**S:** A team project required developing a machine learning model for weather prediction using 10 years of historical climate data for local insights.
**T:** I was responsible for developing the ML model and optimizing the training pipeline.
**A:** Processed and analyzed the historical weather dataset. Developed an ML model using Python, scikit-learn, pandas, and NumPy. Optimized the training pipeline for faster deployment and updates. Evaluated model performance across different metrics.
**R:** Achieved 99% prediction accuracy. Optimized training pipeline by 20% for faster deployment.
**Use for:** "Tell me about a machine learning project", "Describe a time you optimized a process", "How do you approach model evaluation?"

### 5. CinemaMate - Cinema Scheduling App (Backend Architecture)
**S:** A cinema scheduling application needed a robust backend with proper authentication and domain-driven design.
**T:** I was responsible for building the backend API using NestJS and TypeScript.
**A:** Implemented Domain-Driven Design patterns in the NestJS backend. Built JWT authentication system. Achieved 85% test coverage through comprehensive unit and integration testing.
**R:** Delivered a well-tested backend API with clean architecture. Demonstrates ability to build production-quality backend systems with proper design patterns.
**Use for:** "Tell me about a time you implemented authentication", "Describe your approach to testing", "How do you apply design patterns in your work?"

## Common Tough Questions

### "Why did you leave [previous company]?"
> [PREPARE YOUR ANSWER - be honest, forward-looking, no negativity about former employer]

### "You don't have [specific skill/experience]."
> Acknowledge the gap honestly. Bridge to adjacent experience. Show willingness to learn. Example: "I haven't used [X] in production, but I've worked with [Y] which shares similar concepts. I'm a fast learner - I picked up Go, Python, and TypeScript in different contexts and shipped production code with all of them."

### "Where do you see yourself in 5 years?"
> Show ambition aligned with the role's growth path. "I see myself growing into a technical leadership role where I can architect complex systems and mentor other engineers, while staying hands-on with the technology."

### "What's your biggest weakness?"
> [PREPARE YOUR ANSWER - genuine weakness with concrete mitigation strategy]

### "Why this company specifically?"
> Customize per company. Must reference: specific projects, company values, market position, or team structure. Never give a generic answer.

## Questions You Should Ask Interviewers

### About the Role
- "What does a typical week look like in this role?"
- "What would success look like in the first 6 months?"
- "What's the biggest challenge the team is facing right now?"

### About the Team
- "How big is the team, and how do you divide work?"
- "What does the development/project lifecycle look like, from idea to production?"
- "How do you onboard new team members?"

### About Tech & Growth
- "What's your current tech stack for [relevant area]?"
- "Is there room to grow into more architectural or strategic decisions?"
- "How does the team stay current with new tools and methods?"

### About Culture (use these to prevent disappointment)
- "How would you describe the team culture?"
- "What does professional development look like here?"
- "Is there flexibility for remote/hybrid work?"
- "What's the balance between development/new projects and maintenance work?"
- "How would you describe the leadership style in this team?"
- "What do people who thrive here have in common?"

## Phone/Video Interview Tips
- Have STAR examples written out (use this file)
- Keep a glass of water nearby
- Smile when speaking (it changes your tone)
- Ask for clarification if a question is vague
- It's OK to take 5 seconds to think before answering
- End with: "Is there anything else you'd like to know about my background?"

## After the Application (Best Practice)

### Follow-Up Etiquette
- **Don't call to "stand out"** or to learn more about the role post-submission - this risks a negative impression
- If the employer specified a timeline, respect it and wait
- If no timeline was given and significant time has passed (2+ weeks), a brief call to ask about status is acceptable
- If you have genuinely new, relevant information to share, a short follow-up is fine

### Thank-You Notes
- When you receive any update (interview invitation, rejection, or status update), send a brief thank-you message
- Express appreciation for their time and the process
- Keep it short (2-3 sentences)

## Roleplay Guidelines
When the user asks for interview practice:
1. Ask which role/company to simulate
2. Start with easy warm-up questions ("Tell me about yourself")
3. Progress to role-specific technical questions
4. Include 1-2 behavioral questions using the competencies from the job posting
5. End with a tough question or curveball
6. After each answer, give brief feedback: what worked, what to sharpen
7. Suggest which STAR example would work best for each question
