# void

A magic 8 ball. Ask it a question, it answers from the void.

Answers live in a Supabase table you own. Anyone can submit a new answer; every
submission is screened by Claude before it can show up.

Live site: https://savvmae.github.io/void/

---

## How it fits together

```
browser (Create React App, GitHub Pages)
  |
  |-- read:  supabase-js -> answers table (RLS: anon can only SELECT approved rows)
  |
  '-- write: POST -> submit-answer edge function
                       |-- validates + rate limits (hashed IP)
                       |-- Anthropic Messages API (moderation verdict)
                       '-- inserts with the service role key
```

Two keys, two very different rules:

- **Supabase anon key** — ships in the browser bundle. That is fine and
  expected. Row level security is what actually enforces access: anon can read
  approved answers and cannot write anything.
- **Anthropic API key** — server side only. It is a Supabase secret read by the
  edge function. It must never appear in `.env`, in the bundle, or in this repo.

---

## Setup, in order

Everything below is a one time setup. You need the
[Supabase CLI](https://supabase.com/docs/guides/cli) for steps 4 and 5; it is
not installed on this machine yet.

### 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. Pick a region near you and save the database password somewhere safe.
3. Wait for it to finish provisioning.

### 2. Run the SQL

1. In the dashboard: **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Run it.

That creates the `answers` table, turns on row level security, adds the policy
that lets anon read only approved rows, creates the indexes, and seeds the 20
classic magic 8 ball answers. The file is safe to re-run.

Sanity check in **Table Editor → answers**: 20 rows, all `status = approved`,
`source = seed`.

### 3. Set the frontend env vars

1. In the dashboard: **Project Settings → API**.
2. Copy **Project URL** and the **anon public** key.
3. In the repo root:

   ```sh
   cp .env.example .env
   ```

4. Fill in:

   ```
   REACT_APP_SUPABASE_URL=https://<your-project-ref>.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=<your anon public key>
   ```

`.env` is gitignored. If either variable is missing the app still loads — it
just tells you it is not hooked up instead of crashing.

At this point `npm start` gives you a working 8 ball reading from your own
database. Submitting answers needs steps 4 and 5.

### 4. Set the Anthropic key (and the IP salt) as Supabase secrets

Install the CLI and link the project:

```sh
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>
```

Then set the secrets. `<your-project-ref>` is the subdomain in your project
URL; the Anthropic key comes from https://console.anthropic.com → API keys.

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Optional but recommended. Any long random string. Used to salt the SHA-256
# of the caller IP so the stored hashes cannot be brute forced.
supabase secrets set IP_HASH_SALT="$(openssl rand -hex 32)"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into edge functions
automatically. Do not set those yourself.

You can confirm with `supabase secrets list` (it shows names and digests, not
values).

### 5. Deploy the edge function

From the repo root:

```sh
supabase functions deploy submit-answer
```

Check it responds:

```sh
curl -i -X POST \
  "https://<your-project-ref>.supabase.co/functions/v1/submit-answer" \
  -H "Authorization: Bearer <your anon public key>" \
  -H "Content-Type: application/json" \
  -d '{"text":"the stars say yes"}'
```

You should get JSON back with `"status":"approved"` or `"status":"rejected"`
plus a reason. Watch logs while testing with:

```sh
supabase functions logs submit-answer
```

### 6. Run it locally

```sh
npm install
npm start
```

http://localhost:3000 — `http://localhost:3000` is already in the function's
CORS allowlist.

### 7. Deploy the site

```sh
npm run deploy
```

That builds and pushes to the `gh-pages` branch. The env vars are inlined at
build time, so `.env` must be filled in before you run it.

---

## Reviewing submissions

Rejected answers are stored, not thrown away, so you can look at what people
tried and override the classifier.

In **SQL Editor**:

```sql
-- what got rejected and why
select created_at, text, rejection_reason
from public.answers
where status = 'rejected'
order by created_at desc;

-- override: let one through
update public.answers
set status = 'approved', rejection_reason = null
where id = '<the uuid>';

-- take one back down
update public.answers
set status = 'rejected', rejection_reason = 'removed by hand'
where id = '<the uuid>';
```

---

## Knobs

All in [`supabase/functions/submit-answer/index.ts`](supabase/functions/submit-answer/index.ts),
at the top of the file:

| Constant | Default | What it does |
| --- | --- | --- |
| `MAX_LENGTH` | 200 | Longest accepted answer, after trimming |
| `MIN_LENGTH` | 2 | Shortest accepted answer |
| `MAX_SUBMISSIONS_PER_HOUR` | 5 | Per hashed IP, rolling hour. Rejected ones count too |
| `MODEL` | `claude-opus-5` | Which Claude model classifies submissions |
| `ALLOWED_ORIGINS` | GitHub Pages + localhost | CORS allowlist |

Redeploy with `supabase functions deploy submit-answer` after changing any of
them. The moderation prompt lives in the same file as `MODERATION_SYSTEM`.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Dev server on http://localhost:3000 |
| `npm test` | Test runner (watch mode) |
| `npm run build` | Production build into `build/` |
| `npm run deploy` | Build, then publish `build/` to the `gh-pages` branch |

Bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
