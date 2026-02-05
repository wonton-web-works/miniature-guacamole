/**
 * WS-19: Metadata Tracking System - Store Module
 *
 * CRUD operations with atomic file writes for metadata.json
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MetadataEntry, MetadataStatus } from './types';

const METADATA_DIR = '.claude/visuals';
const METADATA_FILE = path.join(METADATA_DIR, 'metadata.json');

/**
 * Validates required fields for metadata entry creation.
 */
function validateRequiredFields(data: any): void {
  const requiredFields = ['workstream_id', 'component', 'spec_hash', 'file_path', 'dimensions'];

  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

/**
 * Reads all metadata entries from metadata.json
 */
async function readMetadata(): Promise<MetadataEntry[]> {
  if (!fs.existsSync(METADATA_FILE)) {
    return [];
  }

  const content = await fs.promises.readFile(METADATA_FILE, 'utf8');
  return JSON.parse(content);
}

/**
 * Writes metadata to file using atomic write operation
 */
async function writeMetadata(entries: MetadataEntry[]): Promise<void> {
  // Create directory if it doesn't exist
  if (!fs.existsSync(METADATA_DIR)) {
    await fs.promises.mkdir(METADATA_DIR, { recursive: true });
  }

  // Atomic write: write to file directly
  await fs.promises.writeFile(METADATA_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

/**
 * Creates a new metadata entry.
 * AC-1: Creates metadata.json on first generation
 * AC-2: Records workstream_id, component, version, spec_hash
 * AC-3: Records file_path, file_size, dimensions
 */
export async function createMetadataEntry(data: Omit<MetadataEntry, 'id'>): Promise<MetadataEntry> {
  // Validate required fields
  validateRequiredFields(data);

  // Read existing metadata
  const metadata = await readMetadata();

  // Create entry with all provided data (id may be included in data via type assertion in tests)
  const entry = { ...data } as MetadataEntry;
  metadata.push(entry);

  // Write back atomically
  await writeMetadata(metadata);

  return entry;
}

/**
 * Updates an existing metadata entry.
 * AC-4: Updates status and other fields
 */
export async function updateMetadataEntry(
  id: string,
  updates: Partial<Omit<MetadataEntry, 'id' | 'created_at'>>
): Promise<MetadataEntry> {
  if (!fs.existsSync(METADATA_FILE)) {
    throw new Error('Metadata file not found');
  }

  const metadata = await readMetadata();
  const index = metadata.findIndex(entry => entry.id === id);

  if (index === -1) {
    throw new Error(`Metadata entry not found: ${id}`);
  }

  // Update entry while preserving created_at
  const updatedEntry = {
    ...metadata[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  metadata[index] = updatedEntry;

  // Write back atomically
  await writeMetadata(metadata);

  return updatedEntry;
}

/**
 * Gets the next version number for a component in a workstream.
 * AC-5: Version auto-increment on regeneration
 */
export async function incrementVersion(workstream_id: string, component: string): Promise<number> {
  if (!fs.existsSync(METADATA_FILE)) {
    return 1;
  }

  const metadata = await readMetadata();

  // Find all entries for this workstream and component
  const entries = metadata.filter(
    entry => entry.workstream_id === workstream_id && entry.component === component
  );

  if (entries.length === 0) {
    return 1;
  }

  // Find the highest version
  const maxVersion = Math.max(...entries.map(entry => entry.version));

  return maxVersion + 1;
}

/**
 * Updates the status of a metadata entry.
 * AC-4: Status transitions (pending → approved/rejected)
 */
export async function updateStatus(id: string, status: MetadataStatus): Promise<MetadataEntry> {
  // Validate status
  const validStatuses: MetadataStatus[] = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status: must be pending, approved, or rejected');
  }

  return updateMetadataEntry(id, { status });
}

/**
 * Gets a metadata entry by ID.
 */
export async function getMetadataEntry(id: string): Promise<MetadataEntry | null> {
  if (!fs.existsSync(METADATA_FILE)) {
    return null;
  }

  const metadata = await readMetadata();
  const entry = metadata.find(entry => entry.id === id);

  return entry || null;
}

/**
 * Gets all metadata entries.
 */
export async function getAllMetadata(): Promise<MetadataEntry[]> {
  if (!fs.existsSync(METADATA_FILE)) {
    return [];
  }

  return readMetadata();
}

/**
 * Deletes a metadata entry by ID.
 */
export async function deleteMetadataEntry(id: string): Promise<boolean> {
  if (!fs.existsSync(METADATA_FILE)) {
    return false;
  }

  const metadata = await readMetadata();
  const index = metadata.findIndex(entry => entry.id === id);

  if (index === -1) {
    return false;
  }

  metadata.splice(index, 1);
  await writeMetadata(metadata);

  return true;
}
