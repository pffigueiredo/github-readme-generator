import { type RepositoryInfo, type FileTreeNode } from '../schema';

// GitHub API interfaces
interface GitHubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}

interface GitHubTreeResponse {
  tree: Array<{
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
    url: string;
  }>;
  truncated: boolean;
}

/**
 * Parse GitHub URL to extract owner and repository name
 */
function parseGitHubUrl(githubUrl: string): { owner: string; repo: string } {
  try {
    const url = new URL(githubUrl);
    
    // Validate that it's a GitHub URL
    if (url.hostname !== 'github.com') {
      throw new Error('URL must be from github.com');
    }
    
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub URL format');
    }
    
    const owner = pathParts[0];
    const repo = pathParts[1].replace(/\.git$/, ''); // Remove .git suffix if present
    
    return { owner, repo };
  } catch (error) {
    throw new Error(`Failed to parse GitHub URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Make authenticated request to GitHub API
 */
async function makeGitHubApiRequest(url: string): Promise<any> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'README-Generator'
  };

  // Add authentication if GitHub token is available
  const githubToken = process.env['GITHUB_TOKEN'];
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repository not found or is private');
      }
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({})) as any;
        if (errorData.message?.includes('rate limit')) {
          throw new Error('GitHub API rate limit exceeded');
        }
        throw new Error('Access forbidden - repository may be private');
      }
      if (response.status === 401) {
        throw new Error('Invalid GitHub token');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch data from GitHub API');
  }
}

/**
 * Fetch repository information from GitHub API
 */
export async function fetchGitHubRepository(githubUrl: string): Promise<RepositoryInfo> {
  try {
    const { owner, repo } = parseGitHubUrl(githubUrl);
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    
    const repoData: GitHubRepoResponse = await makeGitHubApiRequest(apiUrl);
    
    return {
      name: repoData.name,
      full_name: repoData.full_name,
      description: repoData.description,
      html_url: repoData.html_url,
      default_branch: repoData.default_branch,
      created_at: repoData.created_at,
      updated_at: repoData.updated_at,
      language: repoData.language,
      stars_count: repoData.stargazers_count,
      forks_count: repoData.forks_count
    };
  } catch (error) {
    console.error('Repository fetch failed:', error);
    throw error;
  }
}

/**
 * Build hierarchical file tree structure from flat GitHub tree data
 */
function buildFileTree(treeItems: GitHubTreeResponse['tree']): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const directoryMap = new Map<string, FileTreeNode>();

  // Sort items to process directories before files
  const sortedItems = treeItems.sort((a, b) => {
    if (a.type === 'tree' && b.type === 'blob') return -1;
    if (a.type === 'blob' && b.type === 'tree') return 1;
    return a.path.localeCompare(b.path);
  });

  for (const item of sortedItems) {
    const pathParts = item.path.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    if (pathParts.length === 1) {
      // Root level item
      const node: FileTreeNode = {
        name: fileName,
        type: item.type === 'tree' ? 'directory' : 'file',
        path: item.path,
        children: item.type === 'tree' ? [] : undefined
      };
      
      root.push(node);
      if (item.type === 'tree') {
        directoryMap.set(item.path, node);
      }
    } else {
      // Nested item - find parent directory
      const parentPath = pathParts.slice(0, -1).join('/');
      const parentNode = directoryMap.get(parentPath);
      
      if (parentNode && parentNode.children) {
        const node: FileTreeNode = {
          name: fileName,
          type: item.type === 'tree' ? 'directory' : 'file',
          path: item.path,
          children: item.type === 'tree' ? [] : undefined
        };
        
        parentNode.children.push(node);
        if (item.type === 'tree') {
          directoryMap.set(item.path, node);
        }
      }
    }
  }

  return root;
}

/**
 * Fetch repository file tree structure from GitHub API
 */
export async function fetchGitHubFileTree(owner: string, repo: string, branch: string = 'main'): Promise<FileTreeNode[]> {
  try {
    // Use the git trees API with recursive=1 to get full tree structure
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    
    const treeData: GitHubTreeResponse = await makeGitHubApiRequest(apiUrl);
    
    // Limit the number of files to prevent overwhelming responses
    const MAX_FILES = 1000;
    let filteredTree = treeData.tree;
    
    if (filteredTree.length > MAX_FILES) {
      // Prioritize important files and directories
      const importantPaths = new Set([
        'README.md', 'README.rst', 'README.txt',
        'package.json', 'requirements.txt', 'Cargo.toml',
        'Dockerfile', 'docker-compose.yml',
        '.gitignore', 'LICENSE', 'CONTRIBUTING.md'
      ]);
      
      const important = filteredTree.filter(item => 
        importantPaths.has(item.path) || 
        item.path.split('/').length <= 2 // Keep shallow files/dirs
      );
      
      const remaining = filteredTree.filter(item => 
        !importantPaths.has(item.path) && 
        item.path.split('/').length > 2
      ).slice(0, MAX_FILES - important.length);
      
      filteredTree = [...important, ...remaining];
    }
    
    const fileTree = buildFileTree(filteredTree);
    
    if (treeData.truncated) {
      console.warn(`File tree was truncated for ${owner}/${repo}`);
    }
    
    return fileTree;
  } catch (error) {
    console.error('File tree fetch failed:', error);
    throw error;
  }
}