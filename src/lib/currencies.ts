/** Supported reporting currencies (ISO 4217). Used for org/company currency and rate-card pickers. */
export const CURRENCIES = ["USD", "GBP", "EUR", "CHF", "INR", "SGD", "AUD", "CAD", "JPY"] as const;

export type Currency = (typeof CURRENCIES)[number];
