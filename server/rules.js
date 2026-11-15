// Fixed scam rules. These run on every post next to the AI, so known patterns
// are always flagged, even when the AI is offline or misses one.

const RULES = [
  { type: 'off_platform_payment', risk: 'high', re: /\b(zelle|venmo|cash ?app|cashapp|paypal|apple ?pay|gift ?cards?|crypto|bitcoin|usdt|friends (?:and|&) family|f&f)\b/i, why: 'Asks for a payment method with no buyer protection. Pay inside Teezy so the money is held until you have the ticket.' },
  { type: 'payment_before_transfer', risk: 'high', re: /\b(pay (?:first|upfront|up front|before)|send (?:the )?(?:money|payment) first|(?:zelle|venmo|cash ?app|pay|send) me(?: \$?\d+)? first|deposit)\b/i, why: 'Asks for money before the ticket is sent. With Teezy, the seller is paid only after the transfer.' },
  { type: 'urgency_pressure', risk: 'medium', re: /\b(first to (?:send|pay)|asap|right now|in the next \d+|only \d+ left|act fast|today only|gone soon)\b/i, why: 'Pressure to act fast is a common scam tactic.' },
  { type: 'suspicious_link', risk: 'high', re: /\b(?:https?:\/\/|www\.)\S+|\b\S+\.(?:ly|gg|xyz|top|click)\b/i, why: 'Contains a link. Never sign in to USC or pay through a link from a chat.' },
  { type: 'personal_info_request', risk: 'high', re: /\b(password|passcode|log ?in (?:info|details)|usc ?net ?id|ssn|verification code|2fa|duo code)\b/i, why: 'Asks for login details or codes. No real buyer or seller needs them.' },
  { type: 'impersonation', risk: 'high', re: /\b(usc (?:ticket )?office|athletics department|official usc|usg official)\b/i, why: 'Claims to speak for USC. USC staff do not sell tickets in group chats.' },
];

const PRICE_RE = /(?<![\/\d.:])\$?\b(\d{2,3})\b(?![\/:]|\s*(?:pm|am)\b)/gi;

export function prices(text) {
  return [...text.matchAll(PRICE_RE)].map((m) => Number(m[1])).filter((n) => n >= 5 && n <= 500);
}

export function findEvent(text, events) {
  const t = text.toLowerCase();
  return events.find((e) => e.keywords.some((k) => t.includes(k))) || null;
}

export function ruleSignals(text, events) {
  const signals = [];
  let risk = 'low';
  const bump = (r) => { if (r === 'high' || (r === 'medium' && risk === 'low')) risk = r; };
  for (const rule of RULES) {
    const m = text.match(rule.re);
    if (m) { signals.push({ type: rule.type, quote: m[0], why: rule.why, source: 'rule' }); bump(rule.risk); }
  }
  const event = findEvent(text, events);
  if (event) {
    const over = prices(text).find((p) => p > event.faceValue);
    if (over) {
      signals.push({ type: 'above_face_value', quote: `$${over}`, why: `Above the $${event.faceValue} face value. Teezy caps student resale at face value.`, source: 'rule' });
      bump('medium');
    }
  }
  return { signals, risk, event };
}
