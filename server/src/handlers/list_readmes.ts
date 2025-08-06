import { db } from '../db';
import { generatedReadmesTable } from '../db/schema';
import { desc, count } from 'drizzle-orm';
import { type ListReadmesInput, type ListReadmesResponse } from '../schema';

export const listReadmes = async (input: ListReadmesInput): Promise<ListReadmesResponse> => {
  try {
    // Query for READMEs with pagination and ordering
    const readmes = await db.select({
      id: generatedReadmesTable.id,
      github_url: generatedReadmesTable.github_url,
      repository_name: generatedReadmesTable.repository_name,
      repository_description: generatedReadmesTable.repository_description,
      created_at: generatedReadmesTable.created_at
    })
    .from(generatedReadmesTable)
    .orderBy(desc(generatedReadmesTable.created_at))
    .limit(input.limit)
    .offset(input.offset)
    .execute();

    // Get total count for pagination
    const totalResult = await db.select({ count: count() })
      .from(generatedReadmesTable)
      .execute();

    const total = totalResult[0]?.count || 0;

    return {
      readmes,
      total,
      limit: input.limit,
      offset: input.offset
    };
  } catch (error) {
    console.error('List READMEs failed:', error);
    throw error;
  }
};