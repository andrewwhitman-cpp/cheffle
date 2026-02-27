# Cheffle - AI Recipe App

An AI-native recipe app built with Next.js. Add recipes from any URL, customize them with AI, and follow step-by-step guided cooking.

## Features

- **Recipe import**: Paste a URL to parse and save recipes (JSON-LD + OpenAI fallback)
- **AI modifications**: Chat with Cheffle to adjust recipes (add rice, make vegetarian, double it, etc.)
- **Skill-level adjustments**: Recipes adapt to your experience (New to Cooking, Comfortable, Experienced)
- **Kitchen context**: Profile your equipment and appliances so recipes use what you have
- **Guided cooking**: Step-by-step view with one instruction at a time, keyboard navigation
- **Ingredient scaling**: Scale servings with accurate quantity adjustments
- **User accounts**: JWT auth, profile settings, password change

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Turso (libSQL) for production; local SQLite file for dev
- **AI**: OpenAI GPT-4 for recipe parsing and modifications
- **Auth**: JWT tokens, bcrypt password hashing

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone and install:

```bash
git clone <repo-url>
cd cheffle
npm install
```

2. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

3. Set environment variables in `.env.local`:

- **JWT_SECRET** (required): Generate with `openssl rand -base64 32`
- **OPENAI_API_KEY** (required): From [OpenAI](https://platform.openai.com)
- **TURSO_DATABASE_URL** and **TURSO_AUTH_TOKEN** (optional for dev): Omit to use local `database/cheffle.db`

4. Run the dev server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

1. Push your repo to GitHub and import the project in [Vercel](https://vercel.com).

2. Add environment variables in Vercel (Settings → Environment Variables):

   | Variable             | Required | Description                          |
   | -------------------- | -------- | ------------------------------------ |
   | JWT_SECRET           | Yes      | Secure random string (e.g. `openssl rand -base64 32`) |
   | OPENAI_API_KEY       | Yes      | OpenAI API key                       |
   | TURSO_DATABASE_URL   | Yes      | `libsql://your-db.turso.io`         |
   | TURSO_AUTH_TOKEN    | Yes      | Turso auth token                     |

3. Deploy. Vercel will run `npm run build` and deploy.

### Turso setup

1. Create an account at [turso.tech](https://turso.tech)
2. Create a database in the Turso dashboard
3. Copy the database URL and create an auth token
4. Run migrations: the app creates tables on first request, or you can apply the schema from `lib/db.ts` manually

## Project Structure

```
cheffle/
├── app/
│   ├── api/              # API routes (auth, recipes, profile)
│   ├── dashboard/        # Dashboard with URL import
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── recipes/          # Recipe list, detail, cook view
│   ├── profile/          # Profile settings (sidebar)
│   ├── layout.tsx
│   ├── page.tsx          # Landing page
│   ├── not-found.tsx     # 404 page
│   └── error.tsx         # Error boundary
├── components/
├── contexts/             # AuthContext
├── hooks/                # useRecipeChat
└── lib/                  # db, auth, recipe-parser, etc.
```

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT
