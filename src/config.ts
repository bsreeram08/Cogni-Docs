/**
 * Configuration for Documentation MCP server.
 */

export interface AppConfig {
  readonly httpPort: number;
  readonly dbPath: string;
  readonly chunkSize: number;
  readonly chunkOverlap: number;
  readonly embeddingModel: string;
  readonly openaiApiKey?: string;
}

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const loadConfig = (): AppConfig => {
  const httpPort: number = parseNumber(process.env.HTTP_PORT, 8787);
  const dbPath: string = process.env.DB_PATH ?? "./data/docs.sqlite";
  const chunkSize: number = parseNumber(process.env.CHUNK_SIZE, 1000);
  const chunkOverlap: number = parseNumber(process.env.CHUNK_OVERLAP, 200);
  const embeddingModel: string = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
  const openaiApiKey: string | undefined = process.env.OPENAI_API_KEY;
  return { httpPort, dbPath, chunkSize, chunkOverlap, embeddingModel, openaiApiKey };
};
