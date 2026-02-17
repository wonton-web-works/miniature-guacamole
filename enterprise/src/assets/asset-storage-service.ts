/**
 * Asset Storage Service — WS-ENT-5
 *
 * AC-ENT-5.1: S3/R2 client with tenant-prefixed key strategy
 * AC-ENT-5.2: Asset metadata in Postgres assets table
 * AC-ENT-5.3: Presigned URL generation (15-60 min TTL)
 */

import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import type { Asset } from '../schema/models';
import type { CreateAssetInput } from '../schema/repositories';

// ---------------------------------------------------------------------------
// ObjectStorageClient interface
// ---------------------------------------------------------------------------

export interface ObjectStorageClient {
  upload(key: string, body: Buffer | Readable, contentType: string, contentLength: number): Promise<void>;
  download(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  getPresignedUploadUrl(key: string, contentType: string, ttlSeconds: number): Promise<string>;
  getPresignedDownloadUrl(key: string, ttlSeconds: number): Promise<string>;
  headObject(key: string): Promise<{ contentType: string; contentLength: number } | null>;
}

// ---------------------------------------------------------------------------
// S3ObjectStorageClient config
// ---------------------------------------------------------------------------

export interface S3ObjectStorageClientConfig {
  region: string;
  bucket: string;
  endpoint?: string;
  credentials?: any;
}

// ---------------------------------------------------------------------------
// Key validation helpers
// ---------------------------------------------------------------------------

const TTL_MIN_SECONDS = 900;   // 15 min
const TTL_MAX_SECONDS = 3600;  // 60 min

function validateKey(key: string): void {
  if (key === null || key === undefined) {
    throw new Error('Invalid key: key is required');
  }
  if (key.includes('\0')) {
    throw new Error('Invalid key: null byte detected');
  }
  if (key.startsWith('/')) {
    throw new Error('Invalid key: key must not start with /');
  }
  if (key.includes('..')) {
    throw new Error('Invalid key: path traversal detected (..)');
  }
  // Also check for URL-encoded traversal directly
  if (/(%2e%2e|%2E%2E)/i.test(key)) {
    throw new Error('Invalid key: path traversal detected (URL-encoded ..)');
  }
}

function validateTtl(ttlSeconds: number): void {
  if (ttlSeconds < TTL_MIN_SECONDS) {
    throw new Error(`TTL too short: minimum is ${TTL_MIN_SECONDS} seconds (15 min), got ${ttlSeconds}`);
  }
  if (ttlSeconds > TTL_MAX_SECONDS) {
    throw new Error(`TTL too long: maximum is ${TTL_MAX_SECONDS} seconds (60 min), got ${ttlSeconds}`);
  }
}

// ---------------------------------------------------------------------------
// Lazy getSignedUrl loader — avoids top-level import of @aws-sdk/s3-request-presigner
// so that vi.mock factory runs lazily (after test variable initialization)
// ---------------------------------------------------------------------------

async function lazyGetSignedUrl(client: S3Client, command: any, options: { expiresIn: number }): Promise<string> {
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  return (getSignedUrl as any)(client, command, options);
}

// ---------------------------------------------------------------------------
// S3ObjectStorageClient
// ---------------------------------------------------------------------------

export class S3ObjectStorageClient implements ObjectStorageClient {
  private s3: S3Client;
  private bucket: string;

  constructor(config: S3ObjectStorageClientConfig) {
    if (!config) throw new Error('config is required');
    if (!config.region) throw new Error('region is required');
    if (!config.bucket) throw new Error('bucket is required');

    this.bucket = config.bucket;
    this.s3 = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      ...(config.credentials ? { credentials: config.credentials } : {}),
    });
  }

  async upload(key: string, body: Buffer | Readable, contentType: string, contentLength: number): Promise<void> {
    validateKey(key);
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: contentLength,
    });
    await this.s3.send(cmd);
  }

  async download(key: string): Promise<Readable> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.s3.send(cmd);
    if (!response.Body) {
      throw new Error('S3 returned no body for stream');
    }
    return response.Body as Readable;
  }

  async delete(key: string): Promise<void> {
    const cmd = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3.send(cmd);
  }

  async getPresignedUploadUrl(key: string, contentType: string, ttlSeconds: number): Promise<string> {
    validateTtl(ttlSeconds);
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return lazyGetSignedUrl(this.s3, cmd, { expiresIn: ttlSeconds });
  }

  async getPresignedDownloadUrl(key: string, ttlSeconds: number): Promise<string> {
    validateTtl(ttlSeconds);
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return lazyGetSignedUrl(this.s3, cmd, { expiresIn: ttlSeconds });
  }

  async headObject(key: string): Promise<{ contentType: string; contentLength: number } | null> {
    const cmd = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    try {
      const response = await this.s3.send(cmd);
      return {
        contentType: response.ContentType ?? '',
        contentLength: response.ContentLength ?? 0,
      };
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// AssetStorageService config & types
// ---------------------------------------------------------------------------

export interface AssetStorageServiceConfig {
  objectStorage: ObjectStorageClient;
  assetRepository: {
    create(data: CreateAssetInput): Promise<Asset>;
    findById(id: string): Promise<Asset | null>;
    findByProject(projectId: string): Promise<Asset[]>;
    delete(id: string): Promise<void>;
  };
  defaultBucket: string;
  maxSizeBytes?: number;
}

export interface UploadInput {
  tenantId: string;
  projectId?: string;
  filename: string;
  contentType: string;
  body: Buffer;
  metadata?: Record<string, unknown>;
}

export interface GetUploadUrlInput {
  tenantId: string;
  filename: string;
  contentType: string;
  ttlMinutes?: number;
}

const DEFAULT_TTL_MINUTES = 30;

// ---------------------------------------------------------------------------
// Filename validation helpers
// ---------------------------------------------------------------------------

function validateFilename(filename: string): void {
  if (!filename) throw new Error('filename is required');
  if (filename.length > 255) throw new Error('filename too long: maximum is 255 characters');
  if (filename.includes('\0')) throw new Error('Invalid filename: null byte detected');
  // Check for ".." path segments
  const parts = filename.split(/[/\\]/);
  if (parts.includes('..')) {
    throw new Error('Invalid filename: path traversal detected');
  }
}

function validateMetadata(metadata: Record<string, unknown> | undefined): void {
  if (metadata === undefined) return;
  const keys = Object.keys(metadata);
  if (keys.includes('__proto__')) {
    throw new Error('Prototype pollution detected in metadata');
  }
  if (keys.includes('constructor') && metadata['constructor'] != null && typeof metadata['constructor'] === 'object') {
    const ctor = metadata['constructor'] as Record<string, unknown>;
    if ('prototype' in ctor) {
      throw new Error('Prototype pollution detected in metadata');
    }
  }
}

function ttlMinutesToSeconds(minutes: number): number {
  return minutes * 60;
}

function validateTtlMinutes(minutes: number): void {
  const seconds = ttlMinutesToSeconds(minutes);
  if (seconds < TTL_MIN_SECONDS) {
    throw new Error(`TTL too short: minimum is 15 minutes, got ${minutes}`);
  }
  if (seconds > TTL_MAX_SECONDS) {
    throw new Error(`TTL too long: maximum is 60 minutes, got ${minutes}`);
  }
}

// ---------------------------------------------------------------------------
// AssetStorageService
// ---------------------------------------------------------------------------

export class AssetStorageService {
  private objectStorage: ObjectStorageClient;
  private assetRepository: AssetStorageServiceConfig['assetRepository'];
  private defaultBucket: string;
  private maxSizeBytes?: number;
  // In-memory asset cache: populated after upload for fast delete/download without extra DB roundtrip
  private assetCache: Map<string, Asset>;

  constructor(config: AssetStorageServiceConfig) {
    this.objectStorage = config.objectStorage;
    this.assetRepository = config.assetRepository;
    this.defaultBucket = config.defaultBucket;
    this.maxSizeBytes = config.maxSizeBytes;
    this.assetCache = new Map();
  }

  private async resolveAsset(assetId: string): Promise<Asset> {
    const cached = this.assetCache.get(assetId);
    if (cached) return cached;
    const asset = await this.assetRepository.findById(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);
    return asset;
  }

  async upload(input: UploadInput): Promise<Asset> {
    // Validate required fields
    if (!input.tenantId) throw new Error('tenantId is required');
    if (!input.contentType) throw new Error('contentType is required');
    if (input.body === null || input.body === undefined) throw new Error('body is required');
    if (!input.filename) throw new Error('filename is required');

    validateFilename(input.filename);
    validateMetadata(input.metadata);

    // Enforce max size
    if (this.maxSizeBytes !== undefined && input.body.length > this.maxSizeBytes) {
      throw new Error(`File too large: maximum is ${this.maxSizeBytes} bytes`);
    }

    const storageKey = `${input.tenantId}/${randomUUID()}/${input.filename}`;

    // Upload to object storage first
    await this.objectStorage.upload(storageKey, input.body, input.contentType, input.body.length);

    // Create metadata in repository — with atomic rollback on failure
    try {
      const asset = await this.assetRepository.create({
        tenant_id: input.tenantId,
        project_id: input.projectId,
        storage_key: storageKey,
        bucket: this.defaultBucket,
        content_type: input.contentType,
        size_bytes: input.body.length,
        filename: input.filename,
        metadata: input.metadata,
      });
      // Cache for subsequent operations within same service instance
      this.assetCache.set(asset.id, asset);
      return asset;
    } catch (err) {
      // Rollback: delete the uploaded object
      await this.objectStorage.delete(storageKey);
      throw err;
    }
  }

  async download(assetId: string): Promise<{ stream: Readable; asset: Asset }> {
    const asset = await this.resolveAsset(assetId);
    const stream = await this.objectStorage.download(asset.storage_key);
    return { stream, asset };
  }

  async delete(assetId: string): Promise<void> {
    const asset = await this.resolveAsset(assetId);
    await this.objectStorage.delete(asset.storage_key);
    await this.assetRepository.delete(assetId);
    this.assetCache.delete(assetId);
  }

  async getUploadUrl(input: GetUploadUrlInput): Promise<{ url: string; storageKey: string }> {
    const ttlMinutes = input.ttlMinutes ?? DEFAULT_TTL_MINUTES;
    validateTtlMinutes(ttlMinutes);
    validateFilename(input.filename);

    const storageKey = `${input.tenantId}/${randomUUID()}/${input.filename}`;
    const ttlSeconds = ttlMinutesToSeconds(ttlMinutes);
    const url = await this.objectStorage.getPresignedUploadUrl(storageKey, input.contentType, ttlSeconds);
    return { url, storageKey };
  }

  async getDownloadUrl(assetId: string, ttlMinutes?: number): Promise<string> {
    const asset = await this.resolveAsset(assetId);

    const minutes = ttlMinutes ?? DEFAULT_TTL_MINUTES;
    if (ttlMinutes !== undefined) {
      validateTtlMinutes(minutes);
    }
    const ttlSeconds = ttlMinutesToSeconds(minutes);
    return this.objectStorage.getPresignedDownloadUrl(asset.storage_key, ttlSeconds);
  }

  async listByProject(projectId: string): Promise<Asset[]> {
    return this.assetRepository.findByProject(projectId);
  }
}
