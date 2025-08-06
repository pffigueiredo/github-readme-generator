import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { ReadmeGenerator } from '@/components/ReadmeGenerator';
import { ReadmeList } from '@/components/ReadmeList';
import { ReadmeViewer } from '@/components/ReadmeViewer';
import type { GenerateReadmeResponse, GeneratedReadme, ListReadmesResponse } from '../../server/src/schema';

function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [selectedReadme, setSelectedReadme] = useState<GeneratedReadme | null>(null);
  const [readmes, setReadmes] = useState<ListReadmesResponse['readmes']>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Load README list
  const loadReadmes = useCallback(async (offset: number = 0) => {
    setIsLoadingList(true);
    try {
      const result = await trpc.listReadmes.query({
        limit: itemsPerPage,
        offset: offset
      });
      setReadmes(result.readmes);
      setTotal(result.total);
      setCurrentPage(Math.floor(offset / itemsPerPage));
    } catch (error) {
      console.error('Failed to load READMEs:', error);
      setErrorMessage('Failed to load README history. Please try again.');
    } finally {
      setIsLoadingList(false);
    }
  }, [itemsPerPage]);

  // Load initial data
  useEffect(() => {
    if (activeTab === 'history') {
      loadReadmes();
    }
  }, [activeTab, loadReadmes]);

  // Handle successful README generation
  const handleReadmeGenerated = useCallback((newReadme: GenerateReadmeResponse) => {
    // Add to the list if we're on the first page
    if (currentPage === 0) {
      setReadmes((prev: ListReadmesResponse['readmes']) => [
        {
          id: newReadme.id,
          github_url: newReadme.github_url,
          repository_name: newReadme.repository_name,
          repository_description: newReadme.repository_description,
          created_at: newReadme.created_at
        },
        ...prev
      ]);
      setTotal((prev: number) => prev + 1);
    }
  }, [currentPage]);

  // Handle README selection
  const handleReadmeSelect = useCallback(async (readmeId: number) => {
    try {
      const readme = await trpc.getReadme.query({ id: readmeId });
      setSelectedReadme(readme);
    } catch (error) {
      console.error('Failed to load README details:', error);
      setErrorMessage('Failed to load README details. Please try again.');
    }
  }, []);

  // Handle README deletion
  const handleReadmeDelete = useCallback(async (readmeId: number) => {
    try {
      await trpc.deleteReadme.mutate({ id: readmeId });
      // Remove from list and close viewer if this README was selected
      setReadmes((prev: ListReadmesResponse['readmes']) => 
        prev.filter(readme => readme.id !== readmeId)
      );
      setTotal((prev: number) => prev - 1);
      
      if (selectedReadme?.id === readmeId) {
        setSelectedReadme(null);
      }
    } catch (error) {
      console.error('Failed to delete README:', error);
      setErrorMessage('Failed to delete README. Please try again.');
    }
  }, [selectedReadme]);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    const newOffset = newPage * itemsPerPage;
    loadReadmes(newOffset);
  }, [itemsPerPage, loadReadmes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📚 README Generator
          </h1>
          <p className="text-xl text-gray-600">
            Generate beautiful README files from GitHub repositories
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-md">
            <Button
              variant={activeTab === 'generate' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('generate')}
              className="mr-1"
            >
              🚀 Generate
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('history')}
            >
              📖 History
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'generate' && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🔗 Generate README
                  </CardTitle>
                  <CardDescription>
                    Enter a GitHub repository URL to generate a comprehensive README file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReadmeGenerator onReadmeGenerated={handleReadmeGenerated} />
                </CardContent>
              </Card>
            )}

            {activeTab === 'history' && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📚 Generated READMEs
                  </CardTitle>
                  <CardDescription>
                    View and manage your previously generated README files
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReadmeList
                    readmes={readmes}
                    total={total}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                    isLoading={isLoadingList}
                    onReadmeSelect={handleReadmeSelect}
                    onReadmeDelete={handleReadmeDelete}
                    onPageChange={handlePageChange}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* README Viewer Sidebar */}
          {selectedReadme && (
            <div className="w-1/2">
              <Card className="shadow-lg sticky top-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">📄 README Preview</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedReadme(null)}
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedReadme.repository_name}</Badge>
                    {selectedReadme.repository_description && (
                      <span className="text-sm text-gray-600 truncate">
                        {selectedReadme.repository_description}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="p-0">
                  <ReadmeViewer readme={selectedReadme} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Error Dialog */}
        <AlertDialog open={!!errorMessage} onOpenChange={() => setErrorMessage(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Error</AlertDialogTitle>
              <AlertDialogDescription>
                {errorMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setErrorMessage(null)}>
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default App;