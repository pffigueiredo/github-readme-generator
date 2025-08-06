import { db } from '../db';
import { generatedReadmesTable } from '../db/schema';
import { type GetReadmeInput, type GeneratedReadme } from '../schema';
import { eq } from 'drizzle-orm';

export const getReadme = async (input: GetReadmeInput): Promise<GeneratedReadme> => {
  try {
    // Query database for README by ID
    const results = await db.select()
      .from(generatedReadmesTable)
      .where(eq(generatedReadmesTable.id, input.id))
      .execute();

    // Check if README was found
    if (results.length === 0) {
      throw new Error(`README with ID ${input.id} not found`);
    }

    const readme = results[0];
    
    // Return the README data
    return {
      id: readme.id,
      github_url: readme.github_url,
      repository_name: readme.repository_name,
      repository_description: readme.repository_description,
      markdown_content: readme.markdown_content,
      file_structure: readme.file_structure,
      created_at: readme.created_at,
      updated_at: readme.updated_at
    };
  } catch (error) {
    console.error('Failed to get README:', error);
    throw error;
  }
};