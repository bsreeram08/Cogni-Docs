/**
 * Registry for agent providers
 */

import type { AgentProviderFactory } from "../agent-interface.js";

const providers = new Map<string, AgentProviderFactory>();

export const registerAgentProvider = (
  name: string,
  factory: AgentProviderFactory
): void => {
  const key = name.toLowerCase();
  if (providers.has(key)) return;
  providers.set(key, factory);
};

export const getAgentProvider = (name: string): AgentProviderFactory => {
  const key = name.toLowerCase();
  const provider = providers.get(key);
  if (!provider) {
    const available = Array.from(providers.keys()).join(", ");
    throw new Error(
      `Unknown agent provider: ${name}. Available: ${available || "<none>"}`
    );
  }
  return provider;
};
