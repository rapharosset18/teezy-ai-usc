-- AI@USC hackathon: face-value cap, private limits for the AI broker,
-- broker offers, AI transfer checks, and a log of AI scam checks.

ALTER TABLE events ADD COLUMN face_value_cents integer CHECK (face_value_cents IS NULL OR face_value_cents > 0);

-- A seller's private floor ("would take 55"). Only the seller and the matching
-- code read it; it is never sent to buyers or to the AI.
ALTER TABLE listings
  ADD COLUMN floor_cents integer CHECK (floor_cents IS NULL OR floor_cents > 0),
  ADD COLUMN source_text text,
  ADD COLUMN scam_risk text CHECK (scam_risk IS NULL OR scam_risk IN ('low', 'medium', 'high'));

ALTER TABLE desired_tickets ADD COLUMN source_text text;

-- When a seller's floor and a buyer's max don't meet, the broker proposes one
-- price to both sides privately. Both must accept.
CREATE TABLE broker_offers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  desired_ticket_id uuid NOT NULL REFERENCES desired_tickets(id) ON DELETE CASCADE,
  price_cents       integer NOT NULL CHECK (price_cents > 0),
  seller_message    text NOT NULL,
  buyer_message     text NOT NULL,
  seller_answer     boolean,
  buyer_answer      boolean,
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'declined', 'closed')),
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at        timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX broker_offers_listing_idx ON broker_offers (listing_id) WHERE status = 'open';
CREATE INDEX broker_offers_desired_idx ON broker_offers (desired_ticket_id) WHERE status = 'open';
CREATE UNIQUE INDEX broker_offers_pair_idx ON broker_offers (listing_id, desired_ticket_id);

-- What the AI read on a transfer screenshot. A person still confirms.
ALTER TABLE order_fills ADD COLUMN ai_check jsonb;

-- Every post the scam check reads, for the impact numbers (no message text kept).
CREATE TABLE ai_checks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text REFERENCES users(id) ON DELETE SET NULL,
  kind       text NOT NULL CHECK (kind IN ('post', 'transfer')),
  risk       text,
  signals    text[] NOT NULL DEFAULT '{}',
  source     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
