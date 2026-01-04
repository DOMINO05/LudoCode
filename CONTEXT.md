# LudoCode - Project Specification & Context

## 1. Project Overview
LudoCode is an adaptive coding skill development web application with gamification elements.
**Goal:** Create a simplified MVP (Minimum Viable Product) where users solve coding challenges, earn XP, and get questions adapted to their skill level using an ELO rating system.

## 2. Tech Stack Requirements
* **Database:** PostgreSQL (Schema provided in `init.sql`).
* **Backend:** NestJS (Node.js).
    * ORM: TypeORM (or Prisma).
    * Auth: Passport-JWT (Stateless authentication).
* **Frontend:** React (Vite).
    * Styling: CSS Modules or Plain CSS (Keep it simple).
    * Code Editor: `@monaco-editor/react`.
    * State Management: React Context API or simple Hooks.
* **Code Execution:** Use external **Piston API** (Public API) to run user code safely.


## 3. Business Logic & Algorithms (CRITICAL)

### A. The Adaptive Algorithm (Question Selection)

**Logic:** DO NOT use random selection. Use the User's `global_elo_rating`.

1. **Input:** Current User's ELO (e.g., 1000).
2. **Query:** Select a random question from the DB where:
* The question has NOT been solved by the user yet (check `user_submissions`).
* `questions.difficulty_rating` is between `UserELO - 100` and `UserELO + 100`.


3. **Fallback:** If no question is found in that range, expand search to `+/- 200`.

### B. Submission & Scoring System

When a user submits code:

1. **Execute:** Send code to Piston API.
2. **Verify:** Compare Output with `questions.content->expected_output` (or run test cases).
3. **If Correct:**
* Create `user_submission` (is_correct: true).
* Update Profile: `xp += 10`.
* **ELO Update:** `global_elo_rating += 15`.
* Update Streak (if applicable).


4. **If Incorrect:**
* Create `user_submission` (is_correct: false).
* Update Profile: `hp -= 1`.
* **ELO Update:** `global_elo_rating -= 15`.
* If `hp` reaches 0, prevent further attempts for a cooldown period (or reset HP for MVP simplicity).



### C. Daily Bonus

1. On user login/dashboard load, check `daily_logins` for today's date.
2. If no entry exists:
* Insert record into `daily_logins`.
* Grant Bonus: `xp += 50`.
* Show "Daily Bonus" modal on Frontend.



### D. Initial Assessment

1. On Registration, ask user: "Beginner", "Intermediate", or "Pro".
2. Set initial `profiles.global_elo_rating`:
* Beginner: 800
* Intermediate: 1200
* Pro: 1600



## 4. API Endpoints Blueprint (Backend)

* **Auth:**
* `POST /auth/register` (Create User & Profile)
* `POST /auth/login` (Return JWT)


* **User:**
* `GET /user/profile` (Get XP, HP, ELO, Streak)
* `POST /user/daily-check` (Trigger daily bonus logic)


* **Questions:**
* `GET /questions/next` (Implements the Adaptive Algorithm described in 4.A)
* `POST /questions/:id/submit` (Handles code execution, verification, and scoring described in 4.B)



## 5. External Service: Piston API

* **URL:** `https://emkc.org/api/v2/piston/execute`
* **Method:** POST
* **Payload Example:**
```json
{
  "language": "python",
  "version": "3.10.0",
  "files": [
    {
      "content": "print('Hello World')"
    }
  ]
}
