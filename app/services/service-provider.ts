/**
 * Service provider - manages singleton instances of services
 */

import { loadConfig } from "../config/app-config.js";
import { createStorageService } from "../storage/storage-factory.js";
import { createEmbeddingService } from "../embeddings/embedding-factory.js";
import { createChunkerService } from "../chunking/chunking-factory.js";
import { createAgentService } from "../agents/agent-factory.js";
import type { StorageService } from "../storage/storage-interface.js";
import type { EmbeddingService } from "../embeddings/embedding-interface.js";
import type { Chunker } from "../chunking/chunker-interface.js";
import type { AppConfig } from "../config/app-config.js";
import type { AgentService } from "../agents/agent-interface.js";
import { logger } from "../utils/logger.js";

class ServiceProvider {
  private config: AppConfig | null = null;
  private storageService: StorageService | null = null;
  private embeddingService: EmbeddingService | null = null;
  private chunkerService: Chunker | null = null;
  private agentService: AgentService | null = null;

  public getConfig(): AppConfig {
    if (!this.config) {
      this.config = loadConfig();
      logger.info(
        `Loaded configuration: storage=${this.config.storage.name}, embeddings=${this.config.embeddings.name}, chunking=${this.config.chunking.name}`,
      );
    }
    return this.config;
  }

  public getStorageService(): StorageService {
    if (!this.storageService) {
      const config = this.getConfig();
      this.storageService = createStorageService(config);
      logger.info(`Initialized ${config.storage.name} storage service`);
    }
    return this.storageService;
  }

  public getEmbeddingService(): EmbeddingService {
    if (!this.embeddingService) {
      const config = this.getConfig();
      this.embeddingService = createEmbeddingService(config);
      logger.info(`Initialized ${config.embeddings.name} embedding service`);
    }
    return this.embeddingService;
  }

  public getChunkerService(): Chunker {
    if (!this.chunkerService) {
      const config = this.getConfig();
      this.chunkerService = createChunkerService(config);
      logger.info(`Initialized ${config.chunking.name} chunker service`);
    }
    return this.chunkerService;
  }

  public getAgentService(): AgentService {
    if (!this.agentService) {
      const config = this.getConfig();
      this.agentService = createAgentService(config);
      logger.info(
        `Initialized ${config.agent.name} agent service (enabled=${config.agent.enabled})`,
      );
    }
    return this.agentService;
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

    if (this.agentService?.cleanup) {
      cleanupPromises.push(this.agentService.cleanup());
    }

    await Promise.all(cleanupPromises);

    this.storageService = null;
    this.embeddingService = null;
    this.chunkerService = null;
    this.agentService = null;
    logger.info("Services cleaned up");
  }

  public reset(): void {
    this.config = null;
    this.storageService = null;
    this.embeddingService = null;
    this.chunkerService = null;
    this.agentService = null;
  }
}

// Singleton instance
const serviceProvider = new ServiceProvider();

export const getConfig = (): AppConfig => serviceProvider.getConfig();
export const getStorageService = (): StorageService => serviceProvider.getStorageService();
export const getEmbeddingService = (): EmbeddingService => serviceProvider.getEmbeddingService();
export const getChunkerService = (): Chunker => serviceProvider.getChunkerService();
export const getAgentService = (): AgentService => serviceProvider.getAgentService();
export const healthCheck = (): Promise<{
  storage: boolean;
  embeddings: boolean;
  overall: boolean;
}> => serviceProvider.healthCheck();
export const cleanup = (): Promise<void> => serviceProvider.cleanup();
export const resetServices = (): void => serviceProvider.reset();
