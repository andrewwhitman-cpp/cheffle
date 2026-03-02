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

2. Set up environment variables for **development**:

   ```bash
   cp .env.development.example .env.development
   # Edit .env.development with your dev Turso credentials
   ```

   Or use `.env.local` (overrides `.env.development`). Required:
   - **JWT_SECRET**: `openssl rand -base64 32`
   - **OPENAI_API_KEY**: From [OpenAI](https://platform.openai.com)
   - **TURSO_DATABASE_URL** and **TURSO_AUTH_TOKEN**: Create a **dev** database at [turso.tech](https://turso.tech). Omit to use local `database/cheffle.db`.

3. Run the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

1. Push your repo to GitHub and import the project in [Vercel](https://vercel.com).

2. Add environment variables in Vercel (Settings → Environment Variables) for **Production**:

   | Variable             | Required | Description                          |
   | -------------------- | -------- | ------------------------------------ |
   | JWT_SECRET           | Yes      | Secure random string (e.g. `openssl rand -base64 32`) |
   | OPENAI_API_KEY       | Yes      | OpenAI API key                       |
   | TURSO_DATABASE_URL   | Yes      | `libsql://your-prod-db.turso.io` (use a **separate** DB from dev) |
   | TURSO_AUTH_TOKEN    | Yes      | Auth token for the production database |

3. Deploy. Vercel will run `npm run build` and deploy.

### Turso setup (dev vs production)

Create **two** databases at [turso.tech](https://turso.tech):

- **Dev**: e.g. `cheffle-dev` — use in `.env.development` or `.env.local` when running `npm run dev`
- **Prod**: e.g. `cheffle-prod` — use in Vercel environment variables for production

Next.js loads `.env.development` when `next dev` and `.env.production` (or Vercel env vars) when building for production, so dev and prod stay separate.

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
