/**
 * WS-19: Metadata Tracking System - Public API
 *
 * Exports all public functions and types for metadata tracking.
 */

// Type exports
export type { MetadataEntry, MetadataStatus, QueryFilters, SortField, SortOrder } from './types';

// Store operations
export {
  createMetadataEntry,
  updateMetadataEntry,
  getMetadataEntry,
  getAllMetadata,
  deleteMetadataEntry,
  incrementVersion,
  updateStatus
} from './store';

// Query operations
export {
  getMetadataByWorkstream,
  getMetadataByStatus,
  getMetadataByComponent,
  getLatestVersion,
  getAllVersions,
  filterMetadata,
  sortMetadata
} from './queries';
