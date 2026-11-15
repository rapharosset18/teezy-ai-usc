// AI@USC hackathon: the TZ broker.
//   1. readPost: the AI turns a pasted group-chat post into an order and checks it for scams.
//   2. brokerFor*: plain code matches private limits. The AI only writes the messages.
//   3. checkTransferImage: the AI reads a transfer screenshot; a person still confirms.
// AI proposes, code decides: prices, matches and money never come from the model.

import { query, withTransaction } from '../db.js';
import { badRequest, notFound, forbidden, conflict } from '../errors.js';
import { readPost as aiReadPost, brokerNudge, checkTransfer, aiMode } from '../ai.js';
import { updateListing } from './listings.js';
import { updateDesired } from './desiredTickets.js';
import { notificationDto, sendPush } from './push.js';

const NICKNAMES = {
  'arizona state': ['asu', 'sun devils'], oregon: ['ducks', 'uo '], 'ohio state': ['osu', 'buckeyes'],
  ucla: ['bruins'], 'notre dame': ['nd ', 'irish'],
};

const dollars = (cents) => (cents == null ? null : cents / 100);
const money = (cents) => '$' + (cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100));

export async function eventsForAI() {
  const { rows } = await query(`SELECT id, name, venue, starts_at, face_value_cents FROM events WHERE starts_at > now() ORDER BY starts_at`);
  return rows.map((e) => {
    const opponent = e.name.toLowerCase().replace(/^usc vs\.? /, '');
    const keywords = [opponent, ...(NICKNAMES[opponent] || [])];
    if (!/^usc vs/i.test(e.name)) keywords.push(...e.name.toLowerCase().split(/\s+/).filter((w) => w.length > 5));
    return {
      id: e.id, name: e.name,
      date: new Date(e.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }),
      faceValue: dollars(e.face_value_cents) ?? 500, keywords,
    };
  });
}

export async function readPost(userId, text) {
  if (typeof text !== 'string' || text.trim().length < 3) throw badRequest('paste your post or message first');
  if (text.length > 2000) throw badRequest('that message is too long; paste just the ticket post');
  const events = await eventsForAI();
  const result = await aiReadPost(text.trim(), events);
  await query('INSERT INTO ai_checks (user_id, kind, risk, signals, source) VALUES ($1, $2, $3, $4, $5)',
    [userId, 'post', result.scamRisk, result.scamSignals.map((s) => s.type), result.source]);
  const event = events.find((e) => e.id === result.eventId);
  return { ...result, event: event ? { id: event.id, name: event.name, date: event.date, faceValue: event.faceValue } : null, aiMode: aiMode() };
}

export async function faceValueCents(eventId) {
  const { rows: [e] } = await query('SELECT face_value_cents FROM events WHERE id = $1', [eventId]);
  return e?.face_value_cents ?? null;
}

// ---------- broker ----------

async function marketFor(eventId) {
  const { rows: [m] } = await query(
    `SELECT (SELECT count(*)::int FROM listings WHERE event_id = $1 AND status = 'active') AS sellers,
            (SELECT count(*)::int FROM desired_tickets WHERE event_id = $1 AND NOT paused) AS buyers,
            (SELECT min(price_cents) FROM listings WHERE event_id = $1 AND status = 'active') AS low_ask`,
    [eventId],
  );
  // Buyers' max prices are private limits, so only counts and public asks go into messages.
  return { sellers: m.sellers, buyers: m.buyers, lowestAsk: dollars(m.low_ask) };
}

async function pushNote(client, userId, title, body, data) {
  const { rows: [n] } = await client.query(
    `INSERT INTO notifications (user_id, kind, title, body, deep_link, data) VALUES ($1, 'broker', $2, $3, $4, $5) RETURNING *`,
    [userId, title, body, '/?broker=1', data],
  );
  return notificationDto(n);
}

// Pairs that can trade: same event, enough tickets, different people, matching section if the buyer set one.
const PAIRS = `
  FROM listings l
  JOIN desired_tickets d ON d.event_id = l.event_id AND NOT d.paused
    AND (d.tier IS NULL OR d.tier = l.tier) AND l.qty_available >= d.qty AND d.user_id <> l.seller_id
  JOIN events e ON e.id = l.event_id
  WHERE l.status = 'active' AND e.starts_at > now()
    AND NOT EXISTS (SELECT 1 FROM broker_offers b WHERE b.listing_id = l.id AND b.desired_ticket_id = d.id)`;

// Run after a listing or desired ticket is created from a post.
export async function brokerFor({ listingId = null, desiredId = null }) {
  const { rows } = await query(
    `SELECT l.id AS listing_id, l.seller_id, l.price_cents, COALESCE(l.floor_cents, l.price_cents) AS floor_cents,
            d.id AS desired_id, d.user_id AS buyer_id, d.max_price_cents, e.id AS event_id, e.name AS event_name, e.face_value_cents
     ${PAIRS} AND ${listingId ? 'l.id = $1' : 'd.id = $1'}
     ORDER BY l.priority_timestamp, d.created_at`,
    [listingId || desiredId],
  );
  if (!rows.length) return { outcome: 'waiting' };

  // Already affordable at the listed price: the existing desired-ticket alert handles it.
  if (rows.some((r) => r.price_cents <= r.max_price_cents)) return { outcome: 'available' };

  // 1. Limits overlap: the seller already said they'd take less. Lower the listing to the
  //    midpoint of the seller's floor and the buyer's max, which fires the buyer's alert.
  const overlap = rows.filter((r) => r.floor_cents <= r.max_price_cents)
    .sort((a, b) => b.max_price_cents - a.max_price_cents)[0];
  if (overlap) {
    const cap = overlap.face_value_cents ?? Infinity;
    const price = Math.min(cap, overlap.max_price_cents, Math.max(overlap.floor_cents, Math.round((overlap.floor_cents + overlap.max_price_cents) / 200) * 100));
    await updateListing(overlap.listing_id, overlap.seller_id, { priceCents: price });
    await withTransaction(async (client) => {
      const n = await pushNote(client, overlap.seller_id, `Broker matched your ${overlap.event_name} ticket`,
        `A buyer's max was within your private floor, so your listing is now ${money(price)}. Your money is held until they have the ticket.`,
        { listingId: overlap.listing_id, priceCents: price });
      await sendPush(n);
    });
    return { outcome: 'matched', priceCents: price, eventName: overlap.event_name };
  }

  // 2. No overlap: if the closest pair is near, propose one price to both, privately.
  const closest = rows.sort((a, b) => (a.floor_cents - a.max_price_cents) - (b.floor_cents - b.max_price_cents))[0];
  const gap = closest.floor_cents - closest.max_price_cents;
  if (gap > (closest.face_value_cents ?? 10000) * 0.4) return { outcome: 'waiting' };
  const price = Math.min(closest.face_value_cents ?? Infinity, Math.round((closest.floor_cents + closest.max_price_cents) / 200) * 100);
  const market = await marketFor(closest.event_id);
  const event = { name: closest.event_name };
  // Each message is written from that side's own price and public numbers only.
  const [sell, buy] = await Promise.all([
    brokerNudge({ side: 'sell', event, myPrice: dollars(closest.price_cents), proposal: dollars(price), market }),
    brokerNudge({ side: 'buy', event, myPrice: dollars(closest.max_price_cents), proposal: dollars(price), market }),
  ]);
  const offer = await withTransaction(async (client) => {
    const { rows: [o] } = await client.query(
      `INSERT INTO broker_offers (listing_id, desired_ticket_id, price_cents, seller_message, buyer_message)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING *`,
      [closest.listing_id, closest.desired_id, price, sell.message, buy.message],
    );
    if (!o) return null;
    const notes = [
      await pushNote(client, closest.seller_id, 'TZ broker has an offer for you', sell.message, { offerId: o.id }),
      await pushNote(client, closest.buyer_id, 'TZ broker has an offer for you', buy.message, { offerId: o.id }),
    ];
    return { o, notes };
  });
  if (!offer) return { outcome: 'waiting' };
  for (const n of offer.notes) await sendPush(n);
  return { outcome: 'offer', offerId: offer.o.id, priceCents: price, source: sell.source };
}

function offerDto(o, userId) {
  const side = o.seller_id === userId ? 'sell' : 'buy';
  return {
    id: o.id, side, eventId: o.event_id, eventName: o.event_name, priceCents: o.price_cents,
    message: side === 'sell' ? o.seller_message : o.buyer_message,
    myAnswer: side === 'sell' ? o.seller_answer : o.buyer_answer,
    status: o.status, createdAt: o.created_at,
  };
}

const OFFER_SELECT = `SELECT b.*, l.seller_id, l.event_id, d.user_id AS buyer_id, e.name AS event_name
  FROM broker_offers b JOIN listings l ON l.id = b.listing_id JOIN desired_tickets d ON d.id = b.desired_ticket_id
  JOIN events e ON e.id = l.event_id`;

export async function listOffers(userId) {
  const { rows } = await query(`${OFFER_SELECT} WHERE l.seller_id = $1 OR d.user_id = $1 ORDER BY b.created_at DESC LIMIT 20`, [userId]);
  return rows.map((o) => offerDto(o, userId));
}

export async function answerOffer(userId, offerId, accept) {
  const result = await withTransaction(async (client) => {
    const { rows: [o] } = await client.query(`${OFFER_SELECT} WHERE b.id = $1 FOR UPDATE OF b`, [offerId]);
    if (!o) throw notFound('offer');
    if (o.seller_id !== userId && o.buyer_id !== userId) throw forbidden('this offer is not yours');
    if (o.status !== 'open') throw conflict('closed', 'this offer is no longer open');
    const isSeller = o.seller_id === userId;
    const answers = { seller: isSeller ? Boolean(accept) : o.seller_answer, buyer: isSeller ? o.buyer_answer : Boolean(accept) };
    const status = !accept ? 'declined' : answers.seller && answers.buyer ? 'accepted' : 'open';
    const { rows: [after] } = await client.query(
      `UPDATE broker_offers SET seller_answer = $2, buyer_answer = $3, status = $4, updated_at = clock_timestamp()
       WHERE id = $1 RETURNING *`,
      [offerId, answers.seller, answers.buyer, status],
    );
    return { o: { ...o, ...after } };
  });
  const o = result.o;
  if (o.status === 'accepted') {
    // Both said yes: the buyer's max rises and the listing drops to the agreed price,
    // which fires the buyer's "your ticket hit your price" alert so they can pay.
    await updateDesired(o.buyer_id, o.desired_ticket_id, { maxPriceCents: o.price_cents });
    await updateListing(o.listing_id, o.seller_id, { priceCents: o.price_cents });
  }
  return offerDto(o, userId);
}

// ---------- transfer screenshot ----------

export async function checkTransferImage(userId, orderId, fillId, { contentType, data }) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) throw badRequest('upload a PNG or JPEG screenshot');
  if (typeof data !== 'string' || data.length > 6 * 1024 * 1024) throw badRequest('the screenshot must be under 4 MB');
  const { rows: [f] } = await query(
    `SELECT f.*, o.buyer_id, e.name AS event_name, e.starts_at, u.display_name AS buyer_name
     FROM order_fills f JOIN orders o ON o.id = f.order_id JOIN events e ON e.id = o.event_id JOIN users u ON u.id = o.buyer_id
     WHERE f.id = $1 AND f.order_id = $2`, [fillId, orderId]);
  if (!f) throw notFound('ticket');
  if (f.buyer_id !== userId && f.seller_id !== userId) throw forbidden('not your order');
  if (!['transferred', 'confirmed', 'released'].includes(f.escrow_status)) throw conflict('wrong_step', 'the seller has not sent the ticket yet');
  const check = await checkTransfer({
    imageBase64: data, mediaType: contentType,
    deal: { quantity: f.qty },
    event: { name: f.event_name, date: new Date(f.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }) },
    buyerName: f.buyer_name,
  });
  const stored = { ...check, by: f.buyer_id === userId ? 'buyer' : 'seller', at: new Date().toISOString() };
  await query('UPDATE order_fills SET ai_check = $2, updated_at = clock_timestamp() WHERE id = $1', [fillId, stored]);
  await query('INSERT INTO ai_checks (user_id, kind, risk, signals, source) VALUES ($1, $2, $3, $4, $5)',
    [userId, 'transfer', check.verdict, check.editingSigns.length ? ['editing_signs'] : [], check.source]);
  return stored;
}

// Impact numbers for the demo and the deck: how many posts were checked and flagged.
export async function aiStats() {
  const { rows: [s] } = await query(
    `SELECT count(*) FILTER (WHERE kind = 'post')::int AS posts,
            count(*) FILTER (WHERE kind = 'post' AND risk IN ('medium', 'high'))::int AS flagged,
            count(*) FILTER (WHERE kind = 'transfer')::int AS transfers
     FROM ai_checks`);
  return s;
}
