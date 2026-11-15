-- AI@USC hackathon: a price the broker sets for one buyer is held for that buyer only,
-- for a short window, so another buyer can't take the deal the broker negotiated.
ALTER TABLE listings
  ADD COLUMN reserved_for text REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN reserved_until timestamptz;
