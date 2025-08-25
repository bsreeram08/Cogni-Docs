/**
 * Service provider - manages singleton instances of services
 */

import { loadConfig } from "../config/app-config.js";
import { createStorageService } from "../storage/storage-factory.js";
import { createEmbeddingService } from "../embeddings/embedding-factory.js";
import { createChunkerService } from "../chunking/chunking-factory.js";
import type { StorageService } from "../storage/storage-interface.js";
import type { EmbeddingService } from "../embeddings/embedding-interface.js";
import type { Chunker } from "../chunking/chunker-interface.js";
import type { AppConfig } from "../config/app-config.js";

class ServiceProvider {
  private config: AppConfig | null = null;
  private storageService: StorageService | null = null;
  private embeddingService: EmbeddingService | null = null;
  private chunkerService: Chunker | null = null;

  public getConfig(): AppConfig {
    if (!this.config) {
      this.config = loadConfig();
      console.log(
        `Loaded configuration: storage=${this.config.storage.name}, embeddings=${this.config.embeddings.name}, chunking=${this.config.chunking.name}`
      );
    }
    return this.config;
  }

  public getStorageService(): StorageService {
    if (!this.storageService) {
      const config = this.getConfig();
      this.storageService = createStorageService(config);
      console.log(`Initialized ${config.storage.name} storage service`);
    }
    return this.storageService;
  }

  public getEmbeddingService(): EmbeddingService {
    if (!this.embeddingService) {
      const config = this.getConfig();
      this.embeddingService = createEmbeddingService(config);
      console.log(`Initialized ${config.embeddings.name} embedding service`);
    }
    return this.embeddingService;
  }

  public getChunkerService(): Chunker {
    if (!this.chunkerService) {
      const config = this.getConfig();
      this.chunkerService = createChunkerService(config);
      console.log(`Initialized ${config.chunking.name} chunker service`);
    }
    return this.chunkerService;
  }

  public async healthCheck(): Promise<{
    storage: boolean;
    embeddings: boolean;
    overall: boolean;
  }> {
    const storage = await this.getStorageService().healthCheck();
    const embeddings = await this.getEmbeddingService().healthCheck();

    return {
      storage,
      embeddings,
      overall: storage && embeddings,
    };
  }

  public async cleanup(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    if (this.storageService) {
      cleanupPromises.push(this.storageService.cleanup());
    }

    if (this.embeddingService?.cleanup) {
      cleanupPromises.push(this.embeddingService.cleanup());
    }

    await Promise.all(cleanupPromises);

    this.storageService = null;
    this.embeddingService = null;
    this.chunkerService = null;
    console.log("Services cleaned up");
  }

  public reset(): void {
    this.config = null;
    this.storageService = null;
    this.embeddingService = null;
    this.chunkerService = null;
  }
}

// Singleton instance
const serviceProvider = new ServiceProvider();

export const getConfig = (): AppConfig => serviceProvider.getConfig();
export const getStorageService = (): StorageService =>
  serviceProvider.getStorageService();
export const getEmbeddingService = (): EmbeddingService =>
  serviceProvider.getEmbeddingService();
export const getChunkerService = (): Chunker =>
  serviceProvider.getChunkerService();
export const healthCheck = (): Promise<{
  storage: boolean;
  embeddings: boolean;
  overall: boolean;
}> => serviceProvider.healthCheck();
export const cleanup = (): Promise<void> => serviceProvider.cleanup();
export const resetServices = (): void => serviceProvider.reset();
