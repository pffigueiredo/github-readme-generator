import { z } from 'zod';

// GitHub repository URL validation
export const githubUrlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === 'github.com' && 
             parsedUrl.pathname.split('/').filter(Boolean).length >= 2;
    } catch {
      return false;
    }
  },
  { message: 'Must be a valid GitHub repository URL' }
);

// Repository information schema
export const repositoryInfoSchema = z.object({
  name: z.string(),
  full_name: z.string(), // e.g., "owner/repo-name"
  description: z.string().nullable(),
  html_url: z.string().url(),
  default_branch: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  language: z.string().nullable(),
  stars_count: z.number(),
  forks_count: z.number()
});

export type RepositoryInfo = z.infer<typeof repositoryInfoSchema>;

// File tree structure schema
export const fileTreeNodeSchema: z.ZodType<{
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: Array<{
    name: string;
    type: 'file' | 'directory';
    path: string;
    children?: any;
  }>;
}> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.enum(['file', 'directory']),
    path: z.string(),
    children: z.array(fileTreeNodeSchema).optional()
  })
);

export type FileTreeNode = z.infer<typeof fileTreeNodeSchema>;

// Generated README schema for database storage
export const generatedReadmeSchema = z.object({
  id: z.number(),
  github_url: z.string().url(),
  repository_name: z.string(),
  repository_description: z.string().nullable(),
  markdown_content: z.string(),
  file_structure: z.string(), // JSON string of FileTreeNode[]
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type GeneratedReadme = z.infer<typeof generatedReadmeSchema>;

// Input schema for generating README
export const generateReadmeInputSchema = z.object({
  github_url: githubUrlSchema
});

export type GenerateReadmeInput = z.infer<typeof generateReadmeInputSchema>;

// Response schema for README generation
export const generateReadmeResponseSchema = z.object({
  id: z.number(),
  github_url: z.string().url(),
  repository_name: z.string(),
  repository_description: z.string().nullable(),
  markdown_content: z.string(),
  created_at: z.coerce.date()
});

export type GenerateReadmeResponse = z.infer<typeof generateReadmeResponseSchema>;

// Input schema for retrieving README by ID
export const getReadmeInputSchema = z.object({
  id: z.number().int().positive()
});

export type GetReadmeInput = z.infer<typeof getReadmeInputSchema>;

// Input schema for listing user's READMEs (pagination)
export const listReadmesInputSchema = z.object({
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().nonnegative().default(0)
});

export type ListReadmesInput = z.infer<typeof listReadmesInputSchema>;

// Response schema for listing READMEs
export const listReadmesResponseSchema = z.object({
  readmes: z.array(z.object({
    id: z.number(),
    github_url: z.string().url(),
    repository_name: z.string(),
    repository_description: z.string().nullable(),
    created_at: z.coerce.date()
  })),
  total: z.number(),
  limit: z.number(),
  offset: z.number()
});

export type ListReadmesResponse = z.infer<typeof listReadmesResponseSchema>;