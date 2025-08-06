import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { generatedReadmesTable } from '../db/schema';
import { type GetReadmeInput } from '../schema';
import { getReadme } from '../handlers/get_readme';

// Test data
const testReadmeData = {
  github_url: 'https://github.com/test/repo',
  repository_name: 'test-repo',
  repository_description: 'A test repository for testing purposes',
  markdown_content: '# Test Repository\n\nThis is a test README content.\n\n## Features\n- Feature 1\n- Feature 2',
  file_structure: JSON.stringify([
    {
      name: 'src',
      type: 'directory',
      path: 'src',
      children: [
        { name: 'index.ts', type: 'file', path: 'src/index.ts' }
      ]
    },
    { name: 'README.md', type: 'file', path: 'README.md' }
  ])
};

const testReadmeDataWithoutDescription = {
  github_url: 'https://github.com/test/another-repo',
  repository_name: 'another-test-repo',
  repository_description: null,
  markdown_content: '# Another Test Repository\n\nThis repo has no description.',
  file_structure: JSON.stringify([
    { name: 'package.json', type: 'file', path: 'package.json' }
  ])
};

describe('getReadme', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve a README by ID', async () => {
    // Create test README
    const insertResult = await db.insert(generatedReadmesTable)
      .values(testReadmeData)
      .returning()
      .execute();

    const createdReadme = insertResult[0];
    const input: GetReadmeInput = { id: createdReadme.id };

    // Test retrieval
    const result = await getReadme(input);

    // Validate all fields
    expect(result.id).toEqual(createdReadme.id);
    expect(result.github_url).toEqual('https://github.com/test/repo');
    expect(result.repository_name).toEqual('test-repo');
    expect(result.repository_description).toEqual('A test repository for testing purposes');
    expect(result.markdown_content).toEqual('# Test Repository\n\nThis is a test README content.\n\n## Features\n- Feature 1\n- Feature 2');
    expect(result.file_structure).toEqual(testReadmeData.file_structure);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle README with null description', async () => {
    // Create test README with null description
    const insertResult = await db.insert(generatedReadmesTable)
      .values(testReadmeDataWithoutDescription)
      .returning()
      .execute();

    const createdReadme = insertResult[0];
    const input: GetReadmeInput = { id: createdReadme.id };

    // Test retrieval
    const result = await getReadme(input);

    // Validate fields
    expect(result.id).toEqual(createdReadme.id);
    expect(result.github_url).toEqual('https://github.com/test/another-repo');
    expect(result.repository_name).toEqual('another-test-repo');
    expect(result.repository_description).toBeNull();
    expect(result.markdown_content).toEqual('# Another Test Repository\n\nThis repo has no description.');
    expect(result.file_structure).toEqual(testReadmeDataWithoutDescription.file_structure);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when README not found', async () => {
    const input: GetReadmeInput = { id: 999 }; // Non-existent ID

    // Test error handling
    await expect(getReadme(input)).rejects.toThrow(/README with ID 999 not found/i);
  });

  it('should handle complex file structures correctly', async () => {
    // Create complex file structure
    const complexFileStructure = JSON.stringify([
      {
        name: 'src',
        type: 'directory',
        path: 'src',
        children: [
          {
            name: 'components',
            type: 'directory',
            path: 'src/components',
            children: [
              { name: 'Button.tsx', type: 'file', path: 'src/components/Button.tsx' },
              { name: 'Modal.tsx', type: 'file', path: 'src/components/Modal.tsx' }
            ]
          },
          { name: 'index.ts', type: 'file', path: 'src/index.ts' },
          { name: 'types.ts', type: 'file', path: 'src/types.ts' }
        ]
      },
      {
        name: 'tests',
        type: 'directory',
        path: 'tests',
        children: [
          { name: 'Button.test.tsx', type: 'file', path: 'tests/Button.test.tsx' }
        ]
      },
      { name: 'package.json', type: 'file', path: 'package.json' },
      { name: 'README.md', type: 'file', path: 'README.md' }
    ]);

    const complexTestData = {
      ...testReadmeData,
      repository_name: 'complex-repo',
      file_structure: complexFileStructure
    };

    // Create test README with complex structure
    const insertResult = await db.insert(generatedReadmesTable)
      .values(complexTestData)
      .returning()
      .execute();

    const createdReadme = insertResult[0];
    const input: GetReadmeInput = { id: createdReadme.id };

    // Test retrieval
    const result = await getReadme(input);

    // Validate file structure is preserved
    expect(result.file_structure).toEqual(complexFileStructure);
    expect(result.repository_name).toEqual('complex-repo');

    // Verify the JSON structure can be parsed
    const parsedStructure = JSON.parse(result.file_structure);
    expect(parsedStructure).toHaveLength(4); // src, tests, package.json, README.md
    expect(parsedStructure[0].name).toEqual('src');
    expect(parsedStructure[0].children).toHaveLength(3);
    expect(parsedStructure[0].children[0].children).toHaveLength(2);
  });

  it('should preserve exact timestamps from database', async () => {
    // Create test README
    const insertResult = await db.insert(generatedReadmesTable)
      .values(testReadmeData)
      .returning()
      .execute();

    const createdReadme = insertResult[0];
    const input: GetReadmeInput = { id: createdReadme.id };

    // Test retrieval
    const result = await getReadme(input);

    // Verify timestamps match exactly
    expect(result.created_at.getTime()).toEqual(createdReadme.created_at.getTime());
    expect(result.updated_at.getTime()).toEqual(createdReadme.updated_at.getTime());
  });

  it('should handle large markdown content', async () => {
    // Create large markdown content (simulating real README)
    const largeMarkdown = `# Large Repository\n\n` +
      `## Description\n\n` +
      `This is a comprehensive README with lots of content.\n\n` +
      `## Installation\n\n` +
      '```bash\nnpm install\n```\n\n' +
      `## Usage\n\n` +
      '```typescript\nimport { SomeClass } from "./src/index";\n\nconst instance = new SomeClass();\ninstance.doSomething();\n```\n\n' +
      `## API Reference\n\n` +
      `### Classes\n\n` +
      `- **SomeClass**: Main class\n` +
      `- **AnotherClass**: Helper class\n\n` +
      `### Methods\n\n` +
      `- **doSomething()**: Does something\n` +
      `- **doAnother()**: Does another thing\n\n` +
      `## Contributing\n\nPlease read CONTRIBUTING.md for details.\n\n` +
      `## License\n\nThis project is licensed under the MIT License.`;

    const largeContentData = {
      ...testReadmeData,
      repository_name: 'large-content-repo',
      markdown_content: largeMarkdown
    };

    // Create test README
    const insertResult = await db.insert(generatedReadmesTable)
      .values(largeContentData)
      .returning()
      .execute();

    const createdReadme = insertResult[0];
    const input: GetReadmeInput = { id: createdReadme.id };

    // Test retrieval
    const result = await getReadme(input);

    // Validate large content is preserved
    expect(result.markdown_content).toEqual(largeMarkdown);
    expect(result.markdown_content.length).toBeGreaterThan(500);
    expect(result.markdown_content).toContain('```bash');
    expect(result.markdown_content).toContain('```typescript');
    expect(result.repository_name).toEqual('large-content-repo');
  });
});