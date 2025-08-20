/**
 * SQLite database layer using Bun's built-in driver.
 */

import { Database } from "bun:sqlite";
import ids from "../utils/ids.ts";
import type {
  Chunk,
  DocumentMeta,
  DocumentSet,
  EmbeddingRecord,
  UUID,
} from "../types.ts";

export interface Db {
  readonly init: () => void;
  readonly insertSet: (name: string, description: string) => DocumentSet;
  readonly getSet: (id: UUID) => DocumentSet | null;
  readonly insertDocument: (
    setId: UUID,
    filename: string,
    mime: string,
    sizeBytes: number
  ) => DocumentMeta;
  readonly insertChunks: (chunks: readonly Chunk[]) => void;
  readonly insertEmbeddings: (records: readonly EmbeddingRecord[]) => void;
  readonly listDocumentsBySet: (setId: UUID) => readonly DocumentMeta[];
  readonly listEmbeddingsBySet: (setId: UUID) => readonly EmbeddingRecord[];
}

const createDb = (dbPath: string): Db => {
  const db = new Database(dbPath);

  const init = (): void => {
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS document_sets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        set_id TEXT NOT NULL REFERENCES document_sets(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        mime TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        set_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY(set_id) REFERENCES document_sets(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS embeddings (
        chunk_id TEXT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
        set_id TEXT NOT NULL,
        dimension INTEGER NOT NULL,
        vector TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_documents_set ON documents(set_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_set ON chunks(set_id);
      CREATE INDEX IF NOT EXISTS idx_embeddings_set ON embeddings(set_id);
    `);
  };

  const insertSet = (name: string, description: string): DocumentSet => {
    const id = ids.newId();
    const createdAt = new Date().toISOString();
    db.query(
      `INSERT INTO document_sets(id, name, description, created_at) VALUES(?,?,?,?)`
    ).run(id, name, description, createdAt);
    return { id, name, description, createdAt };
  };

  const getSet = (id: UUID): DocumentSet | null => {
    const row = db
      .query<{
        id: string;
        name: string;
        description: string;
        created_at: string;
      }>(
        `SELECT id, name, description, created_at FROM document_sets WHERE id = ?`
      )
      .get(id);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
    };
  };

  const insertDocument = (
    setId: UUID,
    filename: string,
    mime: string,
    sizeBytes: number
  ): DocumentMeta => {
    const id = ids.newId();
    const createdAt = new Date().toISOString();
    db.query(
      `INSERT INTO documents(id, set_id, filename, mime, size_bytes, created_at) VALUES(?,?,?,?,?,?)`
    ).run(id, setId, filename, mime, sizeBytes, createdAt);
    return { id, setId, filename, mime, sizeBytes, createdAt };
  };

  const insertChunks = (chunks: readonly Chunk[]): void => {
    const stmt = db.query(
      `INSERT INTO chunks(id, set_id, document_id, ordinal, text) VALUES(?,?,?,?,?)`
    );
    db.transaction((list: readonly Chunk[]) => {
      for (const c of list) {
        stmt.run(c.id, c.setId, c.documentId, c.ordinal, c.text);
      }
    })(chunks);
  };

  const insertEmbeddings = (records: readonly EmbeddingRecord[]): void => {
    const stmt = db.query(
      `INSERT INTO embeddings(chunk_id, set_id, dimension, vector) VALUES(?,?,?,?)`
    );
    db.transaction((list: readonly EmbeddingRecord[]) => {
      for (const r of list) {
        stmt.run(r.chunkId, r.setId, r.dimension, JSON.stringify(r.vector));
      }
    })(records);
  };

  const listDocumentsBySet = (setId: UUID): readonly DocumentMeta[] => {
    const rows = db
      .query<{
        id: string;
        set_id: string;
        filename: string;
        mime: string;
        size_bytes: number;
        created_at: string;
      }>(`SELECT * FROM documents WHERE set_id = ? ORDER BY created_at ASC`)
      .all(setId);
    return rows.map((r) => ({
      id: r.id,
      setId: r.set_id,
      filename: r.filename,
      mime: r.mime,
      sizeBytes: r.size_bytes,
      createdAt: r.created_at,
    }));
  };

  const listEmbeddingsBySet = (setId: UUID): readonly EmbeddingRecord[] => {
    const rows = db
      .query<{
        chunk_id: string;
        set_id: string;
        dimension: number;
        vector: string;
      }>(
        `SELECT chunk_id, set_id, dimension, vector FROM embeddings WHERE set_id = ?`
      )
      .all(setId);
    return rows.map((r) => ({
      chunkId: r.chunk_id,
      setId: r.set_id,
      dimension: r.dimension,
      vector: JSON.parse(r.vector) as number[],
    }));
  };

  return {
    init,
    insertSet,
    getSet,
    insertDocument,
    insertChunks,
    insertEmbeddings,
    listDocumentsBySet,
    listEmbeddingsBySet,
  };
};

export default createDb;
