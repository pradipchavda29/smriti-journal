# Smriti — A journal that remembers

A private journaling app where your past entries become searchable memory. You write; entries are embedded and stored under your own user ID; later you can ask your own history a question and get an answer grounded only in what you actually wrote.

Built for the Google Cloud Gen AI Academy APAC — Cloud Run Build & Deploy Social Challenge.

**Live deployment:** https://smriti-143318167036.asia-southeast1.run.app
**Cloud Run label:** `dev-tutorial=cloud-run-ai-challenge`
**Region:** `asia-southeast1`

---

## Why this exists

The starter spec is a journal that chats with Gemini and saves the conversation. That works, but the entries just accumulate — a write-only pile you never revisit.

Smriti adds retrieval. Every entry is embedded on save. When you ask *"what was I anxious about last month?"*, the question is embedded, ranked against your own vectors, and the top matches are passed to Gemini as grounding context. If nothing clears the similarity threshold, it says so rather than inventing a memory.

That single feature is also what makes the security story concrete. Embeddings are user data. A retrieval system that ranks globally and filters afterward leaks across tenants. This one binds the user ID into the collection path before any ranking happens, so there is no code path where cross-user retrieval is possible.

---

## Core requirements — where each one lives

| Requirement | Implementation | File |
|---|---|---|
| User authentication | Firebase Auth with Google Sign-In; server-side ID token verification on every `/api/*` route | `src/lib/firebase.ts`, `server.ts` → `requireFirebaseAuth` |
| Multi-turn AI interaction | Gemini via a 4-model fallback ladder; three reflection modes | `server.ts` → `generateContentWithFallback`, `POST /api/reflect` |
| Isolated data storage | Firestore under `/users/{uid}/…` with owner-bound rules and no admin bypass | `firestore.rules` |
| Secure key management | `GEMINI_API_KEY` bound from Secret Manager to the Cloud Run runtime; never in client code | `server.ts` → `getGeminiClient`, deploy commands below |

---

## Original feature enhancements

### Ask My Past Self — grounded retrieval over your own history

`POST /api/ask` (`handleAskPastSelf` in `server.ts`):

1. Embed the question with `gemini-embedding-001`, `outputDimensionality: 768`, `taskType: RETRIEVAL_QUERY`, L2-normalized.
2. Read `/users/{uid}/embeddings` where `uid` comes from the verified ID token only. The user ID is part of the collection path — this is structural isolation, not a filter that could be omitted.
3. Rank by dot product. Vectors are unit-normalized, so dot product *is* cosine similarity.
4. Keep matches above `SIMILARITY_THRESHOLD = 0.55`, take `TOP_K = 3`.
5. Fetch those interactions directly by document ID. Embedding document IDs are set equal to interaction IDs, so the join needs no query.
6. Pass them to Gemini inside untrusted-content delimiters with a citation mandate.
7. If nothing clears the threshold, return an honest no-match. Generation is never invoked.

The UI shows the similarity score on every source card. That is deliberate — it makes retrieval legible instead of magical.

### Reflection Dashboard — personal synthesis and client-side follow-ups

`POST /api/dashboard/summary` in `server.ts`:

1. **Isolation.** Reads `/users/{uid}/interactions` where `uid` comes strictly from the verified Firebase ID token. The user ID is structural to the document path.
2. **Flagged-entry exclusion.** Interactions marked `flagged === true` are filtered out before any statistics or AI context assembly. They never enter the prompt corpus.
3. **Local metrics and AI synthesis.** Computes total entries, 7- and 30-day counts, current writing streak, mode distribution, and a 14-day activity sparkline. Up to 30 recent entries go to Gemini inside untrusted-content delimiters under a JSON response schema, producing a second-person narrative, recurring themes, an emotional trajectory, and inferred follow-ups. If Gemini is unreachable, the route returns local metrics with `aiAvailable: false` rather than failing.
4. **Theme-to-question.** Clicking a generated theme runs it as a grounded query through the existing `/api/ask` route.
5. **Zero-OAuth export.** Action items export two ways, both entirely client-side: an RFC-5545 `.ics` file generated as an in-browser Blob (imports into Google Calendar, Apple Calendar, Outlook), and a URL-encoded `mailto:` link. Neither requests Google Calendar, Gmail, or any Workspace OAuth scope, and neither makes a third-party network call.

### Prompt injection defense with a persistent audit trail

Journal content flows into model context, which makes stored user text an injection surface. `checkPromptInjection` matches five categories: instruction override, system-prompt tampering, roleplay jailbreak, directive bypass, and role-delimiter impersonation.

When an entry trips detection:

- The entry **still saves**. Losing someone's writing to a false positive is a worse outcome than the attack.
- It is marked `flagged: true` and shown with a calm "Excluded from AI context" badge.
- Embedding generation is skipped, so it never enters the retrieval corpus.
- `handleAskPastSelf` independently skips any retrieved interaction with `flagged === true`, as defense in depth.
- An audit record is written server-side to `security_events` with the user ID, timestamp, matched category, source route, and an excerpt capped at 200 characters. Full content is never logged.

`security_events` is denied to all clients in the rules. It is written via the Admin SDK and read back only through the authenticated `GET /api/security-events` route, scoped to the caller's own user ID.

### RBAC as least-privilege, not god-mode

Roles come from Firebase custom claims, verified server-side from the decoded token. Client-side role state is cosmetic; every admin route re-verifies.

The design decision worth stating plainly: **an administrator has no read path to any user's journal content.** This is enforced in `firestore.rules`, not just in application code — the rules for `interactions` and `embeddings` contain no admin branch at all. Aggregates are computed with collection-group `.count()` and a `.select('mode')` projection, so entry bodies are never loaded into server memory.

---

## Architecture

```
Browser (React + Vite)
  │  Firebase Auth → Google Sign-In → ID token
  │  Authorization: Bearer <idToken> on every /api/* call
  ▼
Express server on Cloud Run  (server.ts)
  │  requireFirebaseAuth → verifyIdToken → req.user.uid
  │  GEMINI_API_KEY ← Secret Manager (runtime env, never bundled)
  ├──► Gemini API   generation + embeddings, server-side only
  └──► Firestore    Admin SDK, paths bound to the verified uid
```

The browser never contacts the Gemini API. It calls same-origin `/api/*` endpoints, which hold the key.

### Data model

| Path | Contents |
|---|---|
| `/users/{uid}/interactions/{id}` | Entry content, Gemini response, title, mode, `flagged` |
| `/users/{uid}/embeddings/{id}` | 768-dim normalized vector; document ID equals the interaction ID |
| `/security_events/{id}` | Injection audit records. Server-write only, client-read denied |
| `/admin/metadata/{id}` | Aggregate metrics. Admin claim required |

### API surface

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/health` | public | Container liveness |
| `POST /api/reflect` | token | Generation, injection screening, auto-titling |
| `POST /api/embeddings` | token | `gemini-embedding-001`, 768-dim, normalized |
| `POST /api/ask` | token | Grounded retrieval Q&A |
| `POST /api/dashboard/summary` | token | Personal analytics, AI narrative, themes, mood arc, action items |
| `GET /api/security-events` | token | Caller's own audit records |
| `GET /api/admin/aggregate-metrics` | token + admin claim | Aggregate counts only |

`/api/health` is the only unauthenticated route. Every other `/api/*` path passes through `requireFirebaseAuth` before any Gemini call or Firestore read.

---

## Firestore security rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    // Owner-bound. No `|| request.auth.token.role == 'admin'` bypass exists.
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Embeddings are user data and carry identical isolation.
    match /users/{userId}/embeddings/{embeddingId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Admin claim grants aggregate metadata only.
    match /admin/metadata/{docId} {
      allow read: if request.auth != null && request.auth.token.role == 'admin';
      allow write: if false;
    }

    // Audit log: Admin SDK writes only, no client access of any kind.
    match /security_events/{eventId} {
      allow read, write: if false;
    }
  }
}
```

Firestore rules are additive — the catch-all grants nothing and documents the intent; denial is the default when no rule grants access. The guarantee that matters is the absence of an admin branch on `interactions` and `embeddings`.

Deploy: `firebase deploy --only firestore:rules`

---

## Setup and deployment

### Prerequisites

Node 20+, `gcloud` CLI, `firebase` CLI, a Firebase project with Auth (Google provider) and Firestore enabled.

### Local

```bash
git clone https://github.com/pradipchavda29/smriti-journal.git
cd smriti-journal
npm install
cp .env.example .env     # add GEMINI_API_KEY from Google AI Studio
npm run dev              # http://localhost:3000
```

### Enable required APIs

```bash
gcloud services enable secretmanager.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable firestore.googleapis.com
```

Secret Manager is not enabled by default on a new project. Skipping this produces a `SERVICE_DISABLED` error on the next step.

### Secret Manager

```bash
echo -n "YOUR_GEMINI_API_KEY" | \
  gcloud secrets create GEMINI_API_KEY --data-file=-

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:143318167036-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Substitute your own project number and runtime service account. Find it with:

```bash
gcloud run services describe smriti --region asia-southeast1 \
  --format="value(spec.template.spec.serviceAccountName)"
```

### Firestore access for the runtime service account

The Admin SDK reads Firestore using Application Default Credentials. The Cloud Run service account needs:

```bash
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:143318167036-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

Without this, `getUserEmbeddings` returns `PERMISSION_DENIED` and retrieval silently reports an empty history.

### Deploy

```bash
gcloud run deploy smriti \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --labels dev-tutorial=cloud-run-ai-challenge
```

`--allow-unauthenticated` applies to Cloud Run's network layer only. Application-level access is enforced by `requireFirebaseAuth`; unauthenticated API calls receive 401 before any work is done.

### Verify the deployment

```bash
# Label present
gcloud run services describe smriti --region asia-southeast1 \
  --format="value(metadata.labels)"

# Key bound as a secret reference, not a plaintext value
gcloud run services describe smriti --region asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0].env)"

# Auth boundary enforced
curl -i -X POST https://smriti-143318167036.asia-southeast1.run.app/api/reflect \
  -H "Content-Type: application/json" -d '{"prompt":"hi"}'
# → HTTP/2 401  {"code":"AUTH_TOKEN_MISSING"}
```

The env output must show `secretKeyRef`. If it shows a literal `value:`, re-apply:

```bash
gcloud run services update smriti --region asia-southeast1 \
  --remove-env-vars GEMINI_API_KEY \
  --update-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### Configuration

| Variable | Source | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Secret Manager (prod), `.env` (local) | Never bundled client-side |
| `GCLOUD_PROJECT` | Cloud Run runtime | Falls back to a hardcoded project ID — change this when forking |
| `FIRESTORE_DATABASE_ID` | env | This project uses a **named**, non-default database |

The Firebase Web API key in `src/lib/firebase.ts` is a public client identifier, not a secret. Access is governed by the rules above.

Firebase Admin initializes with `initializeApp({ projectId })` and no credential argument, so it uses Application Default Credentials — the Cloud Run service account identity. No service-account JSON is stored anywhere in the repo.

### Grant an admin role

```bash
node scripts/set-admin.js you@example.com
```

Sign out and back in afterward. Custom claims do not appear in an already-issued ID token.

---

## Threat model

| Zone | Risk | Countermeasure |
|---|---|---|
| API surface | Deployed URL used as an open proxy to burn the Gemini key | `requireFirebaseAuth` on every `/api/*` route except health; 401 before any Gemini call |
| Identity | Client asserts a different user ID in a request body | User ID is read only from the decoded token; body and query parameters are never trusted |
| Retrieval | Cross-user leakage via global ranking | User ID is baked into the collection path before ranking; no global index exists to rank against |
| Model context | Stored entries carry injection payloads into prompts | Untrusted-content delimiters, a security mandate in the system instruction, categorized detection, flagged entries excluded from the corpus |
| Grounding | Fabricated memories when history is irrelevant | Similarity threshold with an explicit no-match branch that returns before generation |
| Privilege | Role escalation via client state | Custom claims verified server-side; `?role=admin` and body role fields rejected with 403 |
| Admin access | Elevated role used to read private journals | No admin branch in the `interactions` or `embeddings` rules; aggregates use counts and metadata projections only |
| Audit integrity | Client tampering with security records | `security_events` denied to all clients; Admin SDK writes; reads only via an authenticated route scoped to the caller |
| Third-party scope creep | Calendar and email export requesting broad Workspace access | Export is client-side `.ics` and `mailto:` only. No OAuth scopes beyond sign-in, no third-party tokens |
| Secrets | Key exposure in the browser bundle | All Gemini calls server-side; key injected at runtime from Secret Manager |

---

## Known limitations

Recorded honestly rather than papered over.

- **Retrieval is in-memory, not indexed.** Cosine similarity is computed in application code over the user's own vectors rather than via Firestore `findNearest`. This is fine at personal-journal scale and avoids a vector-index build, but it will not hold at thousands of entries per user. A KNN vector index is the migration path.
- **Admin `totalUsers` may under-count.** Entries live at `/users/{uid}/interactions/…`. If no document was ever written at `/users/{uid}` itself, those are phantom parent documents that `.count()` does not see.
- **Injection detection is pattern-based.** A regex category list catches common overrides but is not exhaustive. It is one layer; the delimiters, the system mandate, and corpus exclusion are the others.
- **Embeddings are written from the client** using a payload generated server-side, so the embeddings rule must permit owner writes. Moving the write server-side would allow locking it to Admin-SDK-only.
- **`logSecurityEvent` has no REST fallback.** Unlike `getUserEmbeddings`, audit writes go through the Admin SDK only. In an environment without Application Default Credentials, they fail silently inside their try/catch by design — a logging failure must never break a user's request.
- **Calendar export is a file download, not an API integration.** The `.ics` opens in the user's calendar app rather than writing directly to Google Calendar. This was a deliberate trade: it avoids requesting Workspace OAuth scopes for a single feature.
- **A project ID fallback is hardcoded** in `server.ts`. Harmless — project IDs are not secrets — but change it when forking.

---

## Verification

See [`TESTING.md`](./TESTING.md) for the full test plan and recorded results. Priority-zero tests cover the authentication boundary, cross-user isolation with two separate Google accounts, secret containment in the client bundle, and the Cloud Run label.

---

## Tech stack

React 19 · TypeScript · Vite · Tailwind · Express · Firebase Auth · Cloud Firestore · Gemini API (`@google/genai`) · `gemini-embedding-001` · Google Cloud Secret Manager · Cloud Run

Built with Google AI Studio using custom security instructions covering threat modeling, secure coding, database isolation, and secret management.

`#AccelerateAIwithCloudRun`