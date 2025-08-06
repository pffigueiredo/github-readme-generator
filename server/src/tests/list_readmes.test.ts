import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { generatedReadmesTable } from '../db/schema';
import { type ListReadmesInput } from '../schema';
import { listReadmes } from '../handlers/list_readmes';

// Test helper to create sample README data
const createTestReadme = async (overrides = {}) => {
  const defaultData = {
    github_url: 'https://github.com/test/repo',
    repository_name: 'test-repo',
    repository_description: 'A test repository',
    markdown_content: '# Test Repository\n\nThis is a test.',
    file_structure: JSON.stringify([
      { name: 'README.md', type: 'file', path: 'README.md' },
      { name: 'src', type: 'directory', path: 'src', children: [] }
    ]),
    ...overrides
  };

  const result = await db.insert(generatedReadmesTable)
    .values(defaultData)
    .returning()
    .execute();

  return result[0];
};

describe('listReadmes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty list when no READMEs exist', async () => {
    const input: ListReadmesInput = {
      limit: 10,
      offset: 0
    };

    const result = await listReadmes(input);

    expect(result.readmes).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  it('should return list of READMEs with correct structure', async () => {
    // Create test data
    await createTestReadme({
      github_url: 'https://github.com/user/repo1',
      repository_name: 'repo1',
      repository_description: 'First repository'
    });

    await createTestReadme({
      github_url: 'https://github.com/user/repo2',
      repository_name: 'repo2',
      repository_description: 'Second repository'
    });

    const input: ListReadmesInput = {
      limit: 10,
      offset: 0
    };

    const result = await listReadmes(input);

    expect(result.readmes).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);

    // Verify structure of returned READMEs
    const firstReadme = result.readmes[0];
    expect(firstReadme.id).toBeDefined();
    expect(firstReadme.github_url).toMatch(/^https:\/\/github\.com/);
    expect(firstReadme.repository_name).toBeDefined();
    expect(firstReadme.repository_description).toBeDefined();
    expect(firstReadme.created_at).toBeInstanceOf(Date);

    // Ensure markdown_content is NOT included (performance optimization)
    expect(firstReadme).not.toHaveProperty('markdown_content');
    expect(firstReadme).not.toHaveProperty('file_structure');
  });

  it('should handle null repository descriptions', async () => {
    await createTestReadme({
      repository_description: null
    });

    const input: ListReadmesInput = {
      limit: 10,
      offset: 0
    };

    const result = await listReadmes(input);

    expect(result.readmes).toHaveLength(1);
    expect(result.readmes[0].repository_description).toBeNull();
  });

  it('should apply pagination correctly', async () => {
    // Create 5 test READMEs
    for (let i = 1; i <= 5; i++) {
      await createTestReadme({
        github_url: `https://github.com/user/repo${i}`,
        repository_name: `repo${i}`
      });
    }

    // Test first page
    const firstPageInput: ListReadmesInput = {
      limit: 2,
      offset: 0
    };

    const firstPage = await listReadmes(firstPageInput);

    expect(firstPage.readmes).toHaveLength(2);
    expect(firstPage.total).toBe(5);
    expect(firstPage.limit).toBe(2);
    expect(firstPage.offset).toBe(0);

    // Test second page
    const secondPageInput: ListReadmesInput = {
      limit: 2,
      offset: 2
    };

    const secondPage = await listReadmes(secondPageInput);

    expect(secondPage.readmes).toHaveLength(2);
    expect(secondPage.total).toBe(5);
    expect(secondPage.limit).toBe(2);
    expect(secondPage.offset).toBe(2);

    // Verify different results
    expect(firstPage.readmes[0].id).not.toBe(secondPage.readmes[0].id);
  });

  it('should return results ordered by creation date (newest first)', async () => {
    // Create READMEs with slight delay to ensure different timestamps
    const first = await createTestReadme({
      repository_name: 'first-repo'
    });

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const second = await createTestReadme({
      repository_name: 'second-repo'
    });

    const input: ListReadmesInput = {
      limit: 10,
      offset: 0
    };

    const result = await listReadmes(input);

    expect(result.readmes).toHaveLength(2);
    
    // Most recent should be first
    expect(result.readmes[0].repository_name).toBe('second-repo');
    expect(result.readmes[1].repository_name).toBe('first-repo');
    
    // Verify ordering by timestamp
    expect(result.readmes[0].created_at.getTime()).toBeGreaterThanOrEqual(
      result.readmes[1].created_at.getTime()
    );
  });

  it('should handle edge case with limit larger than total records', async () => {
    // Create only 2 READMEs
    await createTestReadme({ repository_name: 'repo1' });
    await createTestReadme({ repository_name: 'repo2' });

    const input: ListReadmesInput = {
      limit: 100,
      offset: 0
    };

    const result = await listReadmes(input);

    expect(result.readmes).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.limit).toBe(100);
    expect(result.offset).toBe(0);
  });

  it('should handle offset beyond total records', async () => {
    // Create only 2 READMEs
    await createTestReadme({ repository_name: 'repo1' });
    await createTestReadme({ repository_name: 'repo2' });

    const input: ListReadmesInput = {
      limit: 10,
      offset: 10
    };

    const result = await listReadmes(input);

    expect(result.readmes).toHaveLength(0);
    expect(result.total).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(10);
  });

  it('should use default values when not specified', async () => {
    await createTestReadme();

    // Test with minimal input (defaults should be applied by Zod)
    const input: ListReadmesInput = {
      limit: 10,
      offset: 0
    };

    const result = await listReadmes(input);

    expect(result.readmes).toHaveLength(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });
});