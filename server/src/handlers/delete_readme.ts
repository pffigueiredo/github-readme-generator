import { db } from '../db';
import { generatedReadmesTable } from '../db/schema';
import { type GetReadmeInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteReadme(input: GetReadmeInput): Promise<{ success: boolean }> {
  try {
    // Attempt to delete the README by ID
    const result = await db.delete(generatedReadmesTable)
      .where(eq(generatedReadmesTable.id, input.id))
      .returning()
      .execute();

    // Check if any row was actually deleted
    if (result.length === 0) {
      throw new Error(`README with ID ${input.id} not found`);
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('README deletion failed:', error);
    throw error;
  }
}