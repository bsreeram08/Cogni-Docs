import type { DocumentSet } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface CreateDocumentSetRequest {
  name: string;
  description?: string;
}

interface CreateDocumentSetResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface ListDocumentSetsResponse {
  sets: DocumentSet[];
}

interface UploadDocumentsResponse {
  message: string;
  results: Array<{
    filename: string;
    documentId: string;
    chunksCreated: number;
  }>;
}

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
      return response.sets;
    } catch (error) {
      // Return mock data for development when API is unavailable
      console.warn("API unavailable, using mock data:", error);
      return [];
    }
  }

  async getDocumentSet(setId: string): Promise<DocumentSet> {
    return this.fetchWithErrorHandling<DocumentSet>(`/sets/${setId}`);
  }

  async getDocuments(setId: string): Promise<Document[]> {
    const response = await fetch(`${API_BASE_URL}/sets/${setId}/documents`);
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }
    const data = await response.json();
    return data as Document[];
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
  ): Promise<CreateDocumentSetResponse> {
    return this.fetchWithErrorHandling<CreateDocumentSetResponse>("/sets", {
      method: "POST",
      body: JSON.stringify(data),
    });
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
export type {
  CreateDocumentSetRequest,
  CreateDocumentSetResponse,
  UploadDocumentsResponse,
};
