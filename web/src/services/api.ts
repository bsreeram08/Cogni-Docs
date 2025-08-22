import type { DocumentSet, Document } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface CreateDocumentSetRequest {
  name: string;
  description?: string;
}

// Server payload types (snake_case)
interface ServerDocumentSet {
  id: string;
  name: string;
  description: string;
  created_at: unknown;
  document_count: number;
}

interface ListDocumentSetsResponse {
  sets: ServerDocumentSet[];
}

interface UploadDocumentsResponse {
  message: string;
  results: Array<{
    filename: string;
    documentId: string;
    chunksCreated: number;
  }>;
}

const toIsoString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value === "object" && value !== null) {
    // Attempt to parse date-like objects
    const d = new Date(
      String((value as { toString?: () => string }).toString?.() ?? "")
    );
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
};

const mapServerSetToClient = (s: ServerDocumentSet): DocumentSet => ({
  id: s.id,
  name: s.name,
  description: s.description || "",
  createdAt: toIsoString(s.created_at),
  userId: "", // not provided by backend
  documentCount: s.document_count ?? 0,
});

class ApiService {
  private async fetchWithErrorHandling<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.fetchWithErrorHandling("/health");
  }

  async listDocumentSets(): Promise<DocumentSet[]> {
    try {
      const response =
        await this.fetchWithErrorHandling<ListDocumentSetsResponse>("/sets");
      return response.sets.map(mapServerSetToClient);
    } catch (error) {
      // Return mock data for development when API is unavailable
      console.warn("API unavailable, using mock data:", error);
      return [];
    }
  }

  async getDocumentSet(setId: string): Promise<DocumentSet> {
    const payload = await this.fetchWithErrorHandling<
      ServerDocumentSet | { error: string }
    >(`/sets/${setId}`);
    if ("error" in payload) throw new Error(payload.error);
    return mapServerSetToClient(payload);
  }

  async getDocuments(setId: string): Promise<Document[]> {
    const response = await fetch(`${API_BASE_URL}/sets/${setId}/documents`);
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }
    type ServerDocumentItem = {
      readonly id?: string;
      readonly filename?: string;
      readonly source_file?: string;
      readonly mime?: string;
      readonly mime_type?: string;
      readonly sizeBytes?: number;
      readonly size_bytes?: number;
      readonly createdAt?: string | number | Date;
      readonly created_at?: string | number | Date;
    };
    type ServerDocumentsResponse = {
      readonly documents?: ServerDocumentItem[];
    };
    const data: unknown = await response.json();
    const hasDocuments = (x: unknown): x is ServerDocumentsResponse => {
      return (
        typeof x === "object" &&
        x !== null &&
        Array.isArray((x as { documents?: unknown }).documents)
      );
    };
    if (hasDocuments(data)) {
      const docs: ServerDocumentItem[] = data.documents ?? [];
      return docs.map((d) => ({
        id: String(d.id ?? ""),
        setId,
        filename: String(d.filename ?? d.source_file ?? "unknown"),
        mime: String(d.mime ?? d.mime_type ?? "text/plain"),
        sizeBytes: Number(d.sizeBytes ?? d.size_bytes ?? 0),
        createdAt: toIsoString(d.createdAt ?? d.created_at ?? Date.now()),
      }));
    }
    return [];
  }

  async deleteDocument(setId: string, documentId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/sets/${setId}/documents/${documentId}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }
  }

  async createDocumentSet(
    data: CreateDocumentSetRequest
  ): Promise<DocumentSet> {
    const payload = await this.fetchWithErrorHandling<ServerDocumentSet>(
      "/sets",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return mapServerSetToClient(payload);
  }

  async uploadDocuments(
    setId: string,
    files: FileList
  ): Promise<UploadDocumentsResponse> {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/sets/${setId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }
}

export const apiService = new ApiService();
export type { UploadDocumentsResponse };
