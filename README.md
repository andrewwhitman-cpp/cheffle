# Cheffle - Meal Planning Web Application

A full-stack meal planning application built with Next.js, TypeScript, and SQLite.

## Features

- **Recipe Management**: Create, edit, and delete recipes with ingredients, instructions, and timing
- **Tagging System**: Organize recipes with tags (protein types, difficulty, cooking methods, cuisine types)
- **Meal Plan Calendar**: Plan meals by assigning recipes to specific dates
- **Shopping List**: Automatically generate and edit ingredient lists from meal plans
- **User Authentication**: Secure JWT-based authentication system

## Tech Stack

- **Frontend**: Next.js 14 (App Router) with React and TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT tokens

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up the database (you'll need to create the API routes for this):
```bash
# The database will be created automatically when you run the API routes
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
cheffle/
├── app/                    # Next.js App Router
│   ├── api/                # API route handlers (to be implemented)
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── dashboard/          # Dashboard page
│   ├── recipes/            # Recipe pages
│   ├── meal-plan/         # Meal plan calendar
│   ├── ingredient-list/   # Shopping list
│   ├── tags/               # Tag management
│   ├── layout.tsx         # Root layout
│   └── page.tsx            # Home page (redirects to dashboard)
├── components/             # React components
│   ├── Calendar.tsx        # Calendar component
│   ├── Navigation.tsx      # Navigation bar
│   ├── ProtectedRoute.tsx  # Route protection
│   └── RecipeCard.tsx      # Recipe card component
├── contexts/               # React contexts
│   └── AuthContext.tsx     # Authentication context
└── lib/                    # Utilities
    └── auth.ts             # Auth utilities
```

## Frontend Pages

### Authentication
- **Login** (`/login`): User login page
- **Register** (`/register`): User registration page

### Main Pages
- **Dashboard** (`/dashboard`): Overview of recent recipes and upcoming meals
- **Recipes** (`/recipes`): List all recipes with search and tag filtering
- **Recipe Detail** (`/recipes/[id]`): View and edit individual recipes
- **New Recipe** (`/recipes/new`): Create a new recipe
- **Meal Plan** (`/meal-plan`): Calendar view for planning meals
- **Shopping List** (`/ingredient-list`): Generate and edit ingredient lists
- **Tags** (`/tags`): Manage recipe tags

## Next Steps

To make this application fully functional, you'll need to implement:

1. **API Routes** (`app/api/`):
   - Authentication endpoints (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`)
   - Recipe CRUD endpoints (`/api/recipes`)
   - Tag management endpoints (`/api/tags`)
   - Meal plan endpoints (`/api/meal-plans`)
   - Ingredient list endpoints (`/api/ingredient-lists`)

2. **Database Setup** (`lib/db.ts`):
   - SQLite database connection
   - Database schema creation
   - Database models and queries

3. **Authentication** (`lib/auth.ts`):
   - JWT token generation and verification
   - Password hashing with bcrypt

## Development

- Run development server: `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm start`
- Lint code: `npm run lint`

## License

MIT
