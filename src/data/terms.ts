import raw from './terms.json';

export interface TermSection {
  id: string;
  title: string;
  paragraphs: string[];
}

/**
 * Sample terms and FAQ. Not a real policy.
 * Replace the paragraphs before taking bookings.
 * `/terms#refunds` opens the payment section.
 */
// TODO: Katou must confirm the revisions draft. Minor means caption and typo fixes, small timing tweaks, or a sound or SFX swap. Major means re-cutting or restructuring the clip or changing the concept.
export const termsSections: TermSection[] = raw.sections;
