// Fixed scam rules. These run on every post next to the AI, so known patterns
// are always flagged, even when the AI is offline or misses one.

const RULES = [
  { type: 'off_platform_payment', risk: 'high', re: /\b(zelle|venmo|cash ?app|cashapp|paypal|apple ?pay|gift ?cards?|crypto|bitcoin|usdt|friends (?:and|&) family|f&f)\b/i, why: 'Asks for a payment method with no buyer protection. Pay inside Teezy so the money is held until you have the ticket.' },
  { type: 'payment_before_transfer', risk: 'high', re: /\b(pay (?:first|upfront|up front|before)|send (?:the )?(?:money|payment) first|(?:zelle|venmo|cash ?app|pay|send) me(?: \$?\d+)? first|deposit)\b/i, why: 'Asks for money before the ticket is sent. With Teezy, the seller is paid only after the transfer.' },
  { type: 'urgency_pressure', risk: 'medium', re: /\b(first to (?:send|pay)|asap|right now|in the next \d+|only \d+ left|act fast|today only|gone soon)\b/i, why: 'Pressure to act fast is a common scam tactic.' },
  { type: 'suspicious_link', risk: 'high', re: /\b(?:https?:\/\/|www\.)\S+|\b\S+\.(?:ly|gg|xyz|top|click)\b/i, why: 'Contains a link. Never sign in to USC or pay through a link from a chat.' },
  // From the USC DPS advisory (Oct 28, 2026): fake "payment failed" claims, switched payment accounts, and ID photo requests.
  { type: 'payment_trick', risk: 'high', re: /\b((?:payment|zelle|venmo|cash ?app|it|transfer|money)\s+(?:didn'?t|did not|never|doesn'?t)\s+(?:go through|went through|come through|came through|work|show up|arrive)|(?:payment|transfer)\s+(?:failed|bounced|was unsuccessful)|(?:send|pay)\s+(?:it\s+)?again|send (?:it )?one more time|(?:use|send (?:it )?to)\s+(?:my\s+)?(?:other|new|friend'?s|roommate'?s|backup)\s+(?:account|venmo|zelle|cash ?app))/i, why: 'Claims a payment failed or asks you to pay a different account. USC DPS warns this is how GroupMe scammers take several payments. Teezy takes one payment and holds it.' },
  { type: 'personal_info_request', risk: 'high', re: /\b(password|passcode|log ?in (?:info|details)|usc ?net ?id|ssn|verification code|2fa|duo code|(?:pic|picture|photo|selfie|screenshot)\s+(?:of|with)\s+(?:your|ur|you'?re)\s+(?:usc\s+|student\s+)?id|send (?:me )?(?:your|ur) (?:usc |student )?id)\b/i, why: 'Asks for login details, codes or a photo of your USC ID. USC DPS warns scammers reuse ID photos to target other students. Teezy verifies students by USC email instead.' },
  { type: 'impersonation', risk: 'high', re: /\b(usc (?:ticket )?office|athletics department|official usc|usg official|here'?s my usc id|(?:i'?ll|let me) send (?:you )?my (?:usc |student )?id)\b/i, why: 'Claims to speak for USC or offers a USC ID as proof. USC DPS warns an ID photo does not prove who is selling. Teezy checks every seller\'s USC email.' },
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
