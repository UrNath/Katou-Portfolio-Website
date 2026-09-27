/**
 * Single source of truth for service status.
 * Hub readout, route chips, service pages, and the menu all read this file.
 * Change the values here — do not hardcode status in components.
 */
export type ServiceStatus = 'open' | 'waitlist' | 'closed';

export const status = {
  editing: 'open' as ServiceStatus,
  webDesign: 'open' as ServiceStatus,
  /** Shown as "Prices updated {updated}". */
  updated: 'Sep 2026',
  /** Shown as "Terms updated {termsUpdated}". */
  termsUpdated: 'Sep 2026',
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
