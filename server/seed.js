// Demo data matching the web demo's listings (web/classic.html), so the feed cards and the
// order book agree. Prices are per ticket.
import { withTransaction } from './db.js';

const USERS = [
  ['mia', 'Mia Chen', 5.0],
  ['priya', 'Priya S.', 5.0], ['taylor', 'Taylor B.', 4.9], ['sam', 'Sam K.', 4.9],
  ['riley', 'Riley P.', 4.4], ['chris', 'Chris T.', 4.7], ['ana', 'Ana R.', 5.0],
  ['grant', 'Grant P.', 4.5], ['noah', 'Noah W.', 4.8], ['lena', 'Lena V.', 4.9], ['bella', 'Bella M.', 4.6],
  // Sellers the demo's "market move" uses.
  ['jordan-m', 'Jordan M.', 4.8], ['casey-l', 'Casey L.', 4.9], ['avery-d', 'Avery D.', 4.7],
  // Stand-ins for past trades, which feed the market average.
  ['past-seller', 'Past seller', 4.8], ['past-buyer', 'Past buyer', 4.8],
];

// Face values (last column, cents) are placeholders: confirm with the USC ticket office.
const EVENTS = [
  ['fb-asu', 'USC vs Arizona State', 'Coliseum', '2026-11-14T19:30:00-08:00', 8000],
  ['fb-nd', 'USC vs Oregon', 'Coliseum', '2026-11-21T17:00:00-08:00', 8000],
  ['fb-osu', 'USC vs Ohio State', 'Coliseum', '2026-11-28T12:30:00-08:00', 8000],
  ['org-showcase', 'Cardinal Dance Co. Fall Showcase', 'Bovard Auditorium', '2026-11-20T19:00:00-08:00', 1500],
  ['org-winterfest', 'Winter Fest on Trousdale', 'Trousdale Parkway', '2026-12-04T18:00:00-08:00', 1000],
];

// [seller, event, tier, section, seat label, price per ticket ($), qty, listed minutes ago]
const LISTINGS = [
  ['priya', 'fb-nd', 'ga', '108', 'Sec 108 · Row 5 · GA pair', 65, 2, 1440],
  ['taylor', 'fb-nd', 'ga', '110', 'Sec 110 · Row 22 · 2 seats', 55, 2, 300],
  ['sam', 'fb-nd', 'ga', '106', 'Sec 106 · Row 18 · Seat 2', 50, 1, 120],
  ['riley', 'fb-nd', 'student', '25', 'Sec 25 · Row 12 · 2 seats', 38, 2, 45],
  ['chris', 'fb-nd', 'student', '27', 'Sec 27 · Row 40 · Seat 8', 48, 1, 600],
  ['ana', 'fb-nd', 'reserved', '115', 'Sec 115 · Row 3 · 4 seats', 80, 4, 900],
  ['grant', 'org-showcase', 'ga', null, 'Fall Showcase · GA ×1', 15, 1, 400],
  ['noah', 'org-showcase', 'ga', null, 'Fall Showcase · GA ×2', 12, 2, 200],
  ['lena', 'org-winterfest', 'ga', null, 'Winter Fest · entry ×2', 10, 2, 500],
  ['bella', 'org-winterfest', 'ga', null, 'Winter Fest · entry ×1', 8, 1, 90],
];

// [event, tier, price per ticket ($), days ago]
const PAST_SALES = [
  ['fb-nd', 'ga', 55, 2], ['fb-nd', 'ga', 58, 3], ['fb-nd', 'ga', 60, 5], ['fb-nd', 'ga', 62, 6], ['fb-nd', 'ga', 65, 9], ['fb-nd', 'ga', 70, 12],
  ['fb-nd', 'student', 42, 1], ['fb-nd', 'student', 45, 4], ['fb-nd', 'student', 48, 7], ['fb-nd', 'student', 50, 8], ['fb-nd', 'student', 52, 15],
  ['fb-nd', 'reserved', 74, 3], ['fb-nd', 'reserved', 78, 10], ['fb-nd', 'reserved', 80, 20],
  ['org-winterfest', 'ga', 10, 2],
];

export const DEMO_TABLES = [
  'payment_webhooks', 'payment_ledger', 'seller_transfers', 'payments', 'seller_accounts',
  'sessions', 'email_login_codes', 'notifications', 'push_tokens', 'desired_ticket_notifications', 'desired_tickets',
  'order_fills', 'orders', 'listings', 'events', 'users',
];

export async function resetDemoData() {
  await withTransaction(async (client) => {
    const { rows: [{ n }] } = await client.query('SELECT count(*)::int AS n FROM payments');
    if (n) throw new Error('Demo reset cannot delete Stripe payment records. Use a separate empty database for a new demo.');
    await client.query(`TRUNCATE ${DEMO_TABLES.join(', ')} CASCADE`);
  });
}

// listings: false skips the sample sellers' listings, for a hosted test where real people list tickets.
export async function seedDemoData({ listings = true } = {}) {
  await withTransaction(async (client) => {
    for (const [id, name, rating] of USERS) {
      await client.query('INSERT INTO users (id, display_name, rating) VALUES ($1, $2, $3)', [id, name, rating]);
    }
    for (const [id, name, venue, startsAt, faceValueCents] of EVENTS) {
      await client.query('INSERT INTO events (id, name, venue, starts_at, face_value_cents) VALUES ($1, $2, $3, $4, $5)', [id, name, venue, startsAt, faceValueCents]);
    }
    for (const [seller, event, tier, section, seat, price, qty, ago] of listings ? LISTINGS : []) {
      await client.query(
        `INSERT INTO listings (event_id, seller_id, tier, section, seat_label, price_cents, qty_total, qty_available, priority_timestamp, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7, now() - $8 * interval '1 minute', now() - $8 * interval '1 minute')`,
        [event, seller, tier, section, seat, price * 100, qty, ago],
      );
    }
    for (const [event, tier, price, daysAgo] of PAST_SALES) {
      const when = `now() - ${Number(daysAgo)} * interval '1 day'`;
      const { rows: [l] } = await client.query(
        `INSERT INTO listings (event_id, seller_id, tier, price_cents, qty_total, qty_available, status, created_at)
         VALUES ($1, 'past-seller', $2, $3, 1, 0, 'sold', ${when}) RETURNING id`,
        [event, tier, price * 100],
      );
      const fee = Math.round(price * 100 * 0.1);
      const { rows: [o] } = await client.query(
        `INSERT INTO orders (buyer_id, event_id, tier, qty, max_price_cents, subtotal_cents, buyer_fee_cents, total_cents,
                             status, payment_expires_at, paid_at, created_at)
         VALUES ('past-buyer', $1, $2, 1, $3, $3, $4, $3::int + $4::int, 'paid', ${when}, ${when}, ${when}) RETURNING id`,
        [event, tier, price * 100, fee],
      );
      await client.query(
        `INSERT INTO order_fills (order_id, listing_id, seller_id, qty, price_cents, escrow_status)
         VALUES ($1, $2, 'past-seller', 1, $3, 'released')`,
        [o.id, l.id, price * 100],
      );
    }
  });
}
