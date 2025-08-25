import React, { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadCloudIcon, UploadIcon } from "lucide-react";

/**
 * FileUploader is a reusable component providing a drag-and-drop zone and a hidden file input.
 * It supports selecting multiple files and restricting by accepted extensions.
 */
export interface FileUploaderProps {
  readonly accept?: string;
  readonly multiple?: boolean;
  readonly disabled?: boolean;
  /**
   * Callback invoked when files are selected via click or drag-n-drop.
   */
  onFilesSelected: (files: FileList | File[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept = ".pdf,.txt,.html,.htm,.md",
  multiple = true,
  disabled = false,
  onFilesSelected,
}) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(e.target.files);
        // Reset input to allow selecting the same file again
        e.currentTarget.value = "";
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected]
  );

  const triggerBrowse = useCallback((): void => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerBrowse}
      role="button"
      aria-disabled={disabled}
    >
      <div className="flex flex-col items-center gap-4">
        <div className={`rounded-full p-4 ${isDragOver ? "bg-primary/10" : "bg-muted"}`}>
          <UploadCloudIcon
            className={`h-8 w-8 ${isDragOver ? "text-primary" : "text-muted-foreground"}`}
          />
        </div>
        <div className="space-y-2">
          <h3 className="font-medium">
            {isDragOver ? "Drop files here" : "Click to upload or drag files here"}
          </h3>
          <p className="text-sm text-muted-foreground">PDF, TXT, HTML, Markdown files up to 10MB each</p>
        </div>
        <Label htmlFor="file-upload-hidden" className="cursor-pointer">
          <Button type="button" variant="outline" className="gap-2" disabled={disabled}>
            <UploadIcon className="h-4 w-4" />
            Browse Files
          </Button>
          <input
            ref={inputRef}
            id="file-upload-hidden"
            type="file"
            className="sr-only"
            multiple={multiple}
            accept={accept}
            onChange={handleFileInputChange}
            disabled={disabled}
          />
        </Label>
      </div>
    </div>
  );
};
