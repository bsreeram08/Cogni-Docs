/**
 * Firestore storage implementation
 */

import { Firestore, FieldValue } from "@google-cloud/firestore";
import type {
  StorageService,
  DocumentSet,
  DocumentMetadata,
  SearchResult,
} from "./storage-interface.js";

export const createFirestoreStorage = (
  firestore: Firestore
): StorageService => {
  const COLLECTIONS = {
    documentSets: "documentSets",
    chunks: "chunks",
    embeddings: "embeddings",
  } as const;
  const createDocumentSet = async (
    name: string,
    description?: string
  ): Promise<DocumentSet> => {
    const id = globalThis.crypto.randomUUID();
    const docSet: DocumentSet = {
      id,
      name,
      description: description || "",
      created_at: new Date(),
      document_count: 0,
    };
    await firestore.collection(COLLECTIONS.documentSets).doc(id).set({
      ...docSet,
      created_at: docSet.created_at.toISOString(),
    });
    return docSet;
  };

  const getDocumentSet = async (setId: string): Promise<DocumentSet | null> => {
    const snap = await firestore
      .collection(COLLECTIONS.documentSets)
      .doc(setId)
      .get();
    if (!snap.exists) return null;
    const data = snap.data() as any;
    const countSnap = await firestore
      .collection(COLLECTIONS.chunks)
      .where("setId", "==", setId)
      .get();
    return {
      id: setId,
      name: data.name as string,
      description: (data.description as string) || "",
      created_at: new Date(data.created_at ?? Date.now()),
      document_count: countSnap.size,
    };
  };

  const listDocumentSets = async (): Promise<DocumentSet[]> => {
    const snapshot = await firestore.collection(COLLECTIONS.documentSets).get();
    const sets: DocumentSet[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data() as any;
      const countSnap = await firestore
        .collection(COLLECTIONS.chunks)
        .where("setId", "==", doc.id)
        .get();
      sets.push({
        id: doc.id,
        name: data.name as string,
        description: (data.description as string) || "",
        created_at: new Date(data.created_at ?? Date.now()),
        document_count: countSnap.size,
      });
    }
    return sets;
  };

  const addDocuments: StorageService["addDocuments"] = async (
    setId,
    documents
  ) => {
    const batch = firestore.batch();
    for (const doc of documents) {
      const chunkRef = firestore.collection(COLLECTIONS.chunks).doc(doc.id);
      batch.set(chunkRef, {
        id: doc.id,
        setId,
        content: doc.content,
        metadata: doc.metadata,
      });

      const embeddingRef = firestore
        .collection(COLLECTIONS.embeddings)
        .doc(doc.id);
      batch.set(embeddingRef, {
        chunkId: doc.id,
        setId,
        dimension: doc.embedding.length,
        vector: FieldValue.vector([...doc.embedding]),
      });
    }
    await batch.commit();
  };

  const matchesFilters = (meta: any, filters?: Record<string, any>): boolean => {
    if (!filters) return true;
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        if (!value.includes(meta?.[key])) return false;
      } else {
        if (meta?.[key] !== value) return false;
      }
    }
    return true;
  };

  const searchDocuments = async (
    setId: string,
    queryEmbedding: number[],
    limit: number = 10,
    filters?: Record<string, any>
  ): Promise<SearchResult[]> => {
    try {
      const vectorQuery = firestore
        .collection(COLLECTIONS.embeddings)
        .findNearest({
          vectorField: "vector",
          queryVector: queryEmbedding,
          limit: Math.max(limit * 2, limit),
          distanceMeasure: "COSINE",
        });

      const vectorSnapshot = await vectorQuery.get();
      if (vectorSnapshot.empty) return [];

      const results: SearchResult[] = [];
      for (const doc of vectorSnapshot.docs) {
        const embeddingData = doc.data() as any;
        if (embeddingData.setId !== setId) continue;
        const chunkDoc = await firestore
          .collection(COLLECTIONS.chunks)
          .doc(embeddingData.chunkId)
          .get();
        if (!chunkDoc.exists) continue;
        const chunkData = chunkDoc.data() as any;
        if (!matchesFilters(chunkData.metadata, filters)) continue;
        const distance = (doc as any).get("_distance") || 0;
        const similarity = Math.max(0, 1 - distance);
        results.push({
          id: chunkData.id ?? embeddingData.chunkId,
          content: chunkData.content as string,
          metadata: chunkData.metadata as DocumentMetadata,
          similarity,
        });
        if (results.length >= limit) break;
      }
      return results;
    } catch (error) {
      console.error("Error performing vector search:", error);
      return [];
    }
  };

  const deleteDocument = async (
    _setId: string,
    documentId: string
  ): Promise<void> => {
    const batch = firestore.batch();
    const chunkRef = firestore.collection(COLLECTIONS.chunks).doc(documentId);
    const embeddingRef = firestore
      .collection(COLLECTIONS.embeddings)
      .doc(documentId);
    batch.delete(chunkRef);
    batch.delete(embeddingRef);
    await batch.commit();
  };

  const deleteDocumentSet = async (setId: string): Promise<void> => {
    // Delete chunks and embeddings for the set
    const chunkSnap = await firestore
      .collection(COLLECTIONS.chunks)
      .where("setId", "==", setId)
      .get();
    const batch = firestore.batch();
    for (const doc of chunkSnap.docs) {
      batch.delete(doc.ref);
      const embeddingRef = firestore.collection(COLLECTIONS.embeddings).doc(doc.id);
      batch.delete(embeddingRef);
    }
    batch.delete(firestore.collection(COLLECTIONS.documentSets).doc(setId));
    await batch.commit();
  };

  const cleanup = async (): Promise<void> => {
    // Firestore doesn't require explicit cleanup
  };

  const healthCheck = async (): Promise<boolean> => {
    try {
      await firestore.collection(COLLECTIONS.documentSets).limit(1).get();
      return true;
    } catch (error) {
      console.error("Firestore health check failed:", error);
      return false;
    }
  };

  return {
    createDocumentSet,
    getDocumentSet,
    listDocumentSets,
    addDocuments,
    searchDocuments,
    deleteDocument,
    deleteDocumentSet,
    healthCheck,
    cleanup,
  };
};
