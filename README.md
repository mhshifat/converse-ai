This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel 

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Production: multiple customers, Vercel Hobby, Neon

The app is set up so **multiple customers** can use the widget on **Vercel Hobby** with **Neon** in production.

- **Stateless API**: Serverless; no in-memory state. Scale is automatic.
- **Neon**: Set `DATABASE_URL` in Vercel to Neon’s **pooled** URL (host has `-pooler`). Optional: set `DIRECT_URL` to the direct URL for `prisma migrate` (see `prisma.config.ts`).
- **Indexes**: Conversation lists use indexes on `chatbot_id` and `(chatbot_id, started_at)` (migration `20260227130000_add_conversation_list_indexes`).
- **tRPC cache**: List/detail queries use `staleTime` so the UI doesn’t over-fetch (projects 60s, handoff 4s, conversations 30s).

**Neon steps**: Create DB → copy **pooled** connection string → set `DATABASE_URL` in Vercel → run `npx prisma migrate deploy` once. Optional: set `DIRECT_URL` for migrations.

**Vercel Hobby**: Keep serverless work short (DB + LLM). No long CPU work in API routes.

## Voice (TTS / STT in chat)

Chat voice (speak and hear agent replies) uses **Groq** for transcription (Whisper) and synthesis (Orpheus).

- Set **`GROQ_API_KEY`** in `.env`.
- **TTS (Orpheus)**: The default model requires a one-time terms acceptance. Open [Groq Playground — Orpheus](https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english) and accept the terms. Optional env: `GROQ_TTS_MODEL`, `GROQ_TTS_VOICE`.
- **STT**: Recorded audio is sent as WebM; ensure the browser produces a valid recording (speak clearly and pause so the chunk is long enough).

## Live human voice (WebRTC)

For **live voice** during handoff (human speaks, customer hears in real time), run the signaling server and point the app at it:

1. From repo root: `cd voice-signaling-server && npm install && npm start` (or deploy it to Railway/Render/Fly.io).
2. In the Next.js app set `NEXT_PUBLIC_VOICE_SIGNALING_WS_URL` (e.g. `ws://localhost:3001` for dev, `wss://your-signaling-host` for prod).

If unset, handoff still works with text and recorded voice messages; live WebRTC is simply disabled.

**Join auth:** Set the same **`VOICE_SIGNALING_JWT_SECRET`** on the Next.js app and the signaling server. For local signaling without JWT, you can set **`ALLOW_INSECURE_VOICE_SIGNALING=true`** on the signaling server only (never in production).

### Manual test checklist (full voice handoff)

**Prereqs**

- [ ] `NEXT_PUBLIC_VOICE_SIGNALING_WS_URL` points at your signaling host (`ws://…` local, `wss://…` prod).
- [ ] **Production:** `VOICE_SIGNALING_JWT_SECRET` is set and **identical** on web and signaling. **Dev (optional):** `ALLOW_INSECURE_VOICE_SIGNALING=true` on signaling only if you are not using JWT locally.

**Customer path (widget embed or project preview)**

- [ ] Start a **voice** conversation (`call` channel) and reach **human handoff** (agent assigned, handoff active for that conversation).
- [ ] Confirm the signaling WebSocket connects and stays up (no immediate close; customer UI shows live voice connected when appropriate).
- [ ] With the agent on live voice, verify **customer → agent** audio (speak a short test phrase on the customer side).

**Human agent path (live chat app)**

- [ ] Open **Live chat**, select the same conversation, **assign to me** if it is not already assigned.
- [ ] Use **Join live voice** (or equivalent) and confirm **agent → customer** and **customer → agent** audio.

**Wrap-up**

- [ ] **Leave** voice or **end** the conversation on both sides: mic stops, remote audio stops, no repeated errors in the browser console.
- [ ] **Optional hardening check:** With JWT enforced, a raw WebSocket that sends `join` **without** a valid `token` should be rejected (see signaling server logs / close reason).

### Keep Render (free tier) signaling warm from Next.js

The signaling server exposes `GET /health`. Your Next app can ping it on a schedule so the Render instance wakes up more often:

- **Vercel**: `vercel.json` includes a cron every 10 minutes calling `/api/cron/voice-signaling-ping`. Set **`CRON_SECRET`** in the Vercel project env; Vercel Cron will send `Authorization: Bearer <CRON_SECRET>` automatically.
- **Other hosts**: Use any scheduler (GitHub Actions, cron-job.org) to `GET` your deployed URL  
  `https://your-app.com/api/cron/voice-signaling-ping` with header `Authorization: Bearer <CRON_SECRET>` (same secret in env).
- Optional **`VOICE_SIGNALING_HTTP_URL`**: full HTTPS base if the health check URL should differ from the default derived from `NEXT_PUBLIC_VOICE_SIGNALING_WS_URL` (e.g. `https://your-service.onrender.com`).

This does not guarantee zero cold starts or stable WebSockets through a spin-down; see `voice-signaling-server/README.md`.