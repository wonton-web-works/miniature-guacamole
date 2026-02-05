/**
 * WS-19: Metadata Tracking System - Queries Module
 *
 * Query and filter operations for metadata.
 */

import { getAllMetadata } from './store';
import type { MetadataEntry, MetadataStatus, QueryFilters, SortField, SortOrder } from './types';

/**
 * Gets all metadata entries for a specific workstream.
 * AC-6: Query metadata by workstream_id
 */
export async function getMetadataByWorkstream(workstream_id: string): Promise<MetadataEntry[]> {
  const metadata = await getAllMetadata();

  const filtered = metadata.filter(entry => entry.workstream_id === workstream_id);

  // Sort by created_at (ascending - creation order)
  return filtered.sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

/**
 * Gets all metadata entries with a specific status.
 */
export async function getMetadataByStatus(status: MetadataStatus): Promise<MetadataEntry[]> {
  // Validate status
  const validStatuses: MetadataStatus[] = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status: must be pending, approved, or rejected');
  }

  const metadata = await getAllMetadata();
  return metadata.filter(entry => entry.status === status);
}

/**
 * Gets all metadata entries for a specific component (across all workstreams).
 */
export async function getMetadataByComponent(component: string): Promise<MetadataEntry[]> {
  const metadata = await getAllMetadata();
  return metadata.filter(entry => entry.component === component);
}

/**
 * Gets the latest version of a component in a workstream.
 */
export async function getLatestVersion(
  workstream_id: string,
  component: string
): Promise<MetadataEntry | null> {
  const metadata = await getAllMetadata();

  const entries = metadata.filter(
    entry => entry.workstream_id === workstream_id && entry.component === component
  );

  if (entries.length === 0) {
    return null;
  }

  // Find entry with highest version
  return entries.reduce((latest, current) => {
    return current.version > latest.version ? current : latest;
  });
}

/**
 * Gets all versions of a component in a workstream, sorted by version.
 */
export async function getAllVersions(
  workstream_id: string,
  component: string
): Promise<MetadataEntry[]> {
  const metadata = await getAllMetadata();

  const entries = metadata.filter(
    entry => entry.workstream_id === workstream_id && entry.component === component
  );

  // Sort by version ascending
  return entries.sort((a, b) => a.version - b.version);
}

/**
 * Filters metadata by multiple criteria.
 */
export async function filterMetadata(filters: QueryFilters): Promise<MetadataEntry[]> {
  const metadata = await getAllMetadata();

  return metadata.filter(entry => {
    if (filters.workstream_id && entry.workstream_id !== filters.workstream_id) {
      return false;
    }
    if (filters.component && entry.component !== filters.component) {
      return false;
    }
    if (filters.status && entry.status !== filters.status) {
      return false;
    }
    return true;
  });
}

/**
 * Sorts metadata by specified field and order.
 */
export async function sortMetadata(field: SortField, order: SortOrder): Promise<MetadataEntry[]> {
  const metadata = await getAllMetadata();

  return metadata.sort((a, b) => {
    let comparison = 0;

    if (field === 'created_at') {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      comparison = aTime - bTime;
    } else if (field === 'version') {
      comparison = a.version - b.version;
    }

    return order === 'asc' ? comparison : -comparison;
  });
}
