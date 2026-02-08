import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { DEFAULT_DASHBOARD_PATH, PROJECT_REGISTRY_FILE } from '../constants';

interface Project {
  id: string;
  name: string;
  memory_path: string;
  status?: string;
  created_at?: string;
  last_activity?: string;
  workstream_count?: number;
  agent_count?: number;
  [key: string]: unknown;
}

interface ProjectRegistry {
  version: string;
  last_updated: string;
  projects: Project[];
}

function createDefaultRegistry(): ProjectRegistry {
  return {
    version: '1.0',
    last_updated: new Date().toISOString(),
    projects: [],
  };
}

function ensureDirectoryExists(dirPath: string): void {
  try {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    // Silently handle permission errors
  }
}

function writeRegistry(dashboardPath: string, registry: ProjectRegistry): void {
  ensureDirectoryExists(dashboardPath);
  const filePath = join(dashboardPath, PROJECT_REGISTRY_FILE);

  // Let write errors propagate to callers so they can detect persistence failures
  // Functions like addProject(), removeProject(), and updateProject() should be
  // aware when data may not have been saved successfully
  writeFileSync(filePath, JSON.stringify(registry, null, 2), 'utf-8');
}

export function getRegistry(dashboardPath: string = DEFAULT_DASHBOARD_PATH): ProjectRegistry {
  const filePath = join(dashboardPath, PROJECT_REGISTRY_FILE);

  try {
    if (!existsSync(filePath)) {
      const defaultRegistry = createDefaultRegistry();
      writeRegistry(dashboardPath, defaultRegistry);
      return defaultRegistry;
    }

    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content) as ProjectRegistry;

    // Validate registry structure
    if (!parsed.version || !Array.isArray(parsed.projects)) {
      const defaultRegistry = createDefaultRegistry();
      writeRegistry(dashboardPath, defaultRegistry);
      return defaultRegistry;
    }

    return parsed;
  } catch (error) {
    // Return default for any errors (malformed JSON, permission denied, etc.)
    const defaultRegistry = createDefaultRegistry();
    writeRegistry(dashboardPath, defaultRegistry);
    return defaultRegistry;
  }
}

export function addProject(
  project: Project,
  dashboardPath: string = DEFAULT_DASHBOARD_PATH
): ProjectRegistry {
  const registry = getRegistry(dashboardPath);

  // Check if project already exists
  const existingIndex = registry.projects.findIndex(p => p.id === project.id);

  if (existingIndex === -1) {
    registry.projects.push(project);
  } else {
    // Update existing project
    registry.projects[existingIndex] = { ...registry.projects[existingIndex], ...project };
  }

  registry.last_updated = new Date().toISOString();
  writeRegistry(dashboardPath, registry);

  return registry;
}

export function removeProject(
  projectId: string,
  dashboardPath: string = DEFAULT_DASHBOARD_PATH
): ProjectRegistry {
  const registry = getRegistry(dashboardPath);

  registry.projects = registry.projects.filter(p => p.id !== projectId);
  registry.last_updated = new Date().toISOString();
  writeRegistry(dashboardPath, registry);

  return registry;
}

export function updateProject(
  projectId: string,
  updates: Partial<Project>,
  dashboardPath: string = DEFAULT_DASHBOARD_PATH
): ProjectRegistry {
  const registry = getRegistry(dashboardPath);

  const projectIndex = registry.projects.findIndex(p => p.id === projectId);

  if (projectIndex !== -1) {
    registry.projects[projectIndex] = { ...registry.projects[projectIndex], ...updates };
    registry.last_updated = new Date().toISOString();
    writeRegistry(dashboardPath, registry);
  }

  return registry;
}
