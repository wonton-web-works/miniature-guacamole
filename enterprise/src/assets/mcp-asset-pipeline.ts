/**
 * MCP Asset Pipeline — WS-ENT-5
 *
 * AC-ENT-5.4: MCP tool output → asset storage pipeline
 * Receives MCP tool output (Buffer or string) and stores it via AssetStorageService.
 */

import type { Asset } from '../schema/models';
import type { AssetStorageService } from './asset-storage-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcessMcpToolOutputInput {
  tenantId: string;
  projectId?: string;
  toolName: string;
  output: Buffer | string;
  contentType?: string;
  storageService: AssetStorageService;
}

// ---------------------------------------------------------------------------
// Content type extension map
// ---------------------------------------------------------------------------

const MIME_TO_EXT: Record<string, string> = {
  'text/plain': 'txt',
  'text/html': 'html',
  'text/css': 'css',
  'text/csv': 'csv',
  'text/xml': 'xml',
  'application/json': 'json',
  'application/xml': 'xml',
  'application/pdf': 'pdf',
  'application/octet-stream': 'bin',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

function getExtension(contentType: string): string {
  const base = contentType.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[base] ?? 'bin';
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

// MIME type pattern: type/subtype (may include parameters like charset)
const MIME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*(\s*;.*)?$/;

function validateContentType(contentType: string): void {
  // Reject CRLF injection
  if (/[\r\n]/.test(contentType)) {
    throw new Error('Invalid contentType: CRLF injection detected');
  }
  // Reject non-MIME patterns
  if (!MIME_PATTERN.test(contentType)) {
    throw new Error(`Invalid contentType: must be a valid MIME type (e.g., text/plain), got "${contentType}"`);
  }
}

/**
 * Sanitize toolName for use in a filename.
 * Keeps only alphanumeric characters, hyphens, and underscores.
 * Removes path traversal sequences, null bytes, and shell injection characters.
 */
function sanitizeToolName(toolName: string): string {
  return toolName.replace(/[^a-zA-Z0-9_-]/g, '');
}

// ---------------------------------------------------------------------------
// processMcpToolOutput
// ---------------------------------------------------------------------------

export async function processMcpToolOutput(input: ProcessMcpToolOutputInput): Promise<Asset> {
  // Validate tenantId
  if (!input.tenantId) {
    throw new Error('tenantId is required');
  }

  // Validate toolName
  if (!input.toolName || input.toolName.length === 0) {
    throw new Error('toolName is required');
  }

  // Validate output
  if (input.output === null || input.output === undefined) {
    throw new Error('output is required');
  }

  // Validate contentType if provided
  if (input.contentType !== undefined) {
    validateContentType(input.contentType);
  }

  // Determine content type and convert output to Buffer
  let body: Buffer;
  let contentType: string;

  if (typeof input.output === 'string') {
    body = Buffer.from(input.output, 'utf8');
    contentType = input.contentType ?? 'text/plain';
  } else {
    body = input.output;
    contentType = input.contentType ?? 'application/octet-stream';
  }

  // Sanitize toolName and generate filename with timestamp
  const sanitized = sanitizeToolName(input.toolName) || 'tool';
  const timestamp = Date.now();
  const ext = getExtension(contentType);
  const filename = `${sanitized}-${timestamp}.${ext}`;

  // Build metadata
  const metadata: Record<string, unknown> = {
    tool_name: input.toolName,
    source: 'mcp-pipeline',
  };

  // Upload via storage service
  return input.storageService.upload({
    tenantId: input.tenantId,
    projectId: input.projectId,
    filename,
    contentType,
    body,
    metadata,
  });
}
