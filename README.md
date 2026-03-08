## Nebula Expense AI – Simple AI Expense Tracker

Minimal full-stack project for the Nebula KnowLab hiring task: an expense tracker with a conversational assistant that can create, read, update, and delete expenses from natural language.

### Live demo

Add your deployed URL here, for example:

`https://your-deployment-url.example.com`

### Tech stack

- **Frontend**: Next.js (App Router, TypeScript, Tailwind-based styling)
- **Backend**: Next.js Route Handlers
- **Database**: SQLite via Prisma
- **Auth**: Email + password (hashed with bcrypt), session cookie

### Getting started (local)

1. **Install dependencies**

```bash
npm install
```

2. **Set up the database**

```bash
npx prisma migrate dev
```

3. **Run the dev server**

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Environment variables

Create a `.env` file in the project root (a starter file is already there):

```env
DATABASE_URL="file:./dev.db"
```

For a production deployment (e.g. Railway/Postgres), point `DATABASE_URL` to your hosted database and run `npx prisma migrate deploy` during deployment.

### Features implemented

- **Authentication**: email/password signup & login with hashed passwords and session cookies
- **Core tracker**:
  - Add expenses (amount, category, date, description, merchant, payment method)
  - View recent expenses with sorting and category filter
  - Edit/delete via API (delete exposed in UI)
- **Categories**:
  - Predefined categories created on signup (Food, Transport, Entertainment, Bills, Shopping, Healthcare)
  - Custom categories automatically created by the chatbot if needed
- **Budgets**:
  - Simple monthly budgets per-category or overall
  - Current month budgets shown in the dashboard
- **Analytics UI**:
  - This-month vs last-month totals and percentage change
  - Category breakdown chart using proportional bars
- **Chatbot (rule-based for simplicity)**:
  - **Create** expenses from sentences like:
    - `I spent 250 on groceries yesterday`
    - `Add coffee 50, lunch 180 and uber 120 today`
  - **Read / analytics**:
    - `How much did I spend on food this month?`
    - `Show me my biggest expenses from last week`
  - **Update**:
    - `Change the category of my last expense to transport`
    - `Actually, make that 500`
  - **Delete**:
    - `Delete that last expense`
    - `Remove all coffee expenses from this week`
  - **Insights & context**:
    - `Give me insights on my spending`
    - `Am I on track with my budget?`
    - `What was my total again?`

The chatbot is implemented in `/src/app/api/chat/route.ts` and uses simple pattern matching (no external LLM) to keep the project easy to run locally. You can swap this out for OpenAI or another provider later, using the same API surface.

### Deployment notes

- This project is ready to deploy on platforms like **Vercel**, **Railway**, or **Render**.
- For a production-ready setup:
  - Use a managed Postgres database and update `DATABASE_URL` accordingly.
  - Run `npx prisma migrate deploy` as part of your deploy step.
  - Set `NODE_ENV=production`.

### Future improvements

- Replace the rule-based chatbot with a proper LLM integration (OpenAI, Claude, or Gemini) using tool/function-calling.
- Add richer charts for trends over time (line/bar charts using Recharts or similar).
- Add receipt OCR, voice input, and recurring expense detection.
- Improve conversational context memory across browser sessions.
