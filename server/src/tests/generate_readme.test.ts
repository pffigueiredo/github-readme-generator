import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { generatedReadmesTable } from '../db/schema';
import { type GenerateReadmeInput } from '../schema';
import { generateReadme } from '../handlers/generate_readme';
import { eq } from 'drizzle-orm';

// Mock fetch for GitHub API responses
const originalFetch = global.fetch;

const mockRepoResponse = {
  name: 'test-repo',
  full_name: 'testuser/test-repo',
  description: 'A test repository for testing',
  html_url: 'https://github.com/testuser/test-repo',
  default_branch: 'main',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-12-01T00:00:00Z',
  language: 'TypeScript',
  stargazers_count: 42,
  forks_count: 5
};

const mockTreeResponse = {
  tree: [
    { path: 'README.md', type: 'blob' },
    { path: 'src', type: 'tree' },
    { path: 'src/index.ts', type: 'blob' },
    { path: 'src/utils', type: 'tree' },
    { path: 'src/utils/helper.ts', type: 'blob' },
    { path: 'package.json', type: 'blob' },
    { path: '.gitignore', type: 'blob' }
  ]
};

function setupMockFetch(repoStatus = 200, treeStatus = 200) {
  (global as any).fetch = async (url: string | URL | Request): Promise<any> => {
    const urlStr = url.toString();
    
    if (urlStr.includes('/repos/testuser/test-repo') && !urlStr.includes('/git/trees/')) {
      if (repoStatus === 200) {
        return {
          ok: true,
          status: 200,
          json: async () => mockRepoResponse
        };
      } else {
        return {
          ok: false,
          status: repoStatus,
          json: async () => ({})
        };
      }
    }
    
    if (urlStr.includes('/git/trees/main')) {
      if (treeStatus === 200) {
        return {
          ok: true,
          status: 200,
          json: async () => mockTreeResponse
        };
      } else {
        return {
          ok: false,
          status: treeStatus,
          json: async () => ({})
        };
      }
    }
    
    return {
      ok: false,
      status: 404,
      json: async () => ({})
    };
  };
}

function restoreFetch() {
  (global as any).fetch = originalFetch;
}

const validInput: GenerateReadmeInput = {
  github_url: 'https://github.com/testuser/test-repo'
};

describe('generateReadme', () => {
  beforeEach(async () => {
    await resetDB();
    await createDB();
  });
  afterEach(() => {
    restoreFetch();
  });

  it('should generate README for valid repository', async () => {
    setupMockFetch();
    
    const result = await generateReadme(validInput);

    // Verify basic fields
    expect(result.github_url).toEqual('https://github.com/testuser/test-repo');
    expect(result.repository_name).toEqual('test-repo');
    expect(result.repository_description).toEqual('A test repository for testing');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Verify markdown content contains expected sections
    expect(result.markdown_content).toContain('# test-repo');
    expect(result.markdown_content).toContain('A test repository for testing');
    expect(result.markdown_content).toContain('## Repository Information');
    expect(result.markdown_content).toContain('Language**: TypeScript');
    expect(result.markdown_content).toContain('Stars**: 42');
    expect(result.markdown_content).toContain('Forks**: 5');
    expect(result.markdown_content).toContain('## File Structure');
    expect(result.markdown_content).toContain('README.md');
    expect(result.markdown_content).toContain('└── src');
    expect(result.markdown_content).toContain('package.json');
    expect(result.markdown_content).toContain('[View on GitHub](https://github.com/testuser/test-repo)');
  });

  it('should save README to database', async () => {
    setupMockFetch();
    
    const result = await generateReadme(validInput);

    // Query database to verify data was saved
    const savedReadmes = await db.select()
      .from(generatedReadmesTable)
      .where(eq(generatedReadmesTable.id, result.id))
      .execute();

    expect(savedReadmes).toHaveLength(1);
    const savedReadme = savedReadmes[0];
    
    expect(savedReadme.github_url).toEqual('https://github.com/testuser/test-repo');
    expect(savedReadme.repository_name).toEqual('test-repo');
    expect(savedReadme.repository_description).toEqual('A test repository for testing');
    expect(savedReadme.markdown_content).toContain('# test-repo');
    expect(savedReadme.created_at).toBeInstanceOf(Date);
    expect(savedReadme.updated_at).toBeInstanceOf(Date);
    
    // Verify file structure is stored as JSON string
    const fileStructure = JSON.parse(savedReadme.file_structure);
    expect(Array.isArray(fileStructure)).toBe(true);
    expect(fileStructure.length).toBeGreaterThan(0);
  });

  it('should handle repository without description', async () => {
    const repoWithoutDescription = { ...mockRepoResponse, description: null };
    (global as any).fetch = async (url: string | URL | Request): Promise<any> => {
      const urlStr = url.toString();
      
      if (urlStr.includes('/repos/testuser/test-repo') && !urlStr.includes('/git/trees/')) {
        return {
          ok: true,
          status: 200,
          json: async () => repoWithoutDescription
        };
      }
      
      if (urlStr.includes('/git/trees/main')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockTreeResponse
        };
      }
      
      return {
        ok: false,
        status: 404,
        json: async () => ({})
      };
    };
    
    const result = await generateReadme(validInput);

    expect(result.repository_description).toBeNull();
    expect(result.markdown_content).toContain('# test-repo');
    expect(result.markdown_content).not.toContain('A test repository for testing');
  });

  it('should handle repository not found error', async () => {
    setupMockFetch(404);
    
    await expect(generateReadme(validInput)).rejects.toThrow(/repository not found/i);
  });

  it('should handle GitHub API errors', async () => {
    setupMockFetch(500);
    
    await expect(generateReadme(validInput)).rejects.toThrow(/github api error/i);
  });

  it('should handle file tree fetch errors', async () => {
    setupMockFetch(200, 500);
    
    await expect(generateReadme(validInput)).rejects.toThrow(/failed to fetch file tree/i);
  });

  it('should handle invalid GitHub URLs', async () => {
    const invalidInput: GenerateReadmeInput = {
      github_url: 'https://github.com/invalid'
    };
    
    setupMockFetch();
    
    await expect(generateReadme(invalidInput)).rejects.toThrow(/invalid github url format/i);
  });

  it('should properly build file tree structure', async () => {
    const complexTreeResponse = {
      tree: [
        { path: 'README.md', type: 'blob' },
        { path: 'src', type: 'tree' },
        { path: 'src/components', type: 'tree' },
        { path: 'src/components/Button.tsx', type: 'blob' },
        { path: 'src/components/Input.tsx', type: 'blob' },
        { path: 'src/utils', type: 'tree' },
        { path: 'src/utils/helpers.ts', type: 'blob' },
        { path: 'src/index.ts', type: 'blob' },
        { path: 'tests', type: 'tree' },
        { path: 'tests/unit', type: 'tree' },
        { path: 'tests/unit/Button.test.tsx', type: 'blob' }
      ]
    };

    (global as any).fetch = async (url: string | URL | Request): Promise<any> => {
      const urlStr = url.toString();
      
      if (urlStr.includes('/repos/testuser/test-repo') && !urlStr.includes('/git/trees/')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockRepoResponse
        };
      }
      
      if (urlStr.includes('/git/trees/main')) {
        return {
          ok: true,
          status: 200,
          json: async () => complexTreeResponse
        };
      }
      
      return {
        ok: false,
        status: 404,
        json: async () => ({})
      };
    };

    const result = await generateReadme(validInput);

    // Verify complex file structure is rendered correctly
    expect(result.markdown_content).toContain('├── README.md');
    expect(result.markdown_content).toContain('├── src');
    expect(result.markdown_content).toContain('│   ├── components');
    expect(result.markdown_content).toContain('│   │   ├── Button.tsx');
    expect(result.markdown_content).toContain('│   │   └── Input.tsx');
    expect(result.markdown_content).toContain('│   ├── index.ts');
    expect(result.markdown_content).toContain('│   └── utils');
    expect(result.markdown_content).toContain('│       └── helpers.ts');
    expect(result.markdown_content).toContain('└── tests');
    expect(result.markdown_content).toContain('    └── unit');
    expect(result.markdown_content).toContain('        └── Button.test.tsx');
  });

  it('should handle repository with no language specified', async () => {
    const repoWithoutLanguage = { ...mockRepoResponse, language: null };
    (global as any).fetch = async (url: string | URL | Request): Promise<any> => {
      const urlStr = url.toString();
      
      if (urlStr.includes('/repos/testuser/test-repo') && !urlStr.includes('/git/trees/')) {
        return {
          ok: true,
          status: 200,
          json: async () => repoWithoutLanguage
        };
      }
      
      if (urlStr.includes('/git/trees/main')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockTreeResponse
        };
      }
      
      return {
        ok: false,
        status: 404,
        json: async () => ({})
      };
    };
    
    const result = await generateReadme(validInput);

    expect(result.markdown_content).toContain('Language**: Not specified');
  });
});