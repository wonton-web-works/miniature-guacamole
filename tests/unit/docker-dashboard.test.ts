/**
 * WS-DASH-1: Dockerize the Dashboard
 *
 * Static validation tests — no Docker daemon required.
 * Reads files from disk and validates structure/content.
 * Tests follow misuse → boundary → golden path ordering.
 *
 * Will FAIL before dev implements the files.
 * Will PASS once all four artifacts are correctly created.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const ROOT = path.resolve(__dirname, '../../');
const COMPOSE_PATH = path.join(ROOT, 'docker-compose.yml');
const DOCKERFILE_PATH = path.join(ROOT, 'dashboard/Dockerfile');
const DOCKERIGNORE_PATH = path.join(ROOT, 'dashboard/.dockerignore');
const NEXTCONFIG_PATH = path.join(ROOT, 'dashboard/next.config.mjs');

// Helpers

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseCompose(): Promise<any> {
  const text = await readText(COMPOSE_PATH);
  return yaml.load(text);
}

// ─── MISUSE CASES ────────────────────────────────────────────────────────────

describe('WS-DASH-1 misuse: dashboard service missing from compose', () => {
  it('docker-compose.yml must define a dashboard service', async () => {
    const compose = await parseCompose();
    expect(compose.services).toHaveProperty('dashboard');
  });

  it('dashboard service must have a build section (not just an image)', async () => {
    const compose = await parseCompose();
    const dashboard = compose.services?.dashboard;
    expect(dashboard).toBeDefined();
    expect(dashboard.build).toBeDefined();
    // Accepting either shorthand string or object form
    const buildDefined =
      typeof dashboard.build === 'string' ||
      (typeof dashboard.build === 'object' && dashboard.build !== null);
    expect(buildDefined).toBe(true);
  });
});

describe('WS-DASH-1 misuse: next.config.mjs missing standalone output', () => {
  it('next.config.mjs must contain output: standalone', async () => {
    const text = await readText(NEXTCONFIG_PATH);
    // Accepts both 'standalone' and "standalone"
    expect(text).toMatch(/output\s*:\s*['"]standalone['"]/);
  });
});

describe('WS-DASH-1 misuse: Dockerfile missing required base image', () => {
  it('dashboard/Dockerfile must exist', async () => {
    const exists = await fileExists(DOCKERFILE_PATH);
    expect(exists).toBe(true);
  });

  it('Dockerfile must use node:20-alpine as base (runner stage)', async () => {
    const text = await readText(DOCKERFILE_PATH);
    expect(text).toMatch(/FROM\s+node:20-alpine/);
  });
});

describe('WS-DASH-1 misuse: .dockerignore missing required exclusions', () => {
  it('dashboard/.dockerignore must exist', async () => {
    const exists = await fileExists(DOCKERIGNORE_PATH);
    expect(exists).toBe(true);
  });

  it('.dockerignore must exclude node_modules', async () => {
    const text = await readText(DOCKERIGNORE_PATH);
    const lines = text.split('\n').map(l => l.trim());
    expect(lines).toContain('node_modules');
  });
});

// ─── BOUNDARY CASES ──────────────────────────────────────────────────────────

describe('WS-DASH-1 boundary: depends_on condition must be service_healthy', () => {
  it('dashboard depends_on postgres with condition: service_healthy', async () => {
    const compose = await parseCompose();
    const dashboard = compose.services?.dashboard;
    expect(dashboard?.depends_on).toBeDefined();

    // depends_on can be array (no condition) or object (with condition)
    const dependsOn = dashboard.depends_on;
    if (Array.isArray(dependsOn)) {
      // Array form has no condition — this is NOT acceptable for AC-DASH-1.3
      throw new Error('depends_on must use object form with condition: service_healthy, not array form');
    }

    // Object form: depends_on.postgres.condition
    expect(dependsOn).toHaveProperty('postgres');
    expect(dependsOn.postgres.condition).toBe('service_healthy');
  });
});

describe('WS-DASH-1 boundary: port 4242:4242 must be mapped', () => {
  it('dashboard service must expose port 4242', async () => {
    const compose = await parseCompose();
    const dashboard = compose.services?.dashboard;
    const ports: string[] = dashboard?.ports ?? [];
    const has4242 = ports.some((p: string) => String(p).startsWith('4242'));
    expect(has4242).toBe(true);
  });
});

describe('WS-DASH-1 boundary: MG_POSTGRES_URL must be set in compose environment', () => {
  it('dashboard service must have MG_POSTGRES_URL in environment', async () => {
    const compose = await parseCompose();
    const dashboard = compose.services?.dashboard;
    const env = dashboard?.environment;
    expect(env).toBeDefined();

    // environment can be an array of "KEY=value" strings or a key/value object
    let hasUrl = false;
    if (Array.isArray(env)) {
      hasUrl = env.some((e: string) => String(e).startsWith('MG_POSTGRES_URL'));
    } else {
      hasUrl = Object.prototype.hasOwnProperty.call(env, 'MG_POSTGRES_URL');
    }
    expect(hasUrl).toBe(true);
  });

  it('MG_POSTGRES_URL must point to the postgres service (not localhost)', async () => {
    const compose = await parseCompose();
    const dashboard = compose.services?.dashboard;
    const env = dashboard?.environment;

    let urlValue = '';
    if (Array.isArray(env)) {
      const entry = (env as string[]).find(e => e.startsWith('MG_POSTGRES_URL'));
      urlValue = entry ? entry.split('=').slice(1).join('=') : '';
    } else if (env && typeof env === 'object') {
      urlValue = String(env.MG_POSTGRES_URL ?? '');
    }

    // Must reference "postgres" service hostname, not localhost/127.0.0.1
    expect(urlValue).toMatch(/postgres:/);
    expect(urlValue).not.toMatch(/localhost/);
    expect(urlValue).not.toMatch(/127\.0\.0\.1/);
  });
});

describe('WS-DASH-1 boundary: .dockerignore must cover all required patterns', () => {
  it('.dockerignore must exclude .next', async () => {
    const text = await readText(DOCKERIGNORE_PATH);
    const lines = text.split('\n').map(l => l.trim());
    expect(lines).toContain('.next');
  });

  it('.dockerignore must exclude .env* or individual .env files', async () => {
    const text = await readText(DOCKERIGNORE_PATH);
    expect(text).toMatch(/\.env/);
  });

  it('.dockerignore must exclude .claude/', async () => {
    const text = await readText(DOCKERIGNORE_PATH);
    expect(text).toMatch(/\.claude/);
  });
});

// ─── GOLDEN PATH ─────────────────────────────────────────────────────────────

describe('WS-DASH-1 golden: AC-DASH-1.3 + AC-DASH-1.4 — depends_on and env complete', () => {
  it('postgres service retains its healthcheck (not broken by edits)', async () => {
    const compose = await parseCompose();
    const postgres = compose.services?.postgres;
    expect(postgres?.healthcheck).toBeDefined();
    expect(postgres?.healthcheck?.test).toBeDefined();
  });

  it('compose has both postgres and dashboard services', async () => {
    const compose = await parseCompose();
    expect(Object.keys(compose.services)).toContain('postgres');
    expect(Object.keys(compose.services)).toContain('dashboard');
  });
});

describe('WS-DASH-1 golden: AC-DASH-1.5 — multi-stage Dockerfile', () => {
  let dockerfileText = '';

  beforeAll(async () => {
    if (await fileExists(DOCKERFILE_PATH)) {
      dockerfileText = await readText(DOCKERFILE_PATH);
    }
  });

  it('Dockerfile has a deps stage', () => {
    expect(dockerfileText).toMatch(/AS\s+deps/i);
  });

  it('Dockerfile has a builder stage', () => {
    expect(dockerfileText).toMatch(/AS\s+build(er)?/i);
  });

  it('Dockerfile has a runner/production stage', () => {
    expect(dockerfileText).toMatch(/AS\s+(runner|production)/i);
  });

  it('runner stage copies from standalone output directory', () => {
    // next build --standalone puts output in .next/standalone
    expect(dockerfileText).toMatch(/standalone/);
  });

  it('Dockerfile runs npm ci (not npm install) for reproducible builds', () => {
    expect(dockerfileText).toMatch(/npm\s+ci/);
  });
});

describe('WS-DASH-1 golden: AC-DASH-1.8 — standalone output in next.config', () => {
  it('next.config.mjs retains existing config keys alongside standalone', async () => {
    const text = await readText(NEXTCONFIG_PATH);
    // reactStrictMode was already present — must not be removed
    expect(text).toMatch(/reactStrictMode/);
    expect(text).toMatch(/output\s*:\s*['"]standalone['"]/);
  });
});

describe('WS-DASH-1 golden: AC-DASH-1.9 — .dockerignore completeness', () => {
  it('.dockerignore excludes all four required patterns', async () => {
    const text = await readText(DOCKERIGNORE_PATH);
    const lines = text.split('\n').map(l => l.trim());

    expect(lines).toContain('node_modules');   // AC-DASH-1.9
    expect(text).toMatch(/\.next/);            // AC-DASH-1.9
    expect(text).toMatch(/\.env/);             // AC-DASH-1.9
    expect(text).toMatch(/\.claude/);          // AC-DASH-1.9
  });
});

describe('WS-DASH-1 golden: AC-DASH-1.6 — no host node_modules volume in compose', () => {
  it('dashboard service must not mount host node_modules into container', async () => {
    const compose = await parseCompose();
    const dashboard = compose.services?.dashboard;
    const volumes: string[] = dashboard?.volumes ?? [];

    const mountsNodeModules = volumes.some((v: string) =>
      String(v).includes('node_modules')
    );
    expect(mountsNodeModules).toBe(false);
  });
});

describe('WS-DASH-1 golden: AC-DASH-1.7 — Postgres volume preserved in compose', () => {
  it('mg_postgres_data volume is declared at top level (survives compose down)', async () => {
    const compose = await parseCompose();
    expect(compose.volumes).toHaveProperty('mg_postgres_data');
  });
});

describe('WS-DASH-1 golden: migrations auto-run on first Postgres init', () => {
  it('postgres service mounts ./migrations to /docker-entrypoint-initdb.d', async () => {
    const compose = await parseCompose();
    const postgres = compose.services?.postgres;
    const volumes: string[] = postgres?.volumes ?? [];
    const hasInitdb = volumes.some((v: string) =>
      String(v).includes('migrations') && String(v).includes('docker-entrypoint-initdb.d')
    );
    expect(hasInitdb).toBe(true);
  });
});
