import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import type { GenerateReadmeResponse } from '../../../server/src/schema';

interface ReadmeGeneratorProps {
  onReadmeGenerated: (readme: GenerateReadmeResponse) => void;
}

export function ReadmeGenerator({ onReadmeGenerated }: ReadmeGeneratorProps) {
  const [githubUrl, setGithubUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const isValidGithubUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === 'github.com' && 
             parsedUrl.pathname.split('/').filter(Boolean).length >= 2;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!githubUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    if (!isValidGithubUrl(githubUrl.trim())) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)');
      return;
    }

    setIsGenerating(true);
    setProgress(10);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev: number) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const result = await trpc.generateReadme.mutate({
        github_url: githubUrl.trim()
      });

      clearInterval(progressInterval);
      setProgress(100);

      // Call the callback to update parent component
      onReadmeGenerated(result);

      // Reset form
      setGithubUrl('');
      setProgress(0);
      
      // Show success message briefly
      setTimeout(() => {
        setProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Failed to generate README:', error);
      
      let errorMessage = 'Failed to generate README. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = 'Repository not found. Please check the URL and make sure the repository is public.';
        } else if (error.message.includes('403')) {
          errorMessage = 'Access denied. The repository might be private or rate limits exceeded.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }
      
      setError(errorMessage);
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGithubUrl(e.target.value);
    if (error) {
      setError(null); // Clear error when user starts typing
    }
  };

  const exampleUrls = [
    'https://github.com/facebook/react',
    'https://github.com/microsoft/typescript',
    'https://github.com/vercel/next.js'
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="github-url" className="text-sm font-medium">
            GitHub Repository URL
          </Label>
          <Input
            id="github-url"
            type="url"
            placeholder="https://github.com/owner/repository-name"
            value={githubUrl}
            onChange={handleUrlChange}
            disabled={isGenerating}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Enter the complete URL of a public GitHub repository
          </p>
        </div>

        {/* Progress bar */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-600 text-center">
              {progress < 30 && "Fetching repository information..."}
              {progress >= 30 && progress < 60 && "Analyzing file structure..."}
              {progress >= 60 && progress < 90 && "Generating README content..."}
              {progress >= 90 && "Finalizing..."}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success message */}
        {progress === 100 && !isGenerating && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              ✅ README generated successfully! Check the History tab to view all your generated READMEs.
            </AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          disabled={isGenerating || !githubUrl.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating README...
            </>
          ) : (
            <>
              🚀 Generate README
            </>
          )}
        </Button>
      </form>

      {/* Example URLs */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">
          Try these popular repositories:
        </Label>
        <div className="flex flex-wrap gap-2">
          {exampleUrls.map((url: string) => (
            <Button
              key={url}
              variant="outline"
              size="sm"
              onClick={() => {
                setGithubUrl(url);
                setError(null);
              }}
              disabled={isGenerating}
              className="text-xs"
            >
              {url.split('/').slice(-2).join('/')}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}