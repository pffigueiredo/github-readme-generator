import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { generatedReadmesTable } from '../db/schema';
import { type GetReadmeInput } from '../schema';
import { deleteReadme } from '../handlers/delete_readme';
import { eq } from 'drizzle-orm';

// Test input for deleting README
const testDeleteInput: GetReadmeInput = {
  id: 1
};

describe('deleteReadme', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing README and return success', async () => {
    // First create a test README
    const testReadme = {
      github_url: 'https://github.com/test/repo',
      repository_name: 'test-repo',
      repository_description: 'A test repository',
      markdown_content: '# Test README\n\nThis is a test.',
      file_structure: JSON.stringify([{
        name: 'src',
        type: 'directory' as const,
        path: 'src',
        children: [{
          name: 'index.ts',
          type: 'file' as const,
          path: 'src/index.ts'
        }]
      }])
    };

    const [insertedReadme] = await db.insert(generatedReadmesTable)
      .values(testReadme)
      .returning()
      .execute();

    // Delete the README
    const result = await deleteReadme({ id: insertedReadme.id });

    // Should return success
    expect(result.success).toBe(true);

    // Verify the README was actually deleted from database
    const remainingReadmes = await db.select()
      .from(generatedReadmesTable)
      .where(eq(generatedReadmesTable.id, insertedReadme.id))
      .execute();

    expect(remainingReadmes).toHaveLength(0);
  });

  it('should throw error when README does not exist', async () => {
    const nonExistentId = 999;

    // Attempt to delete non-existent README
    await expect(deleteReadme({ id: nonExistentId }))
      .rejects
      .toThrow(/README with ID 999 not found/i);
  });

  it('should not affect other READMEs when deleting one', async () => {
    // Create two test READMEs
    const testReadme1 = {
      github_url: 'https://github.com/test/repo1',
      repository_name: 'test-repo-1',
      repository_description: 'First test repository',
      markdown_content: '# Test README 1\n\nThis is the first test.',
      file_structure: JSON.stringify([])
    };

    const testReadme2 = {
      github_url: 'https://github.com/test/repo2',
      repository_name: 'test-repo-2',
      repository_description: 'Second test repository',
      markdown_content: '# Test README 2\n\nThis is the second test.',
      file_structure: JSON.stringify([])
    };

    const [insertedReadme1] = await db.insert(generatedReadmesTable)
      .values(testReadme1)
      .returning()
      .execute();

    const [insertedReadme2] = await db.insert(generatedReadmesTable)
      .values(testReadme2)
      .returning()
      .execute();

    // Delete only the first README
    const result = await deleteReadme({ id: insertedReadme1.id });

    expect(result.success).toBe(true);

    // Verify first README is deleted
    const deletedReadme = await db.select()
      .from(generatedReadmesTable)
      .where(eq(generatedReadmesTable.id, insertedReadme1.id))
      .execute();

    expect(deletedReadme).toHaveLength(0);

    // Verify second README still exists
    const remainingReadme = await db.select()
      .from(generatedReadmesTable)
      .where(eq(generatedReadmesTable.id, insertedReadme2.id))
      .execute();

    expect(remainingReadme).toHaveLength(1);
    expect(remainingReadme[0].repository_name).toBe('test-repo-2');
  });

  it('should handle positive integer IDs correctly', async () => {
    // Create a test README
    const testReadme = {
      github_url: 'https://github.com/example/test',
      repository_name: 'example-test',
      repository_description: null,
      markdown_content: '# Example\n\nTest content.',
      file_structure: JSON.stringify([])
    };

    const [insertedReadme] = await db.insert(generatedReadmesTable)
      .values(testReadme)
      .returning()
      .execute();

    // Test with the actual generated ID (which should be a positive integer)
    const result = await deleteReadme({ id: insertedReadme.id });

    expect(result.success).toBe(true);
    expect(insertedReadme.id).toBeGreaterThan(0);
    expect(Number.isInteger(insertedReadme.id)).toBe(true);
  });
});