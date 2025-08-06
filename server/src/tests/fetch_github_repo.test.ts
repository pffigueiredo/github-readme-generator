import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { fetchGitHubRepository, fetchGitHubFileTree } from '../handlers/fetch_github_repo';

// Mock fetch globally
const originalFetch = global.fetch;
let mockFetch: any;

// Test data
const mockRepoResponse = {
  name: 'test-repo',
  full_name: 'testowner/test-repo',
  description: 'A test repository',
  html_url: 'https://github.com/testowner/test-repo',
  default_branch: 'main',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-12-01T00:00:00Z',
  language: 'TypeScript',
  stargazers_count: 100,
  forks_count: 25
};

const mockTreeResponse = {
  tree: [
    {
      path: 'README.md',
      mode: '100644',
      type: 'blob' as const,
      sha: 'abc123',
      size: 1024,
      url: 'https://api.github.com/repos/testowner/test-repo/git/blobs/abc123'
    },
    {
      path: 'src',
      mode: '040000',
      type: 'tree' as const,
      sha: 'def456',
      url: 'https://api.github.com/repos/testowner/test-repo/git/trees/def456'
    },
    {
      path: 'src/index.ts',
      mode: '100644',
      type: 'blob' as const,
      sha: 'ghi789',
      size: 2048,
      url: 'https://api.github.com/repos/testowner/test-repo/git/blobs/ghi789'
    },
    {
      path: 'package.json',
      mode: '100644',
      type: 'blob' as const,
      sha: 'jkl012',
      size: 512,
      url: 'https://api.github.com/repos/testowner/test-repo/git/blobs/jkl012'
    }
  ],
  truncated: false
};

describe('fetchGitHubRepository', () => {
  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockRepoResponse)
    }));
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch repository information successfully', async () => {
    const result = await fetchGitHubRepository('https://github.com/testowner/test-repo');

    expect(result.name).toBe('test-repo');
    expect(result.full_name).toBe('testowner/test-repo');
    expect(result.description).toBe('A test repository');
    expect(result.html_url).toBe('https://github.com/testowner/test-repo');
    expect(result.default_branch).toBe('main');
    expect(result.language).toBe('TypeScript');
    expect(result.stars_count).toBe(100);
    expect(result.forks_count).toBe(25);
    expect(result.created_at).toBe('2023-01-01T00:00:00Z');
    expect(result.updated_at).toBe('2023-12-01T00:00:00Z');
  });

  it('should parse GitHub URL correctly', async () => {
    await fetchGitHubRepository('https://github.com/testowner/test-repo');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/testowner/test-repo',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'README-Generator'
        })
      })
    );
  });

  it('should handle GitHub URLs with .git suffix', async () => {
    await fetchGitHubRepository('https://github.com/testowner/test-repo.git');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/testowner/test-repo',
      expect.anything()
    );
  });

  it('should include GitHub token in headers when available', async () => {
    const originalToken = process.env['GITHUB_TOKEN'];
    process.env['GITHUB_TOKEN'] = 'test-token-123';

    await fetchGitHubRepository('https://github.com/testowner/test-repo');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'token test-token-123'
        })
      })
    );

    // Restore original token
    if (originalToken) {
      process.env['GITHUB_TOKEN'] = originalToken;
    } else {
      delete process.env['GITHUB_TOKEN'];
    }
  });

  it('should handle repository not found error', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    }));

    await expect(fetchGitHubRepository('https://github.com/nonexistent/repo'))
      .rejects.toThrow(/repository not found or is private/i);
  });

  it('should handle rate limit error', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ message: 'API rate limit exceeded' })
    }));

    await expect(fetchGitHubRepository('https://github.com/testowner/test-repo'))
      .rejects.toThrow(/rate limit exceeded/i);
  });

  it('should handle invalid URL format', async () => {
    // Clear any previous mock calls
    mockFetch.mockClear();
    
    // Test URL with insufficient path parts (should fail parsing)
    await expect(fetchGitHubRepository('https://github.com/invalid'))
      .rejects.toThrow(/invalid github url format/i);

    // Test non-GitHub hostname (should fail validation in handler)  
    await expect(fetchGitHubRepository('https://example.com/owner/repo'))
      .rejects.toThrow(/failed to parse github url/i);
    
    // Verify that fetch was not called for invalid URLs since they fail parsing
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle network errors', async () => {
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

    await expect(fetchGitHubRepository('https://github.com/testowner/test-repo'))
      .rejects.toThrow(/network error/i);
  });
});

describe('fetchGitHubFileTree', () => {
  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockTreeResponse)
    }));
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch file tree structure successfully', async () => {
    const result = await fetchGitHubFileTree('testowner', 'test-repo', 'main');

    expect(result).toHaveLength(3); // README.md, src, package.json
    
    // Check root level files
    const readmeFile = result.find(item => item.name === 'README.md');
    expect(readmeFile).toBeDefined();
    expect(readmeFile!.type).toBe('file');
    expect(readmeFile!.path).toBe('README.md');
    expect(readmeFile!.children).toBeUndefined();

    const packageFile = result.find(item => item.name === 'package.json');
    expect(packageFile).toBeDefined();
    expect(packageFile!.type).toBe('file');

    // Check directory structure
    const srcDir = result.find(item => item.name === 'src');
    expect(srcDir).toBeDefined();
    expect(srcDir!.type).toBe('directory');
    expect(srcDir!.children).toBeDefined();
    expect(srcDir!.children).toHaveLength(1);
    
    const indexFile = srcDir!.children![0];
    expect(indexFile.name).toBe('index.ts');
    expect(indexFile.type).toBe('file');
    expect(indexFile.path).toBe('src/index.ts');
  });

  it('should use correct API endpoint', async () => {
    await fetchGitHubFileTree('testowner', 'test-repo', 'develop');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/testowner/test-repo/git/trees/develop?recursive=1',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/vnd.github.v3+json'
        })
      })
    );
  });

  it('should default to main branch', async () => {
    await fetchGitHubFileTree('testowner', 'test-repo');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/testowner/test-repo/git/trees/main?recursive=1',
      expect.anything()
    );
  });

  it('should handle empty repository', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ tree: [], truncated: false })
    }));

    const result = await fetchGitHubFileTree('testowner', 'empty-repo');

    expect(result).toEqual([]);
  });

  it('should handle complex nested structure', async () => {
    const complexTreeResponse = {
      tree: [
        {
          path: 'src',
          mode: '040000',
          type: 'tree' as const,
          sha: 'abc123',
          url: 'test-url'
        },
        {
          path: 'src/components',
          mode: '040000',
          type: 'tree' as const,
          sha: 'def456',
          url: 'test-url'
        },
        {
          path: 'src/components/Button.tsx',
          mode: '100644',
          type: 'blob' as const,
          sha: 'ghi789',
          url: 'test-url'
        },
        {
          path: 'src/utils',
          mode: '040000',
          type: 'tree' as const,
          sha: 'jkl012',
          url: 'test-url'
        },
        {
          path: 'src/utils/helpers.ts',
          mode: '100644',
          type: 'blob' as const,
          sha: 'mno345',
          url: 'test-url'
        }
      ],
      truncated: false
    };

    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(complexTreeResponse)
    }));

    const result = await fetchGitHubFileTree('testowner', 'complex-repo');

    expect(result).toHaveLength(1); // Just src directory at root
    
    const srcDir = result[0];
    expect(srcDir.name).toBe('src');
    expect(srcDir.type).toBe('directory');
    expect(srcDir.children).toHaveLength(2); // components and utils

    const componentsDir = srcDir.children!.find(child => child.name === 'components');
    expect(componentsDir).toBeDefined();
    expect(componentsDir!.children).toHaveLength(1);
    expect(componentsDir!.children![0].name).toBe('Button.tsx');

    const utilsDir = srcDir.children!.find(child => child.name === 'utils');
    expect(utilsDir).toBeDefined();
    expect(utilsDir!.children).toHaveLength(1);
    expect(utilsDir!.children![0].name).toBe('helpers.ts');
  });

  it('should handle API errors', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    }));

    await expect(fetchGitHubFileTree('testowner', 'nonexistent-repo'))
      .rejects.toThrow(/repository not found or is private/i);
  });
});