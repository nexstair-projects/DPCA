# Dream Paris Wedding — Dashboard

Next.js-based dashboard for the AI-powered communication assistant.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — login with your Supabase credentials.

## Project Structure

```
./app                    # Next.js App Router pages
├── layout.tsx          # Root layout with metadata
├── page.tsx            # Home/landing page
├── login/              # Authentication
└── (dashboard)         # Protected pages
    ├── dashboard/      # Main dashboard
    ├── inbox/          # Message management
    ├── leads/          # Lead tracking
    ├── knowledge-base/ # KB management
    └── settings/       # Configuration

./components            # Reusable React components
├── Layout.tsx          # Dashboard layout wrapper
├── Sidebar.tsx         # Navigation sidebar
└── TopBar.tsx          # Top header bar

./lib                   # Utilities
├── supabase.ts         # Supabase client setup
└── hooks.ts            # Custom React hooks
```

## Pages

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Public homepage |
| Login | `/login` | Supabase auth |
| Dashboard | `/dashboard` | Main stats & activity |
| Inbox | `/inbox` | Message review queue |
| Leads | `/leads` | Lead tracking table |
| Knowledge Base | `/knowledge-base` | KB entries management |
| Settings | `/settings` | Config & user management |

## Authentication

- Uses Supabase Auth (JWT-based)
- Email/password login
- Protected routes via middleware (TODO)
- Role-based access control (admin, manager)

## Styling

- **Tailwind CSS** for utility styles
- **Dream Paris Wedding** brand colors:
  - `dpw-gold`: #C9A961 (primary accent)
  - `dpw-dark`: #1a1a1a (text/contrast)
  - `dpw-light`: #f5f5f0 (backgrounds)

## Development

```bash
# Type check
npm run type-check

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Next Steps

- [ ] Implement Supabase Auth flow in login page
- [ ] Add protected route middleware
- [ ] Connect Inbox page to real database queries
- [ ] Build Draft Review split-view component
- [ ] Add real-time updates via Supabase subscriptions
- [ ] Implement filtering & sorting
- [ ] Add error boundaries & toast notifications
- [ ] Mobile responsive design polish
