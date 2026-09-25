/**
 * Hard business rules for the sales agent.
 *
 * These are deliberately kept out of the system prompt as data, so the same
 * numbers drive the prompt, the outgoing-message guard, and the UI. Change a
 * value here and every layer follows.
 */

export const BUSINESS = {
  name: "Miami Motors",
  legalName: "Miami Motors Used Auto Spare Parts Trading Co. LLC",
  yard: "Industrial Area, Sharjah, United Arab Emirates",
  whatsapp: "971508997740",
  whatsappDisplay: "+971 50 899 7740",
  email: "sales@jdmmiamotors.com",
  markets: ["Africa", "the Gulf", "South America", "Asia"],
  instagram: "https://www.instagram.com/miamimotorsjdm/?hl=en",
  facebook: "https://www.facebook.com/jdmmiamimotors",
} as const;

export const POLICY = {
  /** Below this, we do not sell. The agent pitches up to it rather than refusing. */
  minOrderUnits: 5,
  /** The carrot offered to single-unit buyers who agree to hit the minimum. */
  shippingDiscountPct: 30,
} as const;

/**
 * The one thing the agent must never do. Prices move with scrap rates, engine
 * condition and destination port, so only a human quotes them.
 */
export const NEVER_QUOTE_REASON =
  "prices change with condition, quantity and destination port, so only the sales team quotes";
