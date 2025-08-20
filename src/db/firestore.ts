/**
 * Firestore database operations with vector search
 */

import { Firestore, FieldValue } from "@google-cloud/firestore";
import { getGoogleCloudServices } from "../services/google-cloud.js";
import type {
  UUID,
  DocumentSet,
  DocumentMeta,
  Chunk,
  EmbeddingRecord,
} from "../types.js";

export interface DatabaseService {
  readonly createDocumentSet: (input: {
    name: string;
    description?: string;
  }) => Promise<{ id: UUID }>;
  readonly getDocumentSet: (id: UUID) => Promise<DocumentSet | null>;
  readonly listDocumentSets: () => Promise<DocumentSet[]>;
  readonly addDocument: (doc: DocumentMeta) => Promise<void>;
  readonly getDocumentsBySetId: (setId: UUID) => Promise<DocumentMeta[]>;
  readonly deleteDocument: (documentId: UUID) => Promise<void>;
  readonly addChunks: (chunks: Chunk[]) => Promise<void>;
  readonly addEmbeddings: (embeddings: EmbeddingRecord[]) => Promise<void>;
  readonly searchSimilar: (
    setId: UUID,
    queryEmbedding: number[],
    limit: number
  ) => Promise<Array<{ chunk: Chunk; score: number }>>;
}

const createDatabaseService = (firestore: Firestore): DatabaseService => {
  const COLLECTIONS = {
    documentSets: "documentSets",
    documents: "documents",
    chunks: "chunks",
    embeddings: "embeddings",
  } as const;

  const createDocumentSet = async (input: {
    name: string;
    description?: string;
  }): Promise<{ id: UUID }> => {
    const docSet: DocumentSet = {
      id: globalThis.crypto.randomUUID(),
      name: input.name,
      description: input.description || "",
      createdAt: new Date().toISOString(),
    };

    await firestore
      .collection(COLLECTIONS.documentSets)
      .doc(docSet.id)
      .set(docSet);
    return { id: docSet.id };
  };

  const getDocumentSet = async (id: UUID): Promise<DocumentSet | null> => {
    const doc = await firestore
      .collection(COLLECTIONS.documentSets)
      .doc(id)
      .get();
    return doc.exists ? (doc.data() as DocumentSet) : null;
  };

  const listDocumentSets = async (): Promise<DocumentSet[]> => {
    const snapshot = await firestore.collection(COLLECTIONS.documentSets).get();
    return snapshot.docs.map((doc) => doc.data() as DocumentSet);
  };

  const addDocument = async (doc: DocumentMeta): Promise<void> => {
    await firestore.collection(COLLECTIONS.documents).doc(doc.id).set(doc);
  };

  const getDocumentsBySetId = async (setId: UUID): Promise<DocumentMeta[]> => {
    const snapshot = await firestore
      .collection(COLLECTIONS.documents)
      .where("setId", "==", setId)
      .get();
    return snapshot.docs.map((doc) => doc.data() as DocumentMeta);
  };

  const deleteDocument = async (documentId: UUID): Promise<void> => {
    const batch = firestore.batch();

    // Delete the document
    const documentRef = firestore.collection(COLLECTIONS.documents).doc(documentId);
    batch.delete(documentRef);

    // Delete all chunks for this document
    const chunksSnapshot = await firestore
      .collection(COLLECTIONS.chunks)
      .where("documentId", "==", documentId)
      .get();

    const chunkIds: string[] = [];
    chunksSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      chunkIds.push(doc.id);
    });

    // Delete all embeddings for these chunks
    for (const chunkId of chunkIds) {
      const embeddingRef = firestore.collection(COLLECTIONS.embeddings).doc(chunkId);
      batch.delete(embeddingRef);
    }

    await batch.commit();
  };

  const addChunks = async (chunks: Chunk[]): Promise<void> => {
    const batch = firestore.batch();
    for (const chunk of chunks) {
      const ref = firestore.collection(COLLECTIONS.chunks).doc(chunk.id);
      batch.set(ref, chunk);
    }
    await batch.commit();
  };

  const addEmbeddings = async (
    embeddings: EmbeddingRecord[]
  ): Promise<void> => {
    const batch = firestore.batch();
    for (const embedding of embeddings) {
      const ref = firestore
        .collection(COLLECTIONS.embeddings)
        .doc(embedding.chunkId);

      // Convert vector array to Firestore Vector format as per Firebase docs
      const firestoreData = {
        chunkId: embedding.chunkId,
        setId: embedding.setId,
        dimension: embedding.dimension,
        vector: FieldValue.vector([...embedding.vector]), // Use FieldValue.vector() format
      };

      batch.set(ref, firestoreData);
    }
    await batch.commit();
  };

  const searchSimilar = async (
    setId: UUID,
    queryEmbedding: number[],
    limit: number
  ): Promise<Array<{ chunk: Chunk; score: number }>> => {
    try {
      // Perform vector search to find similar embeddings
      const vectorQuery = firestore
        .collection(COLLECTIONS.embeddings)
        .findNearest({
          vectorField: "vector",
          queryVector: queryEmbedding,
          limit: limit * 2, // Get more results to filter by setId
          distanceMeasure: "COSINE",
        });

      const vectorSnapshot = await vectorQuery.get();

      if (vectorSnapshot.empty) {
        return [];
      }

      const results: Array<{ chunk: Chunk; score: number }> = [];

      // For each matching embedding, get the corresponding chunk
      for (const doc of vectorSnapshot.docs) {
        const embeddingData = doc.data() as EmbeddingRecord;

        // Get the chunk document
        const chunkDoc = await firestore
          .collection(COLLECTIONS.chunks)
          .doc(embeddingData.chunkId)
          .get();

        if (chunkDoc.exists) {
          const chunkData = chunkDoc.data() as Chunk;

          // Only include chunks from the specified document set
          if (chunkData.setId === setId) {
            // Calculate similarity score (1 - cosine distance)
            const distance = doc.get("_distance") || 0;
            const score = Math.max(0, 1 - distance);

            results.push({
              chunk: chunkData,
              score: score,
            });

            // Stop once we have enough results
            if (results.length >= limit) {
              break;
            }
          }
        }
      }

      // Sort by score (highest first) and return
      return results.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error("Error performing vector search:", error);
      return [];
    }
  };

  return {
    createDocumentSet,
    getDocumentSet,
    listDocumentSets,
    addDocument,
    getDocumentsBySetId,
    deleteDocument,
    addChunks,
    addEmbeddings,
    searchSimilar,
  };
};

let databaseService: DatabaseService | null = null;

export const getDatabaseService = (): DatabaseService => {
  if (!databaseService) {
    const { firestore } = getGoogleCloudServices();
    databaseService = createDatabaseService(firestore);
  }
  return databaseService;
};
