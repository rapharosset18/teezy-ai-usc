# Teezy — 3-minute video script and shot list

**Length target: 2:50** (Devpost limit is 3:00). Words are paced at about 150 per minute.
Devpost wants a walkthrough of the user workflow **and** the live prototype, so most of the time is screen recording of the real app.

## Before you hit record

- [ ] Anthropic credits added, so the listing check says **"Read by Claude"** (not "Offline rules")
- [ ] Running: the app (`localhost:3600`), the deck (`localhost:3700`), and Stripe's webhook forwarder
- [ ] Stripe sandbox renamed to "Teezy" (so checkout doesn't say "Teazy sandbox")
- [ ] Grant has Ohio State tickets at $45 (the only seller who can be paid)
- [ ] Browser zoomed so the phone and deck text are readable; notifications off
- [ ] Do one full dry run, including the Stripe checkout, right before recording
- [ ] Record the screen at 1080p with QuickTime (File → New Screen Recording) or Loom

Test card: `4242 4242 4242 4242`, any future date, any CVC, ZIP `90007`. Untick "Save my information".

---

## Script

### 0:00–0:12 · Hook — deck opening
**Screen:** deck at `localhost:3700`, the 3D badge. Click it: it dips, springs, dives into the red title slide.
**Say:** "Two weeks ago, every USC student got this email." *(click to slide 2)*

### 0:12–0:35 · The problem — slides 2 and 3
**Screen:** slide 2, click through the four DPS tactics. Then slide 3, the survey numbers counting up.
**Say:** "USC's Department of Public Safety warned about football ticket scams on GroupMe: sellers who take the money and disappear, fake 'payment didn't go through' requests, and stolen USC ID photos. We asked students. Every one of them trades tickets with strangers. One in eight has lost money. None of them knew a safe option, and three in four would pay five dollars for one."

### 0:35–0:45 · The idea — slide 4
**Screen:** slide 4, then click once for the "AI proposes, code decides" line.
**Say:** "So we built Teezy, a USC-only ticket exchange. The AI reads how students actually talk. Code makes every decision about money."

### 0:45–1:15 · Live demo 1: post in one sentence, checked by AI
**Screen:** the app. Tap the **teezy AI** button; the sheet grows out of it. Tap **Sell a ticket** → **Fill it in with AI** → the listing fills in with a private lowest price and "Checked by AI. Ready to go live." Then **Start another** → **Blocked listing** → **Fill it in with AI** → "This can't go live yet."
**Say:** "On Teezy you post a ticket the way you'd text a friend. Claude fills in the game, the price, and the lowest price I'd take, which stays private. Then it checks the listing before it goes live. If someone tries to sneak in 'Venmo me first' or a phone number, it can't go live. And there's no chat with strangers on Teezy, so there's nowhere for a scammer to pull you off the app."

### 1:15–1:50 · Live demo 2: the private broker
**Screen:** **Start another** → type *"Looking for 1 Ohio State ticket, can do 45 max"* → **Fill it in with AI** → **Find me a ticket**. Show "Your price is $__, held for you only until …". Then cut to slide 6 and click through: seller $40, buyer $45, the $43 deal drops in.
**Say:** "Now the part that wasn't possible before. In a group chat, nobody says their real number. On Teezy, I tell the broker my real max, and it stays private. A seller told it the lowest they'd take. The AI reads both, and code finds the overlap: a fair price in the middle, capped at face value, held for me for thirty minutes. Neither of us ever saw the other's number."

### 1:50–2:25 · Live demo 3: escrow on Stripe
**Screen:** tap **Buy it now** (or open Ohio State → Grant's $45 ticket) → **Continue to Stripe checkout** → Stripe sandbox page → test card → **Pay** → back in the app, the order shows paid and held. Then flash slide 7 (the $43 coin walking to HELD) and slide 8 (the Stripe event log).
**Say:** "I pay once, through Stripe, and the money is held, not sent to the seller. The seller transfers the ticket in the official USC app. I upload a screenshot, and Claude's vision checks it's the right game, the right name and the right number of tickets. Only I can confirm. Then Stripe pays the seller. This is the real Stripe API in test mode."

### 2:25–2:40 · Why us, and the vision build — slides 11 and 9
**Screen:** slide 11, the comparison table; click to light up the AI rows. Then slide 9, tap around the vision-build phone for two seconds.
**Say:** "StubHub, Ticketmaster and Gametime refund you after something goes wrong. Teezy is safe by design, with AI checking every listing and transfer, and it's the only protected app where students can negotiate. And here's where it's going next: offers, a watchlist, and planning with friends."

### 2:40–2:52 · The ask — slides 12 and 13
**Screen:** slide 12 (rollout), then slide 13.
**Say:** "It runs today on USC email and Stripe, with no new USC systems. We're proposing a spring pilot with USG. Let's make the next DPS ticket email unnecessary."

---

## Editing notes

- If you run long, cut the vision-build line in 2:25–2:40 first, then shorten demo 2's slide clicks.
- Speed up the Stripe form-filling 2× in the edit; keep the "paid, held" moment at normal speed.
- Add captions for the key moments: "listing blocked: outside payment", "limits stay private", "money held on Stripe".
- Export at 1080p. Upload to YouTube (unlisted is fine) or Vimeo and paste the link into Devpost.
