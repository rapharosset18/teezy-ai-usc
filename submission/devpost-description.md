# Teezy — Devpost submission text

Copy each section into the matching Devpost field. Fill in the bracketed placeholders before submitting.

---

## Tagline (short description)

A USC-only ticket exchange that's safe by design: post in one sentence, AI checks every listing and transfer, a private AI broker finds a fair price, and Stripe holds the money until the ticket arrives.

---

## Inspiration

On October 28, 2026, USC's Department of Public Safety emailed every student a Community Safety Advisory about football ticket scams on GroupMe. Students were paying for tickets that never arrived. Scammers claimed a payment "didn't go through" to get paid twice, used other students' USC ID photos to look legitimate, and asked buyers for their own ID photos to scam the next person.

We surveyed 16 USC students in September. All 16 had bought or sold a ticket directly from another person in the past year. 12 of 16 used group chats, Venmo/Cash App DMs or cash. 1 in 8 had lost money, both times through GroupMe and Venmo. None of them knew of a student ticket app with scam protection, and 12 of 16 said they would pay about $5 for a guaranteed-safe trade with a verified student. (Small, early sample; we say so.)

DPS's advice is to use a platform with buyer protection and confirm the official transfer. For students selling to students, that platform didn't exist.

## What it does

Teezy is a ticket exchange for verified USC students, safe by design: USC email sign-in, no chat with strangers, and money held on Stripe until the ticket arrives. Its rule is **AI proposes, code decides**: Claude reads the way students actually talk, and plain code makes every decision about price, matching and money.

- **Post in one sentence, checked by AI.** Type "selling my Ohio State ticket, want 70, would take 40" the way you'd text a friend. Claude fills in the game, quantity, price and your private lowest price, then checks the listing before it goes live. There's no chat between strangers on Teezy, so a listing is the only place a scammer could try to pull someone off the app; listings with outside payment ("Venmo me first"), phone numbers, @handles, links, requests for a USC ID, or prices above face value can't go live. Fixed rules check every listing too, even if the AI is offline.
- **Private AI broker.** A buyer posts "looking for Ohio State, 45 max." Claude turns it into a request, including the private limit nobody would say out loud. When a seller's private floor meets a buyer's private max, Teezy sets a fair price in between, caps it at face value, and holds the ticket for that buyer for 30 minutes. When they're close but don't overlap, both get a private offer. Neither side ever sees the other's number. Teezy is the only protected student exchange we found where you can negotiate, because we wanted every student to feel they got a fair price.
- **Escrow on Stripe.** The buyer pays once, through Stripe Checkout, and the money is held. The seller transfers the ticket in the official USC ticket app. The buyer uploads a screenshot and **Claude's vision checks it**: right game, right name, right number of tickets, any signs of editing. Only the buyer can confirm. Then the seller is paid through a Stripe Connect transfer. Refunds and disputes pause the payout automatically.

We built two versions: the **working build**, with real accounts, the AI features and Stripe escrow; and the **vision build**, which shows where Teezy goes next (offers and counteroffers, a watchlist, plans with friends, event albums) with sample data and the same AI listing check.

## How we built it

- **AI:** Claude (`claude-opus-5-5`) through the Anthropic SDK, with structured JSON outputs for reading posts and vision for checking transfer screenshots. Every AI call checks for refusals and cut-off answers, and falls back to the fixed rules if the AI fails.
- **Rules:** a fixed set of scam patterns written from the DPS advisory, run on every message alongside the AI.
- **Backend:** Node 22, Fastify, PostgreSQL, pg-boss background jobs, and server-sent events for live updates.
- **Payments:** Stripe Checkout for buyers, Stripe Connect for seller payouts, webhooks for payment state, delayed transfers, refunds and dispute handling. All in Stripe test mode.
- **Frontend:** a mobile-first single-page app in USC cardinal and gold, plus an interactive pitch deck that embeds both live builds.

## Challenges we ran into

- **Keeping private limits private.** Our first broker message quoted a buyer's private max back to a seller as "the highest offer." We rebuilt the market facts the AI sees so it only gets public numbers. The AI only ever sees one side's limit.
- **Holding a brokered deal.** Once the broker lowered a price for one buyer, anyone could have bought it first. We added a 30-minute hold, visible only to the matched buyer, that is released the moment they buy.
- **Closing the last way off the app.** We removed chat between strangers, so the only place a scammer could write "text me" or "Venmo me" was the listing itself. Listings with contact details or outside payment now can't go live, and we made sure phone numbers aren't mistaken for prices.
- **Scams that look normal.** The DPS tactics ("it didn't go through, send it again") don't contain an obvious red-flag word. We wrote rules for them and tested them against normal listings that shouldn't be flagged.
- **Payments inside a pitch deck.** Stripe's checkout refuses to load inside an embedded page, so when the app runs inside the deck, Stripe opens in a new tab.

## Accomplishments that we're proud of

- A real Stripe test-mode purchase works end to end: Checkout, the webhook, the money held, and payout only after the buyer confirms.
- The broker finds a deal neither side could have found in a group chat, without either side revealing their number.
- Every scam tactic in the DPS advisory is either impossible on Teezy by design or blocked by the AI listing check, with the exact words quoted.

## What we learned

The safest design removes the places scams happen (stranger chat, outside payment) and uses AI to make the safe path effortless: post in one sentence, get a fair price, get the right ticket. The AI should never be the part that moves money. Splitting "AI reads and suggests" from "code decides and pays" made the system both more capable and easier to trust.

## What's next for Teezy

- **Spring 2027 pilot** with USG: spring sports and two or three large student-org events, measuring scams flagged, trades protected and money held.
- **Fall 2027:** the full home football season, sharing scam reports with DPS with student consent.
- What we need from USG is a link in official channels next to DPS's ticket-safety advice. A USC partnership is our proposal, not something USC has approved, and resale policy needs to be confirmed with USC.

---

## Built with

claude, anthropic-api, node.js, fastify, postgresql, stripe, stripe-connect, javascript, html, css, server-sent-events

## Links

- Prototype: https://teezy-ai-usc-production.up.railway.app (vision build: /?demo)
- GitHub: https://github.com/rapharosset18/teezy-ai-usc
- Video: [video link]
- Deck: https://teezy-ai-usc-production.up.railway.app/deck/ (PDF in the repo: deck/teezy-deck-mock.pdf)

## Team

Raphael Rosset, Lorenzo Giberti
