import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiService } from "@/services/api";
import {
  ArrowLeftIcon,
  UploadIcon,
  FileTextIcon,
  FileIcon,
  XIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  UploadCloudIcon,
} from "lucide-react";

type FileWithStatus = {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
};

export const CreateDocumentSetPage: React.FC = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileWithStatus[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const navigate = useNavigate();

  // File handling functions
  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: FileWithStatus[] = Array.from(fileList).map((file) => ({
      file,
      id: crypto.randomUUID(),
      status: "pending" as const,
      progress: 0,
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const retryFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: "pending" as const, progress: 0, error: undefined }
          : f
      )
    );
  }, []);

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter((file) => {
        const ext = file.name.split(".").pop()?.toLowerCase();
        return ["pdf", "txt", "html", "htm", "md"].includes(ext || "");
      });

      if (files.length > 0) {
        addFiles(files);
      }
    },
    [addFiles]
  );

  const getFileIcon = (filename: string): React.ReactNode => {
    const extension = filename.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <FileIcon className="h-4 w-4 text-red-500" />;
      case "txt":
      case "md":
        return <FileTextIcon className="h-4 w-4 text-blue-500" />;
      case "html":
      case "htm":
        return <FileIcon className="h-4 w-4 text-orange-500" />;
      default:
        return <FileIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setGlobalError("");

    if (!name.trim()) {
      setGlobalError("Document set name is required");
      return;
    }

    if (selectedFiles.length === 0) {
      setGlobalError("Please select at least one file");
      return;
    }

    setIsCreating(true);

    try {
      // Create the document set first
      const documentSet = await apiService.createDocumentSet({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Upload files with progress tracking
      const fileList = selectedFiles.map((f) => f.file);
      const dataTransfer = new DataTransfer();
      fileList.forEach((file) => dataTransfer.items.add(file));

      await apiService.uploadDocuments(documentSet.id, dataTransfer.files);

      // Navigate to the new document set detail page
      navigate(`/document-set/${documentSet.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create document set. Please try again.";
      setGlobalError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Create Documentation Set
              </h1>
              <p className="text-muted-foreground">
                Upload documents and create a new documentation set for your MCP
                server
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Provide basic details about your documentation set
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Set Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., API Documentation, User Guide"
                  required
                  disabled={isCreating}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this documentation set (optional)"
                  disabled={isCreating}
                  className="text-base min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloudIcon className="h-5 w-5" />
                Upload Documents
              </CardTitle>
              <CardDescription>
                Drag and drop files or click to browse. Supports PDF, TXT, HTML,
                and Markdown files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Drop Zone */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className={`rounded-full p-4 ${
                        isDragOver ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <UploadCloudIcon
                        className={`h-8 w-8 ${
                          isDragOver ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium">
                        {isDragOver
                          ? "Drop files here"
                          : "Click to upload or drag files here"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        PDF, TXT, HTML, Markdown files up to 10MB each
                      </p>
                    </div>
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        disabled={isCreating}
                      >
                        <UploadIcon className="h-4 w-4" />
                        Browse Files
                      </Button>
                      <input
                        id="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".pdf,.txt,.html,.htm,.md"
                        onChange={handleFileInputChange}
                        disabled={isCreating}
                      />
                    </Label>
                  </div>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Selected Files</h4>
                      <Badge variant="secondary">
                        {selectedFiles.length}{" "}
                        {selectedFiles.length === 1 ? "file" : "files"}
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {selectedFiles.map((fileWithStatus) => (
                        <div
                          key={fileWithStatus.id}
                          className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border"
                        >
                          <div className="flex-shrink-0">
                            {getFileIcon(fileWithStatus.file.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">
                                {fileWithStatus.file.name}
                              </p>
                              <div className="flex items-center gap-2">
                                {fileWithStatus.status === "success" && (
                                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                )}
                                {fileWithStatus.status === "error" && (
                                  <AlertCircleIcon className="h-4 w-4 text-destructive" />
                                )}
                                {fileWithStatus.status === "uploading" && (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(fileWithStatus.file.size)}
                              </p>
                              <div className="flex items-center gap-1">
                                {fileWithStatus.status === "error" &&
                                  fileWithStatus.error && (
                                    <span className="text-xs text-destructive mr-2">
                                      {fileWithStatus.error}
                                    </span>
                                  )}
                                {fileWithStatus.status === "error" && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => retryFile(fileWithStatus.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <RefreshCwIcon className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(fileWithStatus.id)}
                                  disabled={
                                    fileWithStatus.status === "uploading"
                                  }
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <XIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {fileWithStatus.status === "uploading" && (
                              <Progress
                                value={fileWithStatus.progress}
                                className="h-1 mt-2"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {globalError && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              disabled={isCreating}
              className="sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || selectedFiles.length === 0}
              className="sm:w-auto"
            >
              {isCreating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent mr-2" />
                  Creating Set...
                </>
              ) : (
                <>
                  <UploadCloudIcon className="h-4 w-4 mr-2" />
                  Create Documentation Set
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
