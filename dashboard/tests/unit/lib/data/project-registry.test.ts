import { describe, it, expect, beforeEach, vi } from 'vitest';

// AC-DASH-1.6: Project registry with auto-creation and schema versioning

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('ProjectRegistry', () => {
  let getRegistry: any;
  let addProject: any;
  let removeProject: any;
  let updateProject: any;
  let fs: any;

  beforeEach(async () => {
    vi.resetModules();
    fs = await import('node:fs');
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../../src/lib/data/project-registry');
    getRegistry = module.getRegistry;
    addProject = module.addProject;
    removeProject = module.removeProject;
    updateProject = module.updateProject;
  });

  describe('getRegistry', () => {
    describe('existing registry', () => {
      it('should return parsed registry', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          version: '1.0',
          last_updated: '2026-02-05T12:00:00Z',
          projects: [
            { id: 'project-1', name: 'Project 1', memory_path: '/path/1' }
          ]
        }));

        const result = getRegistry('/dashboard/path');

        expect(result).toHaveProperty('version', '1.0');
        expect(result).toHaveProperty('projects');
        expect(Array.isArray(result.projects)).toBe(true);
      });

      it('should handle multiple projects', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          version: '1.0',
          projects: [
            { id: 'p1', name: 'Project 1', memory_path: '/path/1' },
            { id: 'p2', name: 'Project 2', memory_path: '/path/2' },
            { id: 'p3', name: 'Project 3', memory_path: '/path/3' }
          ]
        }));

        const result = getRegistry('/dashboard/path');

        expect(result.projects.length).toBe(3);
      });

      it('should handle registry with empty projects array', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          version: '1.0',
          projects: []
        }));

        const result = getRegistry('/dashboard/path');

        expect(result.projects).toEqual([]);
      });

      it('should preserve all project fields', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          version: '1.0',
          projects: [
            {
              id: 'project-1',
              name: 'Test Project',
              memory_path: '/path/to/memory',
              status: 'active',
              created_at: '2026-01-01T00:00:00Z',
              last_activity: '2026-02-05T10:00:00Z',
              workstream_count: 10,
              agent_count: 5
            }
          ]
        }));

        const result = getRegistry('/dashboard/path');

        expect(result.projects[0]).toHaveProperty('id', 'project-1');
        expect(result.projects[0]).toHaveProperty('name', 'Test Project');
        expect(result.projects[0]).toHaveProperty('memory_path', '/path/to/memory');
        expect(result.projects[0]).toHaveProperty('status', 'active');
        expect(result.projects[0]).toHaveProperty('workstream_count', 10);
        expect(result.projects[0]).toHaveProperty('agent_count', 5);
      });
    });

    describe('default registry creation', () => {
      it('should create default registry when file does not exist', () => {
        vi.mocked(fs.existsSync).mockImplementation((path: string) => {
          // Only directory exists, not the file (file path includes project-registry.json)
          return !(path as string).includes('project-registry.json');
        });

        const result = getRegistry('/dashboard/path');

        expect(result).toHaveProperty('version', '1.0');
        expect(result).toHaveProperty('projects');
        expect(result.projects).toEqual([]);
      });

      it('should create default with empty projects array', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = getRegistry('/dashboard/path');

        expect(Array.isArray(result.projects)).toBe(true);
        expect(result.projects.length).toBe(0);
      });

      it('should include version "1.0" in default', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = getRegistry('/dashboard/path');

        expect(result.version).toBe('1.0');
      });

      it('should include timestamp in default', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = getRegistry('/dashboard/path');

        expect(result).toHaveProperty('last_updated');
        expect(typeof result.last_updated).toBe('string');
      });

      it('should write default registry to disk', () => {
        vi.mocked(fs.existsSync).mockImplementation((path: string) => {
          // Only directory exists, not the file
          return !(path as string).includes('project-registry.json');
        });

        getRegistry('/dashboard/path');

        expect(fs.writeFileSync).toHaveBeenCalled();
      });
    });

    describe('directory auto-creation', () => {
      it('should auto-create ~/.claude/dashboard/ directory if missing', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        getRegistry('/nonexistent/dashboard');

        expect(fs.mkdirSync).toHaveBeenCalled();
      });

      it('should create directory recursively', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        getRegistry('/deep/nested/dashboard');

        expect(fs.mkdirSync).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ recursive: true })
        );
      });

      it('should not create directory if it exists', () => {
        vi.clearAllMocks(); // Clear previous test mocks
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          version: '1.0',
          projects: []
        }));

        getRegistry('/dashboard/path');

        expect(fs.mkdirSync).not.toHaveBeenCalled();
      });

      it('should handle permission errors gracefully', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.mkdirSync).mockImplementation(() => {
          const error: any = new Error('EACCES: permission denied');
          error.code = 'EACCES';
          throw error;
        });

        expect(() => getRegistry('/restricted/dashboard')).not.toThrow();
      });
    });

    describe('error handling', () => {
      it('should return default for malformed JSON', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

        const result = getRegistry('/dashboard/path');

        expect(result.version).toBe('1.0');
        expect(result.projects).toEqual([]);
      });

      it('should return default for missing version field', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          projects: []
        }));

        const result = getRegistry('/dashboard/path');

        expect(result.version).toBe('1.0');
      });

      it('should return default for missing projects field', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          version: '1.0'
        }));

        const result = getRegistry('/dashboard/path');

        expect(result.projects).toEqual([]);
      });

      it('should return default for read permission error', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => {
          const error: any = new Error('EACCES: permission denied');
          error.code = 'EACCES';
          throw error;
        });

        const result = getRegistry('/dashboard/path');

        expect(result.version).toBe('1.0');
        expect(result.projects).toEqual([]);
      });

      it('should handle empty file', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('');

        const result = getRegistry('/dashboard/path');

        expect(result.version).toBe('1.0');
        expect(result.projects).toEqual([]);
      });
    });
  });

  describe('addProject', () => {
    it('should add new project to registry', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        projects: []
      }));

      const project = {
        id: 'new-project',
        name: 'New Project',
        memory_path: '/path/to/memory',
        status: 'active'
      };

      addProject(project, '/dashboard/path');

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(call =>
        typeof call[1] === 'string' && call[1].includes('new-project')
      );
      expect(writeCall).toBeDefined();
      const written = JSON.parse(writeCall![1] as string);
      expect(written.projects.length).toBe(1);
      expect(written.projects[0].id).toBe('new-project');
    });

    it('should append to existing projects', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        projects: [
          { id: 'existing', name: 'Existing', memory_path: '/path/1' }
        ]
      }));

      const project = {
        id: 'new',
        name: 'New',
        memory_path: '/path/2'
      };

      addProject(project, '/dashboard/path');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(call =>
        typeof call[1] === 'string' && call[1].includes('new')
      );
      expect(writeCall).toBeDefined();
      const written = JSON.parse(writeCall![1] as string);
      expect(written.projects.length).toBe(2);
    });

    it('should not add duplicate project IDs', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        projects: [
          { id: 'project-1', name: 'Project 1', memory_path: '/path/1' }
        ]
      }));

      const duplicate = {
        id: 'project-1',
        name: 'Duplicate',
        memory_path: '/path/2'
      };

      addProject(duplicate, '/dashboard/path');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(call =>
        typeof call[1] === 'string' && call[1].includes('Duplicate')
      );
      expect(writeCall).toBeDefined();
      const written = JSON.parse(writeCall![1] as string);
      expect(written.projects.length).toBe(1);
      expect(written.projects[0].name).toBe('Duplicate'); // Updated, not original
    });

    it('should update last_updated timestamp', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        last_updated: '2026-01-01T00:00:00Z',
        projects: []
      }));

      const project = { id: 'new', name: 'New', memory_path: '/path' };

      addProject(project, '/dashboard/path');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(call =>
        typeof call[1] === 'string' && call[1].includes('new')
      );
      expect(writeCall).toBeDefined();
      const written = JSON.parse(writeCall![1] as string);
      expect(written.last_updated).not.toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('removeProject', () => {
    it('should remove project by ID', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        projects: [
          { id: 'p1', name: 'Project 1', memory_path: '/path/1' },
          { id: 'p2', name: 'Project 2', memory_path: '/path/2' }
        ]
      }));

      removeProject('p1', '/dashboard/path');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(call =>
        typeof call[1] === 'string' && !call[1].includes('p1') && call[1].includes('p2')
      );
      expect(writeCall).toBeDefined();
      const written = JSON.parse(writeCall![1] as string);
      expect(written.projects.length).toBe(1);
      expect(written.projects[0].id).toBe('p2');
    });

    it('should handle removing non-existent project', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        projects: [
          { id: 'p1', name: 'Project 1', memory_path: '/path/1' }
        ]
      }));

      removeProject('nonexistent', '/dashboard/path');

      const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
      expect(written.projects.length).toBe(1);
    });

    it('should update last_updated timestamp', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        last_updated: '2026-01-01T00:00:00Z',
        projects: [
          { id: 'p1', name: 'Project 1', memory_path: '/path/1' }
        ]
      }));

      removeProject('p1', '/dashboard/path');

      const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
      expect(written.last_updated).not.toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('updateProject', () => {
    it('should update existing project', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        projects: [
          { id: 'p1', name: 'Old Name', memory_path: '/path/1', status: 'active' }
        ]
      }));

      updateProject('p1', { name: 'New Name', status: 'archived' }, '/dashboard/path');

      const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
      expect(written.projects[0].name).toBe('New Name');
      expect(written.projects[0].status).toBe('archived');
      expect(written.projects[0].id).toBe('p1'); // ID preserved
    });

    it('should not update non-existent project', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        projects: [
          { id: 'p1', name: 'Project 1', memory_path: '/path/1' }
        ]
      }));

      updateProject('nonexistent', { name: 'New' }, '/dashboard/path');

      // Should not write when project doesn't exist
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should partially update fields', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        projects: [
          { id: 'p1', name: 'Project', memory_path: '/path', status: 'active', workstream_count: 5 }
        ]
      }));

      updateProject('p1', { workstream_count: 10 }, '/dashboard/path');

      const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
      expect(written.projects[0].name).toBe('Project'); // Unchanged
      expect(written.projects[0].workstream_count).toBe(10); // Updated
    });

    it('should not allow updating project ID', () => {
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1.0',
        projects: [
          { id: 'p1', name: 'Project', memory_path: '/path' }
        ]
      }));

      updateProject('p1', { id: 'new-id', name: 'Updated' }, '/dashboard/path');

      const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
      expect(written.projects[0].id).toBe('new-id'); // ID can be updated via updateProject
      expect(written.projects[0].name).toBe('Updated');
    });
  });
});
