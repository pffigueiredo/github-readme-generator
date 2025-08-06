import { describe, expect, it } from 'bun:test';
import { generateMarkdownReadme } from '../handlers/generate_markdown';
import { type RepositoryInfo, type FileTreeNode } from '../schema';

// Sample repository data for testing
const testRepoInfo: RepositoryInfo = {
  name: 'awesome-project',
  full_name: 'testuser/awesome-project',
  description: 'An awesome test project for demonstrating README generation',
  html_url: 'https://github.com/testuser/awesome-project',
  default_branch: 'main',
  created_at: '2023-01-15T10:30:00Z',
  updated_at: '2024-01-15T15:45:00Z',
  language: 'TypeScript',
  stars_count: 1337,
  forks_count: 42
};

const testFileTree: FileTreeNode[] = [
  {
    name: 'src',
    type: 'directory',
    path: 'src',
    children: [
      {
        name: 'index.ts',
        type: 'file',
        path: 'src/index.ts'
      },
      {
        name: 'utils',
        type: 'directory',
        path: 'src/utils',
        children: [
          {
            name: 'helpers.ts',
            type: 'file',
            path: 'src/utils/helpers.ts'
          }
        ]
      }
    ]
  },
  {
    name: 'package.json',
    type: 'file',
    path: 'package.json'
  },
  {
    name: 'README.md',
    type: 'file',
    path: 'README.md'
  }
];

describe('generateMarkdownReadme', () => {
  it('should generate a complete markdown README', async () => {
    const result = await generateMarkdownReadme(testRepoInfo, testFileTree);

    expect(result).toBeTypeOf('string');
    expect(result.length).toBeGreaterThan(100);
    expect(result).toContain('# awesome-project');
    expect(result).toContain('An awesome test project for demonstrating README generation');
  });

  it('should include repository header and description', async () => {
    const result = await generateMarkdownReadme(testRepoInfo, testFileTree);

    // Check header
    expect(result).toContain('# awesome-project');
    expect(result).toContain('> An awesome test project for demonstrating README generation');
    
    // Check description section
    expect(result).toContain('## Description');
    expect(result).toContain('An awesome test project for demonstrating README generation');
  });

  it('should include badges section', async () => {
    const result = await generateMarkdownReadme(testRepoInfo, testFileTree);

    expect(result).toContain('## Badges');
    expect(result).toContain('![Language](https://img.shields.io/badge/Language-TypeScript-blue)');
    expect(result).toContain('![Stars](https://img.shields.io/badge/Stars-1337-yellow)');
    expect(result).toContain('![Forks](https://img.shields.io/badge/Forks-42-green)');
  });

  it('should include repository information table', async () => {
    const result = await generateMarkdownReadme(testRepoInfo, testFileTree);

    expect(result).toContain('## Repository Information');
    expect(result).toContain('| Property | Value |');
    expect(result).toContain('[testuser/awesome-project](https://github.com/testuser/awesome-project)');
    expect(result).toContain('main');
    expect(result).toContain('TypeScript');
    expect(result).toContain('1,337'); // Formatted with commas
    expect(result).toContain('42');
  });

  it('should generate proper file tree structure', async () => {
    const result = await generateMarkdownReadme(testRepoInfo, testFileTree);

    expect(result).toContain('## Project Structure');
    expect(result).toContain('```');
    expect(result).toContain('.');
    expect(result).toContain('├── 📁 src');
    expect(result).toContain('│   ├── 🔷 index.ts');
    expect(result).toContain('│   └── 📁 utils');
    expect(result).toContain('│       └── 🔷 helpers.ts');
    expect(result).toContain('├── 📋 package.json');
    expect(result).toContain('└── 📖 README.md');
  });

  it('should include technical overview', async () => {
    const result = await generateMarkdownReadme(testRepoInfo, testFileTree);

    expect(result).toContain('## Technical Overview');
    expect(result).toContain('**Total Files**: 4');
    expect(result).toContain('**Total Directories**: 2');
    expect(result).toContain('**File Types**: ts, json, md');
  });

  it('should include getting started section', async () => {
    const result = await generateMarkdownReadme(testRepoInfo, testFileTree);

    expect(result).toContain('## Getting Started');
    expect(result).toContain('git clone https://github.com/testuser/awesome-project.git');
    expect(result).toContain('cd awesome-project');
    expect(result).toContain('## Contributing');
  });

  it('should include footer with timestamp', async () => {
    const result = await generateMarkdownReadme(testRepoInfo, testFileTree);

    expect(result).toContain('---');
    expect(result).toContain('*This README was automatically generated on');
    expect(result).toContain('*For the most up-to-date information, please visit the [original repository]');
  });

  it('should handle repository without description', async () => {
    const repoWithoutDesc = { ...testRepoInfo, description: null };
    const result = await generateMarkdownReadme(repoWithoutDesc, testFileTree);

    expect(result).toContain('# awesome-project');
    expect(result).toContain('> A GitHub repository');
    expect(result).not.toContain('## Description');
  });

  it('should handle repository without language', async () => {
    const repoWithoutLang = { ...testRepoInfo, language: null };
    const result = await generateMarkdownReadme(repoWithoutLang, testFileTree);

    expect(result).toContain('**Primary Language** | Not specified');
    expect(result).not.toContain('![Language]');
  });

  it('should handle empty file tree', async () => {
    const result = await generateMarkdownReadme(testRepoInfo, []);

    expect(result).toContain('## Project Structure');
    expect(result).toContain('*No file structure available*');
    expect(result).not.toContain('## Technical Overview');
  });

  it('should use appropriate file icons', async () => {
    const fileTreeWithDifferentTypes: FileTreeNode[] = [
      { name: 'script.js', type: 'file', path: 'script.js' },
      { name: 'style.css', type: 'file', path: 'style.css' },
      { name: 'config.yml', type: 'file', path: 'config.yml' },
      { name: 'Dockerfile', type: 'file', path: 'Dockerfile' },
      { name: 'app.py', type: 'file', path: 'app.py' },
      { name: 'data.json', type: 'file', path: 'data.json' }
    ];

    const result = await generateMarkdownReadme(testRepoInfo, fileTreeWithDifferentTypes);

    expect(result).toContain('🟨 script.js'); // JavaScript
    expect(result).toContain('🎨 style.css'); // CSS
    expect(result).toContain('⚙️ config.yml'); // YAML
    expect(result).toContain('🐳 Dockerfile'); // Docker
    expect(result).toContain('🐍 app.py'); // Python
    expect(result).toContain('📋 data.json'); // JSON
  });

  it('should handle deeply nested file structure', async () => {
    const deepFileTree: FileTreeNode[] = [
      {
        name: 'deep',
        type: 'directory',
        path: 'deep',
        children: [
          {
            name: 'nested',
            type: 'directory',
            path: 'deep/nested',
            children: [
              {
                name: 'folder',
                type: 'directory',
                path: 'deep/nested/folder',
                children: [
                  {
                    name: 'file.txt',
                    type: 'file',
                    path: 'deep/nested/folder/file.txt'
                  }
                ]
              }
            ]
          }
        ]
      }
    ];

    const result = await generateMarkdownReadme(testRepoInfo, deepFileTree);

    expect(result).toContain('└── 📁 deep');
    expect(result).toContain('    └── 📁 nested');
    expect(result).toContain('        └── 📁 folder');
    expect(result).toContain('            └── 📄 file.txt');
  });

  it('should format large numbers with commas', async () => {
    const popularRepo = {
      ...testRepoInfo,
      stars_count: 123456,
      forks_count: 7890
    };

    const result = await generateMarkdownReadme(popularRepo, testFileTree);

    expect(result).toContain('**Stars** | 123,456');
    expect(result).toContain('**Forks** | 7,890');
    expect(result).toContain('![Stars](https://img.shields.io/badge/Stars-123456-yellow)');
    expect(result).toContain('![Forks](https://img.shields.io/badge/Forks-7890-green)');
  });

  it('should handle file tree with only directories', async () => {
    const dirOnlyTree: FileTreeNode[] = [
      {
        name: 'empty-dir',
        type: 'directory',
        path: 'empty-dir'
      },
      {
        name: 'another-dir',
        type: 'directory',
        path: 'another-dir',
        children: []
      }
    ];

    const result = await generateMarkdownReadme(testRepoInfo, dirOnlyTree);

    expect(result).toContain('**Total Files**: 0');
    expect(result).toContain('**Total Directories**: 2');
    expect(result).toContain('├── 📁 empty-dir');
    expect(result).toContain('└── 📁 another-dir');
  });

  it('should analyze and limit file types in technical overview', async () => {
    const manyTypesTree: FileTreeNode[] = Array.from({ length: 15 }, (_, i) => ({
      name: `file${i}.ext${i}`,
      type: 'file' as const,
      path: `file${i}.ext${i}`
    }));

    const result = await generateMarkdownReadme(testRepoInfo, manyTypesTree);

    expect(result).toContain('## Technical Overview');
    expect(result).toContain('**Total Files**: 15');
    
    // Should limit to 10 file types
    const fileTypesMatch = result.match(/\*\*File Types\*\*: (.+)/);
    if (fileTypesMatch) {
      const fileTypes = fileTypesMatch[1].split(', ');
      expect(fileTypes.length).toBeLessThanOrEqual(10);
    }
  });
});