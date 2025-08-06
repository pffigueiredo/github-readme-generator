import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import type { ListReadmesResponse } from '../../../server/src/schema';

interface ReadmeListProps {
  readmes: ListReadmesResponse['readmes'];
  total: number;
  currentPage: number;
  itemsPerPage: number;
  isLoading: boolean;
  onReadmeSelect: (id: number) => void;
  onReadmeDelete: (id: number) => void;
  onPageChange: (page: number) => void;
}

export function ReadmeList({
  readmes,
  total,
  currentPage,
  itemsPerPage,
  isLoading,
  onReadmeSelect,
  onReadmeDelete,
  onPageChange
}: ReadmeListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalPages = Math.ceil(total / itemsPerPage);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onReadmeDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const extractRepoName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      return pathParts.slice(-2).join('/');
    } catch {
      return url;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (readmes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No READMEs generated yet</h3>
        <p className="text-gray-600 mb-6">
          Generate your first README by switching to the Generate tab and entering a GitHub repository URL.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* README Cards */}
      <div className="space-y-3">
        {readmes.map((readme: ListReadmesResponse['readmes'][0]) => (
          <Card key={readme.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {extractRepoName(readme.github_url)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      #{readme.id}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-1 truncate">
                    {readme.repository_name}
                  </h3>
                  
                  {readme.repository_description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {readme.repository_description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📅 {formatDate(readme.created_at)}</span>
                    <a 
                      href={readme.github_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 transition-colors"
                    >
                      🔗 View Repository
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReadmeSelect(readme.id)}
                  >
                    👁️ View
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingId === readme.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingId === readme.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                        ) : (
                          '🗑️'
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete README</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the README for "{readme.repository_name}"? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(readme.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-600">
            Showing {currentPage * itemsPerPage + 1} to{' '}
            {Math.min((currentPage + 1) * itemsPerPage, total)} of {total} READMEs
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              ← Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (currentPage < 2) {
                  pageNum = i;
                } else if (currentPage > totalPages - 3) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="w-8 h-8"
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}