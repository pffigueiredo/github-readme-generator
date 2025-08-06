import { serial, text, pgTable, timestamp, integer } from 'drizzle-orm/pg-core';

export const generatedReadmesTable = pgTable('generated_readmes', {
  id: serial('id').primaryKey(),
  github_url: text('github_url').notNull(),
  repository_name: text('repository_name').notNull(),
  repository_description: text('repository_description'), // Nullable by default
  markdown_content: text('markdown_content').notNull(),
  file_structure: text('file_structure').notNull(), // JSON string of file tree structure
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// TypeScript types for the table schema
export type GeneratedReadme = typeof generatedReadmesTable.$inferSelect; // For SELECT operations
export type NewGeneratedReadme = typeof generatedReadmesTable.$inferInsert; // For INSERT operations

// Important: Export all tables for proper query building
export const tables = { generatedReadmes: generatedReadmesTable };