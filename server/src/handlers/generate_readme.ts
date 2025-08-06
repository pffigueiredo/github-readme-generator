import { db } from '../db';
import { generatedReadmesTable } from '../db/schema';
import { type GenerateReadmeInput, type GenerateReadmeResponse, type RepositoryInfo, type FileTreeNode } from '../schema';

// Helper function to parse GitHub URL
function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const parsedUrl = new URL(url);
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  
  if (pathParts.length < 2) {
    throw new Error('Invalid GitHub URL format');
  }
  
  return {
    owner: pathParts[0],
    repo: pathParts[1]
  };
}

// Helper function to fetch repository information from GitHub API
async function fetchRepositoryInfo(owner: string, repo: string): Promise<RepositoryInfo> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Repository not found');
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  const data = await response.json() as any;
  
  return {
    name: data.name,
    full_name: data.full_name,
    description: data.description,
    html_url: data.html_url,
    default_branch: data.default_branch,
    created_at: data.created_at,
    updated_at: data.updated_at,
    language: data.language,
    stars_count: data.stargazers_count,
    forks_count: data.forks_count
  };
}

// Helper function to fetch file tree from GitHub API
async function fetchFileTree(owner: string, repo: string, defaultBranch: string): Promise<FileTreeNode[]> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file tree: ${response.status}`);
  }
  
  const data = await response.json() as any;
  
  // Build file tree structure from flat GitHub API response
  const fileMap = new Map<string, FileTreeNode>();
  const rootFiles: FileTreeNode[] = [];
  
  // Sort by path to ensure parent directories are processed first
  data.tree.sort((a: any, b: any) => a.path.localeCompare(b.path));
  
  for (const item of data.tree) {
    const node: FileTreeNode = {
      name: item.path.split('/').pop() || item.path,
      type: item.type === 'tree' ? 'directory' : 'file',
      path: item.path,
      children: item.type === 'tree' ? [] : undefined
    };
    
    fileMap.set(item.path, node);
    
    const pathParts = item.path.split('/');
    if (pathParts.length === 1) {
      // Root level file/directory
      rootFiles.push(node);
    } else {
      // Find parent directory
      const parentPath = pathParts.slice(0, -1).join('/');
      const parent = fileMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    }
  }
  
  return rootFiles;
}

// Helper function to generate markdown content
function generateMarkdownContent(repoInfo: RepositoryInfo, fileTree: FileTreeNode[]): string {
  const markdown = [];
  
  // Title and description
  markdown.push(`# ${repoInfo.name}`);
  if (repoInfo.description) {
    markdown.push(`\n${repoInfo.description}`);
  }
  
  // Repository information
  markdown.push('\n## Repository Information');
  markdown.push(`- **Language**: ${repoInfo.language || 'Not specified'}`);
  markdown.push(`- **Stars**: ${repoInfo.stars_count}`);
  markdown.push(`- **Forks**: ${repoInfo.forks_count}`);
  markdown.push(`- **Created**: ${new Date(repoInfo.created_at).toLocaleDateString()}`);
  markdown.push(`- **Last Updated**: ${new Date(repoInfo.updated_at).toLocaleDateString()}`);
  markdown.push(`- **Default Branch**: ${repoInfo.default_branch}`);
  
  // File structure
  markdown.push('\n## File Structure');
  markdown.push('```');
  
  function renderFileTree(nodes: FileTreeNode[], prefix: string = ''): void {
    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      markdown.push(`${prefix}${connector}${node.name}`);
      
      if (node.children && node.children.length > 0) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        renderFileTree(node.children, newPrefix);
      }
    });
  }
  
  renderFileTree(fileTree);
  markdown.push('```');
  
  // Link to repository
  markdown.push(`\n## Links`);
  markdown.push(`- [View on GitHub](${repoInfo.html_url})`);
  
  return markdown.join('\n');
}

export async function generateReadme(input: GenerateReadmeInput): Promise<GenerateReadmeResponse> {
  try {
    // 1. Parse the GitHub repository URL
    const { owner, repo } = parseGitHubUrl(input.github_url);
    
    // 2. Fetch repository information from GitHub API
    const repoInfo = await fetchRepositoryInfo(owner, repo);
    
    // 3. Fetch the repository's file structure from GitHub API
    const fileTree = await fetchFileTree(owner, repo, repoInfo.default_branch);
    
    // 4. Generate a markdown README with repo info and file structure
    const markdownContent = generateMarkdownContent(repoInfo, fileTree);
    
    // 5. Store the generated README in the database
    const result = await db.insert(generatedReadmesTable)
      .values({
        github_url: input.github_url,
        repository_name: repoInfo.name,
        repository_description: repoInfo.description,
        markdown_content: markdownContent,
        file_structure: JSON.stringify(fileTree)
      })
      .returning()
      .execute();
    
    const savedReadme = result[0];
    
    // 6. Return the generated README data
    return {
      id: savedReadme.id,
      github_url: savedReadme.github_url,
      repository_name: savedReadme.repository_name,
      repository_description: savedReadme.repository_description,
      markdown_content: savedReadme.markdown_content,
      created_at: savedReadme.created_at
    };
  } catch (error) {
    console.error('README generation failed:', error);
    throw error;
  }
}