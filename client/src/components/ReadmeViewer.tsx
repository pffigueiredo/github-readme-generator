import { useState } from 'react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { GeneratedReadme, FileTreeNode } from '../../../server/src/schema';

interface ReadmeViewerProps {
  readme: GeneratedReadme;
}

export function ReadmeViewer({ readme }: ReadmeViewerProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success'>('idle');

  // Parse file structure from JSON string
  const fileStructure: FileTreeNode[] = (() => {
    try {
      return JSON.parse(readme.file_structure);
    } catch {
      return [];
    }
  })();

  const handleDownload = () => {
    setDownloadStatus('downloading');
    
    try {
      const blob = new Blob([readme.markdown_content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `${readme.repository_name}-README.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus('idle');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(readme.markdown_content);
      // Could add a toast notification here
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  // Simple markdown to HTML converter for basic preview
  const markdownToHtml = (markdown: string): string => {
    return markdown
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.slice(3, -3);
        return `<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto my-2"><code>${code}</code></pre>`;
      })
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
      // Lists
      .replace(/^\- (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4">$1. $2</li>')
      // Line breaks
      .replace(/\n/g, '<br>');
  };

  // Render file tree
  const renderFileTree = (nodes: FileTreeNode[], depth = 0): ReactElement[] => {
    return nodes.map((node: FileTreeNode, index: number) => (
      <div key={`${node.path}-${index}`} className="text-sm">
        <div className="flex items-center py-1" style={{ paddingLeft: `${depth * 16}px` }}>
          <span className="mr-2">
            {node.type === 'directory' ? '📁' : '📄'}
          </span>
          <span className={node.type === 'directory' ? 'font-medium' : ''}>
            {node.name}
          </span>
        </div>
        {node.children && renderFileTree(node.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="h-[600px] flex flex-col">
      {/* Header with download actions */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Generated</Badge>
            <span className="text-xs text-gray-500">
              {formatDate(readme.created_at)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
            >
              📋 Copy
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={downloadStatus === 'downloading'}
            >
              {downloadStatus === 'downloading' && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
              )}
              💾 Download
            </Button>
          </div>
        </div>
        
        {downloadStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800 text-sm">
              ✅ README.md downloaded successfully!
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">👁️ Preview</TabsTrigger>
            <TabsTrigger value="markdown">📝 Markdown</TabsTrigger>
            <TabsTrigger value="structure">🌳 Structure</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0">
          <TabsContent value="preview" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: markdownToHtml(readme.markdown_content) 
                  }}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="markdown" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded">
                  {readme.markdown_content}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="structure" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {fileStructure.length > 0 ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Repository file and folder structure:
                    </p>
                    <div className="bg-gray-50 p-3 rounded">
                      {renderFileTree(fileStructure)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📁</div>
                    <p className="text-gray-600">
                      No file structure information available
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}