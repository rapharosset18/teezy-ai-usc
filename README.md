# Teezy: protected ticket trading for Trojans, with AI where scams start

**AI@USC 2026 (HackSC × USC AI Committee) entry.**

On Oct 28, 2026, USC's Department of Public Safety emailed every student about rising football-ticket fraud on GroupMe: sellers who take the money and never transfer, fake "your payment didn't go through" requests, and stolen USC ID photos. Teezy is a USC-only ticket exchange that stops those scams *before* a student pays.

- **Live prototype:** _add the hosted link here_
- **Pitch deck:** `/deck/` on the hosted link, or `deck/teezy-deck-mock.pdf`
- **Video:** _add the link here_

## What the AI does

**AI proposes, code decides.** Claude reads messy group-chat language. Plain code makes every decision about price, matching and money.

| Feature | What happens |
|---|---|
| **AI scam check** | Paste a GroupMe post or a DM you received. Claude (with structured JSON output) flags the tactics from the DPS advisory and quotes the exact words: payment outside the app, "payment failed, send again", requests for your USC ID, fake USC proof, pressure to hurry, links, above-face-value prices. Fixed rules run on every message too, so known scams are caught even if the AI misses one or is offline. |
| **Private AI broker** | Paste "selling osu 70, would take 40" or "ISO osu, 45 max". Claude turns it into an order, including the private limit. Code finds overlaps: if a seller's private floor is at or under a buyer's private max, it sets a fair price in the middle (capped at face value) and holds that ticket for that buyer only, for 30 minutes. If limits don't meet but are close, both sides get a private offer. Neither side ever sees the other's limit. |
| **AI-checked transfer** | After the seller transfers in the official USC ticket app, the buyer uploads a screenshot. Claude's vision checks the game, the name and the number of tickets, and flags signs of editing. The buyer still decides; only they can confirm. |

## Escrow on Stripe

The buyer pays through **Stripe Checkout**. The money is held: the seller is paid by a **Stripe Connect** transfer only after the buyer confirms the ticket arrived (and 24 hours after the event starts). Refunds and disputes pause the payout. Everything here runs in Stripe's test mode.

## Two builds

- **Working build** (`/`): real accounts, listings, the AI scam check and broker, Stripe escrow, AI transfer check.
- **Vision build** (`/?demo`): every planned feature with sample data (offers and counteroffers, a watchlist, plans with friends, event albums) plus the same AI scam check and a simulated broker.

## Safety and privacy choices

- The AI never sees the other side's private limit, and buyers' maxes are never shown to sellers.
- Messages are treated as data. The AI has no power to change a price, match a trade or release money.
- If the AI is unreachable, the fixed rules still check every post and trades still work.
- Sign-in is by USC email; nobody is asked for an ID photo.
- Student resale is capped at face value.

## Tech stack

Node 22, Fastify, PostgreSQL (embedded locally), pg-boss jobs, server-sent events for live updates, a vanilla JS single-page app, Stripe Checkout + Connect, and the Anthropic SDK (`claude-opus-5-5`) with structured outputs and vision.

Key files:

- `server/ai.js`: the Claude calls (read a post, check a transfer screenshot, broker messages) and their offline fallbacks
- `server/rules.js`: the fixed scam rules
- `server/services/broker.js`: matching, fair price, the 30-minute hold, private offers
- `server/services/payments.js`: Stripe Checkout, webhooks, held funds, Connect transfers, refunds, disputes
- `web/backend.js`: the app's broker screens and the API connection
- `deck/index.html`: the interactive pitch deck

## Run it locally

Needs Node 22. Postgres runs embedded, so there's nothing else to install.

```bash
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY and Stripe test keys; without them the offline rules run
npm run dev            # http://localhost:3600
npm run payments:listen   # second terminal, when using Stripe: forwards Stripe webhooks to the app
```

The deck is at http://localhost:3600/deck/.

## Hosting (Railway)

See `DEPLOY.md`. For the hackathon link, two extra variables:

- `DEMO_SIGN_IN=true` shows the sign-in code on screen instead of emailing it.
- `DEMO_STRIPE_SELLER_ACCOUNT=acct_…` links the sample seller Grant to a Stripe test connected account and gives him tickets, so a test checkout can complete.
