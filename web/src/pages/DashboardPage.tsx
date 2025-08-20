import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DocumentSet } from "@/types";
import { apiService } from "@/services/api";
import { PlusIcon, FolderIcon, CalendarIcon } from "lucide-react";

export const DashboardPage: React.FC = () => {
  const [documentSets, setDocumentSets] = useState<DocumentSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDocumentSets = async (): Promise<void> => {
      try {
        const sets = await apiService.listDocumentSets();
        setDocumentSets(sets);
      } catch (error) {
        console.error("Failed to load document sets:", error);
        setDocumentSets([]);
      } finally {
        setIsLoadingSets(false);
      }
    };

    loadDocumentSets();
  }, []);

  const handleCreateDocumentSet = (): void => {
    navigate("/create-document-set");
  };

  const handleViewDocumentSet = (setId: string): void => {
    navigate(`/document-set/${setId}`);
  };

  const DocumentSetsGrid: React.FC = () => {
    if (isLoadingSets) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (documentSets.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center text-center p-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FolderIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No documentation sets yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Get started by creating your first documentation set. Upload PDFs,
              text files, or HTML documents to build your knowledge base.
            </p>
            <Button
              onClick={handleCreateDocumentSet}
              size="lg"
              className="gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Create Your First Set
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documentSets.map((set) => (
          <Card
            key={set.id}
            className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-border/50"
            onClick={() => handleViewDocumentSet(set.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-1 text-lg group-hover:text-primary transition-colors">
                  {set.name}
                </CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  {set.documentCount} {set.documentCount === 1 ? "doc" : "docs"}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                {set.description || "No description provided"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{new Date(set.createdAt).toLocaleDateString()}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDocumentSet(set.id);
                  }}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Your Documentation Sets
          </h2>
          <p className="text-muted-foreground">
            Create and manage documentation sets for your MCP server
          </p>
        </div>
        <Button
          onClick={handleCreateDocumentSet}
          className="gap-2 w-full sm:w-auto"
        >
          <PlusIcon className="h-4 w-4" />
          Create New Set
        </Button>
      </div>

      <DocumentSetsGrid />
    </div>
  );
};
