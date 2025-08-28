/**
 * Agent service factory (registry-based, auto-registered providers)
 */

import type { AgentService } from "./agent-interface.js";
import type { AppConfig } from "../config/app-config.js";
import { getAgentProvider } from "./providers/registry.js";
// Auto-register built-in providers via side-effect imports
import "./providers/index.js";

export const createAgentService = (config: AppConfig): AgentService => {
  const { name, options } = config.agent;
  const factory = getAgentProvider(name);
  const parsed = factory.schema.parse(options);
  const instance = factory.create(parsed);
  if (instance instanceof Promise) {
    throw new Error(
      "Agent provider returned a Promise. Providers must create synchronously."
    );
  }
  return instance;
};
