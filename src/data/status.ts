/**
 * Single source of truth for service status.
 * Hub readout, route chips, service pages, and the menu all read this file.
 * Change the values here — do not hardcode status in components.
 */
import raw from './status.json';

export type ServiceStatus = 'open' | 'waitlist' | 'closed';

function asStatus(value: string): ServiceStatus {
  if (value === 'waitlist' || value === 'closed') return value;
  return 'open';
}

export const status = {
  editing: asStatus(raw.editing),
  webDesign: asStatus(raw.webDesign),
  /** Shown as "Prices updated {updated}". */
  updated: raw.updated,
  /** Shown as "Terms updated {termsUpdated}". */
  termsUpdated: raw.termsUpdated,
};

export const statusLabel: Record<ServiceStatus, string> = {
  open: 'Open',
  waitlist: 'Waitlist',
  closed: 'Closed',
};

export type StatusKey = 'editing' | 'webDesign';

export function labelFor(value: ServiceStatus): string {
  return statusLabel[value];
}
