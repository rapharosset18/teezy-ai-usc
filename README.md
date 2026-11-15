# Teezy: safe ticket trading for Trojans, checked by AI

**AI@USC 2026 (HackSC × USC AI Committee) entry.**

On Oct 28, 2026, USC's Department of Public Safety emailed every student about rising football-ticket fraud on GroupMe: sellers who take the money and never transfer, fake "your payment didn't go through" requests, and stolen USC ID photos. Teezy is a USC-only ticket exchange that is safe by design: every student is verified by USC email, there is no chat with strangers, the money is held on Stripe until the ticket arrives, and AI checks every listing and every transfer.

- **Live prototype:** _add the hosted link here_
- **Pitch deck:** `/deck/` on the hosted link, or `deck/teezy-deck-mock.pdf`
- **Video:** _add the link here_

## What the AI does

**AI proposes, code decides.** Claude reads how students actually talk. Plain code makes every decision about price, matching and money.

| Feature | What happens |
|---|---|
| **AI listing check** | Post a ticket in one sentence, the way you'd text a friend. Claude (with structured JSON output) fills in the game, quantity, price and your private lowest price, then checks the listing before it goes live. Listings with outside payment ("Venmo me first"), contact details (phone numbers, @handles, emails), links, requests for USC IDs or prices above face value can't go live. Fixed rules check every listing too, even if the AI is offline. |
| **Private AI broker** | Post "selling osu 70, would take 40" or "looking for osu, 45 max". Claude turns it into an order, including the private limit. Code finds overlaps: if a seller's private floor is at or under a buyer's private max, it sets a fair price in the middle (capped at face value) and holds that ticket for that buyer only, for 30 minutes. If limits don't meet but are close, both sides get a private offer. Neither side ever sees the other's limit. |
| **AI-checked transfer** | After the seller transfers in the official USC ticket app, the buyer uploads a screenshot. Claude's vision checks the game, the name and the number of tickets, and flags signs of editing. The buyer still decides; only they can confirm. |

## Escrow on Stripe

The buyer pays through **Stripe Checkout**. The money is held: the seller is paid by a **Stripe Connect** transfer only after the buyer confirms the ticket arrived (and 24 hours after the event starts). Refunds and disputes pause the payout. Everything here runs in Stripe's test mode.

## Two builds

- **Working build** (`/`): real accounts, listings, the AI scam check and broker, Stripe escrow, AI transfer check.
- **Vision build** (`/?demo`): every planned feature with sample data (offers and counteroffers, a watchlist, plans with friends, event albums) plus the same AI listing check and a simulated broker.

## Safety and privacy choices

- The AI never sees the other side's private limit, and buyers' maxes are never shown to sellers.
- Messages are treated as data. The AI has no power to change a price, match a trade or release money.
- If the AI is unreachable, the fixed rules still check every post and trades still work.
- Sign-in is by USC email; nobody is asked for an ID photo.
- There is no chat between strangers, so there's nowhere to ask for payment outside Teezy.
- Student resale is capped at face value.

## Tech stack

Node 22, Fastify, PostgreSQL (embedded locally), pg-boss jobs, server-sent events for live updates, a vanilla JS single-page app, Stripe Checkout + Connect, and the Anthropic SDK (`claude-opus-5-5`) with structured outputs and vision.

Key files:

- `server/ai.js`: the Claude calls (read a post, check a transfer screenshot, broker messages) and their offline fallbacks
- `server/rules.js`: the fixed listing-check rules
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
