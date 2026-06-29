# Supabase setup — PilotCar4Hire

## 1. Run the database migration

In [Supabase Dashboard](https://supabase.com/dashboard) → **PilotCar4Hire** → **SQL Editor**, paste and run:

`supabase/migrations/001_initial_schema.sql`

This creates `profiles` and `listings` tables, RLS policies, and a signup trigger.

## 2. Configure auth URLs

**Authentication** → **URL Configuration**:

| Setting | Value |
|---------|-------|
| Site URL | `https://www.pilotcar4hire.com` (or `http://localhost:8080` for local dev) |
| Redirect URLs | `https://www.pilotcar4hire.com/reset-password.html`, `http://localhost:8080/reset-password.html` |

## 3. Add API credentials to the site

**Settings** → **API** → copy **Project URL** and **anon public** key.

Edit `js/config.js`:

```js
window.SUPABASE_URL = 'https://xxxxx.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJ...';
```

## 4. Email settings (recommended for dev)

**Authentication** → **Providers** → **Email**:

- For faster testing, disable **Confirm email** so pilot cars can sign up and log in immediately.
- For production, keep it enabled.

## Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Pilot car driver accounts (name, email, role) |
| `listings` | One listing per driver — visible to everyone on browse |

Carriers do not have accounts; they browse listings anonymously.
