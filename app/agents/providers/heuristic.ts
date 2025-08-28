/**
 * Heuristic agent provider (rule-based, no external dependencies)
 */

import { z } from "zod";
import type {
  AgentProviderFactory,
  AgentService,
  AgentPreChunkDecision,
  AgentPreChunkInput,
  AgentChunkAnnotation,
  AgentChunkAnnotationInput,
} from "../agent-interface.js";

const HeuristicOptionsSchema = z.object({
  targetChunkSize: z.number().int().min(200).max(8000).default(3000),
  targetOverlap: z.number().int().min(0).max(1000).default(150),
  maxChunkSizeForCode: z.number().int().min(200).max(6000).default(2000),
  minChunkSizeForProse: z.number().int().min(200).max(8000).default(3000),
});

const detectHasCode = (text: string): boolean => {
  if (text.includes("```")) return true;
  if (/\bfunction\b|\bclass\b|=>|;\s*$/m.test(text)) return true;
  if (/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/.test(text)) return true;
  return false;
};

const detectLanguages = (text: string): string[] => {
  const langs = new Set<string>();
  const fenceRe = /```\s*(\w+)?/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text)) !== null) {
    const lang = (m[1] || "").toLowerCase();
    if (lang) langs.add(lang);
  }
  return Array.from(langs);
};

const extractHeading = (text: string): string | undefined => {
  const md = text.match(/^\s{0,3}#{1,6}\s+(.{1,120})$/m);
  if (md) return md[1].trim();
  const html = text.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
  if (html) return html[1].replace(/<[^>]+>/g, "").slice(0, 120).trim();
  return undefined;
};

const guessTags = (text: string): string[] => {
  const tags: string[] = [];
  const lc = text.toLowerCase();
  if (/(install|setup|getting started)/.test(lc)) tags.push("install");
  if (/(api|endpoint|request|response)/.test(lc)) tags.push("api");
  if (/(error|troubleshoot|debug)/.test(lc)) tags.push("troubleshooting");
  if (/(how to|guide|example|code sample)/.test(lc)) tags.push("examples");
  if (/(reference|parameters|schema)/.test(lc)) tags.push("reference");
  return Array.from(new Set(tags));
};

const summarize = (text: string, maxLen: number = 240): string | undefined => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= maxLen) return clean;
  const end = clean.indexOf(".", 120);
  if (end > 0 && end < maxLen) return clean.slice(0, end + 1);
  return clean.slice(0, maxLen) + "…";
};

const scoreQuality = (text: string): number => {
  const len = text.length;
  if (len < 200) return 0.4;
  if (len > 6000) return 0.55;
  const hasCode = detectHasCode(text) ? 0.05 : 0;
  const heading = extractHeading(text) ? 0.05 : 0;
  const base = 0.7;
  const score = Math.max(0, Math.min(1, base + hasCode + heading));
  return Number(score.toFixed(2));
};

export const heuristicAgentProvider: AgentProviderFactory<z.infer<typeof HeuristicOptionsSchema>> = {
  schema: HeuristicOptionsSchema,
  create: (options): AgentService => {
    const service: AgentService = {
      name: "heuristic",
      analyzePreChunk: (input: AgentPreChunkInput): AgentPreChunkDecision => {
        const hasCode = detectHasCode(input.text);
        if (hasCode) {
          return {
            strategy: "intelligent",
            chunkSize: options.maxChunkSizeForCode,
            chunkOverlap: options.targetOverlap,
          };
        }
        return {
          strategy: "recursive",
          chunkSize: options.minChunkSizeForProse,
          chunkOverlap: options.targetOverlap,
        };
      },
      annotateChunk: (input: AgentChunkAnnotationInput): AgentChunkAnnotation => {
        const { chunk } = input;
        const section_heading = extractHeading(chunk.text);
        const topic_tags = guessTags(chunk.text);
        const code_languages = detectLanguages(chunk.text);
        const summary = summarize(chunk.text);
        const quality_score = scoreQuality(chunk.text);
        return {
          section_heading,
          topic_tags,
          code_languages,
          entities: [],
          summary,
          quality_score,
        };
      },
    };
    return service;
  },
};
