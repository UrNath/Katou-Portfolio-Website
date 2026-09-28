import raw from './terms.json';

export interface TermSection {
  id: string;
  title: string;
  paragraphs: string[];
}

/** Booking terms. `/terms#refunds` opens the payment section. */
export const termsSections: TermSection[] = raw.sections;
