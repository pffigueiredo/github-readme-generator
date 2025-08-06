import { type RepositoryInfo, type FileTreeNode } from '../schema';

export async function generateMarkdownReadme(
    repoInfo: RepositoryInfo, 
    fileTree: FileTreeNode[]
): Promise<string> {
    try {
        // Generate comprehensive markdown README
        const sections = [
            generateHeader(repoInfo),
            generateDescription(repoInfo),
            generateBadges(repoInfo),
            generateRepositoryInfo(repoInfo),
            generateFileStructure(fileTree),
            generateTechnicalDetails(repoInfo, fileTree),
            generateGettingStarted(repoInfo),
            generateFooter()
        ];

        return sections.filter(Boolean).join('\n\n');
    } catch (error) {
        console.error('Markdown generation failed:', error);
        throw error;
    }
}

function generateHeader(repoInfo: RepositoryInfo): string {
    return `# ${repoInfo.name}\n\n> ${repoInfo.description || 'A GitHub repository'}`;
}

function generateDescription(repoInfo: RepositoryInfo): string {
    if (!repoInfo.description) return '';
    
    return `## Description\n\n${repoInfo.description}`;
}

function generateBadges(repoInfo: RepositoryInfo): string {
    const badges = [];
    
    // Language badge
    if (repoInfo.language) {
        badges.push(`![Language](https://img.shields.io/badge/Language-${encodeURIComponent(repoInfo.language)}-blue)`);
    }
    
    // Stars badge
    badges.push(`![Stars](https://img.shields.io/badge/Stars-${repoInfo.stars_count}-yellow)`);
    
    // Forks badge
    badges.push(`![Forks](https://img.shields.io/badge/Forks-${repoInfo.forks_count}-green)`);
    
    return badges.length > 0 ? `## Badges\n\n${badges.join(' ')}` : '';
}

function generateRepositoryInfo(repoInfo: RepositoryInfo): string {
    const createdDate = new Date(repoInfo.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const updatedDate = new Date(repoInfo.updated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `## Repository Information

| Property | Value |
|----------|--------|
| **Repository** | [${repoInfo.full_name}](${repoInfo.html_url}) |
| **Default Branch** | ${repoInfo.default_branch} |
| **Primary Language** | ${repoInfo.language || 'Not specified'} |
| **Stars** | ${repoInfo.stars_count.toLocaleString()} |
| **Forks** | ${repoInfo.forks_count.toLocaleString()} |
| **Created** | ${createdDate} |
| **Last Updated** | ${updatedDate} |`;
}

function generateFileStructure(fileTree: FileTreeNode[]): string {
    if (!fileTree || fileTree.length === 0) {
        return `## Project Structure\n\n*No file structure available*`;
    }

    const treeText = generateFileTreeText(fileTree);
    return `## Project Structure

\`\`\`
${treeText.trimEnd()}
\`\`\``;
}

function generateFileTreeText(nodes: FileTreeNode[], prefix: string = '', isRoot: boolean = true): string {
    let result = '';
    
    // Add root indicator for the top level
    if (isRoot && nodes.length > 0) {
        result += '.\n';
    }
    
    nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        
        // Use appropriate icons for different file types
        const icon = getFileIcon(node);
        
        result += `${prefix}${connector}${icon} ${node.name}\n`;
        
        if (node.children && node.children.length > 0) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            result += generateFileTreeText(node.children, newPrefix, false);
        }
    });
    
    return result;
}

function getFileIcon(node: FileTreeNode): string {
    if (node.type === 'directory') {
        return '📁';
    }
    
    // Get file extension for better icons
    const extension = node.name.split('.').pop()?.toLowerCase() || '';
    const fileName = node.name.toLowerCase();
    
    const iconMap: Record<string, string> = {
        'js': '🟨',
        'ts': '🔷',
        'json': '📋',
        'md': '📝',
        'txt': '📄',
        'py': '🐍',
        'java': '☕',
        'html': '🌐',
        'css': '🎨',
        'yml': '⚙️',
        'yaml': '⚙️',
        'xml': '📰',
        'sql': '🗄️',
        'sh': '🐚',
        'dockerfile': '🐳',
        'gitignore': '🚫',
        'license': '📜'
    };
    
    // Special case for README files
    if (fileName === 'readme.md' || fileName === 'readme') {
        return '📖';
    }
    
    return iconMap[extension] || '📄';
}

function generateTechnicalDetails(repoInfo: RepositoryInfo, fileTree: FileTreeNode[]): string {
    const stats = analyzeFileStructure(fileTree);
    
    if (stats.totalFiles === 0 && stats.totalDirectories === 0) {
        return '';
    }

    return `## Technical Overview

- **Total Files**: ${stats.totalFiles}
- **Total Directories**: ${stats.totalDirectories}
- **File Types**: ${stats.fileTypes.join(', ') || 'Mixed'}
- **Repository Size**: Analysis based on ${stats.totalFiles} files`;
}

function analyzeFileStructure(nodes: FileTreeNode[]): {
    totalFiles: number;
    totalDirectories: number;
    fileTypes: string[];
} {
    let totalFiles = 0;
    let totalDirectories = 0;
    const extensions = new Set<string>();
    
    function traverse(nodeList: FileTreeNode[]) {
        for (const node of nodeList) {
            if (node.type === 'file') {
                totalFiles++;
                const extension = node.name.split('.').pop()?.toLowerCase();
                if (extension) {
                    extensions.add(extension);
                }
            } else {
                totalDirectories++;
            }
            
            if (node.children) {
                traverse(node.children);
            }
        }
    }
    
    traverse(nodes);
    
    return {
        totalFiles,
        totalDirectories,
        fileTypes: Array.from(extensions).slice(0, 10) // Limit to first 10 types
    };
}

function generateGettingStarted(repoInfo: RepositoryInfo): string {
    const cloneCommand = `git clone ${repoInfo.html_url}.git`;
    const dirName = repoInfo.name;
    
    return `## Getting Started

To get started with this repository:

1. **Clone the repository**
   \`\`\`bash
   ${cloneCommand}
   cd ${dirName}
   \`\`\`

2. **Explore the codebase**
   - Check out the project structure above
   - Read any additional documentation in the repository
   - Look for configuration files like \`package.json\`, \`requirements.txt\`, or similar

3. **Follow repository-specific instructions**
   - Refer to the original repository for detailed setup instructions
   - Check for \`README.md\`, \`CONTRIBUTING.md\`, or \`INSTALL.md\` files

## Contributing

For contribution guidelines, please refer to the original repository at [${repoInfo.html_url}](${repoInfo.html_url}).`;
}

function generateFooter(): string {
    const timestamp = new Date().toISOString();
    return `---

*This README was automatically generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}*

*For the most up-to-date information, please visit the [original repository](https://github.com).*`;
}