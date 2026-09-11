# Manage Data Panel Backend

Node.js Express API for the Manage Data Panel assignment. It uses Supabase PostgreSQL for persistence and keeps the Supabase service-role key on the server only.

## Setup

1. Run `npm install`.
2. Copy `.env.example` to `.env` and set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`, and `CORS_ORIGIN`. Use comma-separated origins for multiple frontends.
3. Run `sql/reset_records.sql` in the Supabase SQL editor. This query drops the existing `public.records` table and recreates the schema, upload fields, link/download URL columns, constraints, search/filter indexes, trigger, RLS policies, grants, and table comments.
4. Start the API with `npm run dev` or `npm start`.

For Vercel backend deployment, import the `backend` folder as its own Vercel project and set the same environment variables from `.env.example` in the Vercel dashboard. The serverless entrypoint is `api/index.js`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Backend health check |
| `GET` | `/api-records/summary` | Database-driven summary counts |
| `GET` | `/api-records/records` | Paginated list with search and filters |
| `GET` | `/api-records/records/:id` | Fetch one record |
| `POST` | `/api-records/records` | Create one record |
| `POST` | `/api-records/records/delete-multiple` | Delete multiple records |
| `POST` | `/api-records/import` | Bulk import validated records |
| `PUT` | `/api-records/records/:id` | Update one record |
| `DELETE` | `/api-records/records/:id` | Delete one record |

## Frontend Connection

Set this in `../frontend/.env`:

```text
VITE_API_BASE_URL=http://localhost:4000/api-records
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

For deployment, set `VITE_API_BASE_URL` to the deployed backend URL plus `/api-records`.

The anon key is public and safe for frontend use. The service-role key is secret and must stay in `backend/.env` only.

Do not commit `.env`, service-role keys, database passwords, or Supabase access tokens.

## Upload Columns

CSV/Excel upload supports these columns: `name`, `email`, `phone_number`, `address`, `organisation`, `type`, `link_status`, `link_url`, `download_status`, `download_url`, and `date_added`. The frontend auto-maps common headers such as `Name`, `Phone`, `Category`, `Link`, `Link URL`, `Download Status`, `Download Link`, and `Date`.
