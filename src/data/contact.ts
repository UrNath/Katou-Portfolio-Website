import raw from './contact.json';

export const contactServices = [
  { value: 'editing', label: 'Editing' },
  { value: 'web-design', label: 'Web design' },
  { value: 'unsure', label: 'Not sure yet' },
] as const;

export const guidelines = raw.guidelines;
