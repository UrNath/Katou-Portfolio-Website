import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export async function loadService(id: 'editing' | 'web-design') {
  const entry = await getEntry('services', id);
  if (!entry) throw new Error(`Missing service content: ${id}`);
  return entry;
}

export async function loadServicePrices() {
  const services = await getCollection('services');
  const editing = services.find((entry) => entry.id === 'editing');
  const web = services.find((entry) => entry.id === 'web-design');
  if (!editing || !web) throw new Error('Service content files are missing.');
  return {
    editing: editing.data.fromPrice,
    web: web.data.fromPrice,
    webApprox: web.data.fromApprox,
    editingEntry: editing,
    webEntry: web,
  };
}

export type ServiceEntry = CollectionEntry<'services'>;
