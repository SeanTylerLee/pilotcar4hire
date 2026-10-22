# Supabase setup — PilotCar4Hire

## 1. Run the database migration

In [Supabase Dashboard](https://supabase.com/dashboard) → **PilotCar4Hire** → **SQL Editor**, paste and run:

`supabase/migrations/001_initial_schema.sql`

Then also run (in order) for Studio admin / app features:

- `002_admin_added_listings.sql`
- `003_admin_pilot_handoffs.sql` — temp login handoffs used by STL Studio PC4H Admin
- `004_admin_edit_listings.sql` — legacy website-admin policies (Studio uses service_role)
- `005_delete_own_account.sql` — required for App Store account deletion in the iOS app
- `006_app_announcements.sql` — in-app Studio messages (blocking gate on open until Clear)
- `007_listing_reviews.sql` — public 1–5 star reviews stay pending until accepted in Studio PC4H Admin

Pilot admin tools live in STL Studio (**PC4H Admin**), not on the public website.

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
| `app_announcements` | Studio in-app messages shown on open until the user taps Clear |
| `app_announcement_reads` | Per-account Clear records for those messages |
| `listing_reviews` | Carrier reviews of a listing. Public can insert only via `submit_listing_review` (always pending). Only `status = published` rows are readable. Studio PC4H Admin accepts or rejects. |

Carriers do not have accounts; they browse listings anonymously. Anyone can leave a 1–5 star review plus a short comment; it stays hidden until you accept it in Studio.
