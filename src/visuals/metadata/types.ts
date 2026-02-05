/**
 * WS-19: Metadata Tracking System - Type Definitions
 *
 * TypeScript interfaces for metadata entries and query filters.
 */

export type MetadataStatus = 'pending' | 'approved' | 'rejected';

export interface MetadataEntry {
  id: string;
  workstream_id: string;
  component: string;
  version: number;
  spec_hash: string;
  file_path: string;
  file_size: number;
  dimensions: {
    width: number;
    height: number;
  };
  status: MetadataStatus;
  created_at: string;
  updated_at: string;
}

export interface QueryFilters {
  workstream_id?: string;
  component?: string;
  status?: MetadataStatus;
}

export type SortField = 'created_at' | 'version';
export type SortOrder = 'asc' | 'desc';
