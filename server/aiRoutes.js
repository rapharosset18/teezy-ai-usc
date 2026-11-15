// AI@USC hackathon routes: paste-your-post, the broker, and AI transfer checks.
import { AppError } from './errors.js';
import { createListing } from './services/listings.js';
import { createDesired } from './services/desiredTickets.js';
import { readPost, brokerFor, listOffers, answerOffer, checkTransferImage, aiStats } from './services/broker.js';
import { aiMode } from './ai.js';

// Keeps a public demo link from burning through the AI budget.
const hits = new Map();
function limitAI(userId) {
  const key = `${userId}:${Math.floor(Date.now() / 60000)}`;
  const n = (hits.get(key) || 0) + 1;
  hits.set(key, n);
  if (hits.size > 5000) hits.clear();
  if (n > 15) throw new AppError(429, 'slow_down', 'slow down a little and try again in a minute');
}

const tierFor = (eventId, tier) => tier || (eventId.startsWith('fb-') ? 'student' : 'ga');

export function registerAiRoutes(app, userId) {
  app.get('/api/ai/status', async () => ({ mode: aiMode(), ...(await aiStats()) }));

  app.post('/api/ai/read-post', async (req) => {
    const me = userId(req);
    limitAI(me);
    return readPost(me, req.body?.text);
  });

  // Seller: the confirmed card from a pasted post becomes a protected listing.
  app.post('/api/ai/listing', async (req, reply) => {
    const me = userId(req);
    const b = req.body || {};
    const listing = await createListing(me, {
      eventId: b.eventId, tier: tierFor(String(b.eventId || ''), b.tier), qty: b.qty,
      priceCents: b.priceCents, floorCents: b.floorCents, seatLabel: b.seatLabel,
      description: b.summary, sourceText: b.sourceText, scamRisk: b.scamRisk,
    });
    const broker = await brokerFor({ listingId: listing.id });
    return reply.code(201).send({ listing, broker, link: `/?listing=${listing.id}` });
  });

  // Buyer: an ISO post becomes a standing request the broker works on.
  app.post('/api/ai/request', async (req, reply) => {
    const me = userId(req);
    const b = req.body || {};
    const desired = await createDesired(me, { eventId: b.eventId, qty: b.qty, maxPriceCents: b.maxPriceCents, tier: b.tier, sourceText: b.sourceText });
    const broker = await brokerFor({ desiredId: desired.id });
    return reply.code(201).send({ desired, broker });
  });

  app.get('/api/broker/offers', async (req) => listOffers(userId(req)));
  app.post('/api/broker/offers/:id', async (req) => answerOffer(userId(req), req.params.id, req.body?.accept === true));

  app.post('/api/orders/:id/fills/:fillId/ai-check', { bodyLimit: 8 * 1024 * 1024 }, async (req) => {
    const me = userId(req);
    limitAI(me);
    return checkTransferImage(me, req.params.id, req.params.fillId, req.body || {});
  });
}
