import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import type { DocumentSet, Document } from "@/types";
import { apiService } from "@/services/api";
import {
  ArrowLeftIcon,
  FileTextIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
  FileIcon,
  CalendarIcon,
  FolderIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  PlusIcon,
  DownloadIcon,
} from "lucide-react";

export const DocumentSetDetailPage: React.FC = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const [documentSet, setDocumentSet] = useState<DocumentSet | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [copiedSetId, setCopiedSetId] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!setId) {
      navigate("/dashboard");
      return;
    }

    const loadDocumentSet = async (): Promise<void> => {
      try {
        const docSet = await apiService.getDocumentSet(setId);
        setDocumentSet(docSet);
      } catch (error) {
        console.error("Failed to load document set:", error);
        setDocumentSet(null);
      } finally {
        // Document set loading complete
      }
    };

    const loadDocuments = async (): Promise<void> => {
      try {
        const docs = await apiService.getDocuments(setId);
        setDocuments(docs as unknown as Document[]);
      } catch (error) {
        console.error("Failed to load documents:", error);
        setDocuments([]);
      } finally {
        // Documents loading complete
      }
    };

    loadDocumentSet();
    loadDocuments();
  }, [setId, navigate]);

  const handleDeleteDocument = async (documentId: string): Promise<void> => {
    if (!setId || !documentId) return;

    setDeletingDocId(documentId);
    try {
      await apiService.deleteDocument(setId, documentId);
      // Remove the document from local state
      setDocuments((prevDocs) =>
        prevDocs.filter((doc) => doc.id !== documentId)
      );
      // Update document count
      if (documentSet) {
        setDocumentSet((prev) =>
          prev
            ? { ...prev, documentCount: Math.max(0, prev.documentCount - 1) }
            : null
        );
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("Failed to delete document. Please try again.");
    } finally {
      setDeletingDocId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getMimeTypeIcon = (mimeType: string): string => {
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("html")) return "🌐";
    if (mimeType.includes("text")) return "📝";
    return "📄";
  };

  const handleCopySetId = async (): Promise<void> => {
    if (!setId) return;

    try {
      await navigator.clipboard.writeText(setId);
      setCopiedSetId(true);
      setTimeout(() => setCopiedSetId(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      console.error("Failed to copy set ID", err);
    }
  };

  if (!documentSet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center text-center p-8">
            <div className="rounded-full bg-muted p-4 mb-4">
              <AlertCircleIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Document set not found
            </h2>
            <p className="text-muted-foreground mb-6">
              The document set you're looking for doesn't exist or has been
              removed.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="gap-2 shrink-0"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight truncate">
                  {documentSet.name}
                </h1>
                <p className="text-muted-foreground line-clamp-2">
                  {documentSet.description || "No description provided"}
                </p>
              </div>
            </div>
            <Button className="gap-2 w-full sm:w-auto">
              <PlusIcon className="h-4 w-4" />
              Add Documents
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* MCP Integration Sidebar */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <ExternalLinkIcon className="h-5 w-5" />
                  MCP Integration
                </CardTitle>
                <CardDescription>
                  Use this document set ID in your MCP client to query these
                  documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Document Set ID
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-background border rounded-md text-sm font-mono break-all">
                      {setId}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopySetId}
                      className="gap-1 shrink-0"
                    >
                      {copiedSetId ? (
                        <CheckIcon className="h-3 w-3" />
                      ) : (
                        <CopyIcon className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Quick Start:</strong>
                    <ol className="mt-2 text-sm space-y-1 list-decimal list-inside ml-2">
                      <li>Copy the Document Set ID above</li>
                      <li>
                        Configure your MCP client to connect to this server
                      </li>
                      <li>Use MCP tools to query documents in this set</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FolderIcon className="h-4 w-4" />
                      Documents
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-lg font-semibold px-3 py-1"
                    >
                      {documents.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                      Created
                    </div>
                    <p className="text-sm font-medium">
                      {new Date(documentSet.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documents List */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileIcon className="h-5 w-5" />
                      Documents
                    </CardTitle>
                    <CardDescription>
                      Files included in this documentation set
                    </CardDescription>
                  </div>
                  {documents.length > 0 && (
                    <Badge variant="outline">
                      {documents.length}{" "}
                      {documents.length === 1 ? "file" : "files"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <FileTextIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      No documents yet
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                      Upload your first document to start building your
                      knowledge base.
                    </p>
                    <Button className="gap-2">
                      <PlusIcon className="h-4 w-4" />
                      Add Documents
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((document) => (
                      <div
                        key={document.id}
                        className="group flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <span className="text-xl">
                            {getMimeTypeIcon(document.mime)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium truncate">
                              {document.filename}
                            </h4>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <DownloadIcon className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteDocument(document.id)
                                }
                                disabled={deletingDocId === document.id}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                {deletingDocId === document.id ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border border-current border-r-transparent" />
                                ) : (
                                  <TrashIcon className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{formatFileSize(document.sizeBytes)}</span>
                            <span>•</span>
                            <span>{document.mime}</span>
                            <span>•</span>
                            <span>
                              Added{" "}
                              {new Date(
                                document.createdAt
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
