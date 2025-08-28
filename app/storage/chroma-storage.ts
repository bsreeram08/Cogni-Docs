/**
 * ChromaDB storage implementation
 */

import { ChromaClient, type ChromaClientArgs, type Collection } from "chromadb";
import type {
  StorageService,
  DocumentSet,
  DocumentMetadata,
  SearchResult,
  ListedDocument,
} from "./storage-interface.js";

type ChromaOptions = ChromaClientArgs;

export class ChromaStorage implements StorageService {
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map();

  constructor(options: ChromaOptions) {
    this.client = new ChromaClient(options);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch {
      return false;
    }
  }

  async createDocumentSet(name: string, description?: string): Promise<DocumentSet> {
    try {
      const collection = await this.client.createCollection({
        name: name,
        metadata: {
          description: description || "",
          created_at: new Date().toISOString(),
        },
      });

      this.collections.set(name, collection);

      return {
        id: name,
        name,
        description: description || "",
        created_at: new Date(),
        document_count: 0,
      };
    } catch (error) {
      throw new Error(`Failed to create document set: ${error.message}`);
    }
  }

  async getDocumentSet(setId: string): Promise<DocumentSet | null> {
    try {
      const collection = await this.client.getCollection({ name: setId });
      if (!collection) return null;

      const count = await collection.count();

      return {
        id: setId,
        name: setId,
        description: (collection.metadata?.description as string) || "",
        created_at: new Date((collection.metadata?.created_at as string) || Date.now()),
        document_count: count,
      };
    } catch {
      return null;
    }
  }

  async listDocumentSets(): Promise<DocumentSet[]> {
    try {
      const collections = await this.client.listCollections();

      return Promise.all(
        collections.map(async (col) => {
          const count = await col.count();
          return {
            id: col.name,
            name: col.name,
            description: (col.metadata?.description as string) || "",
            created_at: new Date((col.metadata?.created_at as string) || Date.now()),
            document_count: count,
          };
        }),
      );
    } catch (error) {
      throw new Error(`Failed to list document sets: ${error.message}`);
    }
  }

  async listDocuments(setId: string): Promise<ListedDocument[]> {
    try {
      let collection = this.collections.get(setId);
      if (!collection) {
        collection = await this.client.getCollection({ name: setId });
        this.collections.set(setId, collection);
      }

      const total = await collection.count();
      if (total === 0) return [];

      const pageSize = 500;
      const docsById = new Map<string, ListedDocument>();
      for (let offset = 0; offset < total; offset += pageSize) {
        // Fetch only metadatas to minimize payload
        const batch = await collection.get({
          limit: pageSize,
          offset,
          include: ["metadatas"],
        });

        const metadatas: ReadonlyArray<Record<string, unknown>> =
          (batch?.metadatas as ReadonlyArray<Record<string, unknown>>) || [];

        for (const md of metadatas) {
          const docId = String(md.document_id ?? "");
          if (!docId || docsById.has(docId)) continue;

          const item: ListedDocument = {
            id: docId,
            source_file: String(md.source_file ?? "unknown"),
            mime_type: String(md.mime_type ?? "text/plain"),
            size_bytes: Number(md.size_bytes ?? 0),
            created_at: String(md.created_at ?? new Date().toISOString()),
          };
          docsById.set(docId, item);
        }
      }

      return Array.from(docsById.values());
    } catch (error) {
      throw new Error(`Failed to list documents: ${error.message}`);
    }
  }

  async addDocuments(
    setId: string,
    documents: Array<{
      id: string;
      content: string;
      embedding: number[];
      metadata: DocumentMetadata;
    }>,
  ): Promise<void> {
    try {
      let collection = this.collections.get(setId);

      if (!collection) {
        collection = await this.client.getCollection({ name: setId });
        this.collections.set(setId, collection);
      }

      // ChromaDB expects the documents to be added in batches
      const batchSize = 100;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        await collection.add({
          ids: batch.map((doc) => doc.id),
          embeddings: batch.map((doc) => doc.embedding),
          documents: batch.map((doc) => doc.content),
          metadatas: batch.map((doc) => ({
            ...doc.metadata,
            // Ensure all metadata values are compatible with ChromaDB
            source_file: doc.metadata.source_file || "",
            document_type: doc.metadata.document_type || "unknown",
            category: doc.metadata.category || "",
            keywords: Array.isArray(doc.metadata.keywords)
              ? doc.metadata.keywords.join(",")
              : String(doc.metadata.keywords || ""),
            chunk_index: Number(doc.metadata.chunk_index) || 0,
            page_number: doc.metadata.page_number ? Number(doc.metadata.page_number) : undefined,
            // Agentic annotation fields (store arrays as CSV strings)
            section_heading: doc.metadata.section_heading || undefined,
            topic_tags: Array.isArray(doc.metadata.topic_tags)
              ? doc.metadata.topic_tags.join(",")
              : doc.metadata.topic_tags
                ? String(doc.metadata.topic_tags)
                : undefined,
            code_languages: Array.isArray(doc.metadata.code_languages)
              ? doc.metadata.code_languages.join(",")
              : doc.metadata.code_languages
                ? String(doc.metadata.code_languages)
                : undefined,
            entities: Array.isArray(doc.metadata.entities)
              ? doc.metadata.entities.join(",")
              : doc.metadata.entities
                ? String(doc.metadata.entities)
                : undefined,
            summary: doc.metadata.summary || undefined,
            quality_score:
              typeof doc.metadata.quality_score === "number"
                ? Number(doc.metadata.quality_score)
                : undefined,
          })),
        });
      }
    } catch (error) {
      throw new Error(`Failed to add documents: ${error.message}`);
    }
  }

  async searchDocuments(
    setId: string,
    queryEmbedding: number[],
    limit: number = 10,
    filters?: Record<string, any>,
  ): Promise<SearchResult[]> {
    try {
      let collection = this.collections.get(setId);

      if (!collection) {
        collection = await this.client.getCollection({ name: setId });
        this.collections.set(setId, collection);
      }

      // Convert filters to ChromaDB where clause format
      let whereClause: any = {};
      if (filters) {
        // Handle array filters like document_type: ["gicc", "qa"]
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            whereClause[key] = { $in: value };
          } else {
            whereClause[key] = { $eq: value };
          }
        });
      }

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        include: ["documents", "metadatas", "distances"],
      });

      return (
        results.ids[0]?.map((id, index) => {
          const metadata = (results.metadatas?.[0]?.[index] as any) || {};

          // Reconstruct keywords array from comma-separated string
          if (typeof metadata.keywords === "string" && metadata.keywords) {
            metadata.keywords = metadata.keywords
              .split(",")
              .map((k: string) => k.trim())
              .filter((k: string) => k);
          }

          // Reconstruct agentic arrays
          if (typeof metadata.topic_tags === "string" && metadata.topic_tags) {
            metadata.topic_tags = metadata.topic_tags
              .split(",")
              .map((k: string) => k.trim())
              .filter((k: string) => k);
          }
          if (typeof metadata.code_languages === "string" && metadata.code_languages) {
            metadata.code_languages = metadata.code_languages
              .split(",")
              .map((k: string) => k.trim())
              .filter((k: string) => k);
          }
          if (typeof metadata.entities === "string" && metadata.entities) {
            metadata.entities = metadata.entities
              .split(",")
              .map((k: string) => k.trim())
              .filter((k: string) => k);
          }

          return {
            id: id as string,
            content: (results.documents?.[0]?.[index] as string) || "",
            metadata: metadata as DocumentMetadata,
            similarity: 1 - (results.distances?.[0]?.[index] || 0), // Convert distance to similarity
          };
        }) || []
      );
    } catch (error) {
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  async deleteDocument(setId: string, documentId: string): Promise<void> {
    try {
      let collection = this.collections.get(setId);

      if (!collection) {
        collection = await this.client.getCollection({ name: setId });
        this.collections.set(setId, collection);
      }

      await collection.delete({ ids: [documentId] });
    } catch (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  async deleteDocumentSet(setId: string): Promise<void> {
    try {
      await this.client.deleteCollection({ name: setId });
      this.collections.delete(setId);
    } catch (error) {
      throw new Error(`Failed to delete document set: ${error.message}`);
    }
  }

  async cleanup(): Promise<void> {
    // Chroma client does not require explicit cleanup in the JS SDK
  }
}
