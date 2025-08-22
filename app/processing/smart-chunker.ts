/**
 * Smart content-aware chunking with pattern-based metadata extraction
 */

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source_file: string;
    page_number?: number;
    document_type: string;
    category?: string;
    keywords: string[];
    chunk_index: number;
  };
}

const patterns = {
  troubleshooting: [
    "error",
    "exception",
    "failed",
    "issue",
    "problem",
    "fix",
    "resolve",
    "debug",
    "trouble",
    "warning",
  ],
  examples: [
    "example",
    "sample",
    "demo",
    "tutorial",
    "walkthrough",
    "guide",
    "how to",
    "step by step",
  ],
  instructions: [
    "step",
    "procedure",
    "process",
    "method",
    "workflow",
    "instruction",
    "follow",
    "complete",
  ],
  api_reference: [
    "endpoint",
    "POST",
    "GET",
    "PUT",
    "DELETE",
    "API",
    "request",
    "response",
    "parameter",
    "header",
  ],
};

export class SmartChunker {
  private maxChunkSize: number;
  private minChunkSize: number;
  private overlapSize: number;

  constructor(
    options: {
      maxChunkSize?: number;
      minChunkSize?: number;
      overlapSize?: number;
    } = {}
  ) {
    this.maxChunkSize = options.maxChunkSize || 1000;
    this.minChunkSize = options.minChunkSize || 200;
    this.overlapSize = options.overlapSize || 200;
  }

  /**
   * Extract document type from filename or content patterns
   */
  private extractDocumentType(filename: string, content: string): string {
    const lower = filename.toLowerCase();

    if (lower.includes("gicc") || lower.includes("global")) return "gicc";
    if (
      lower.includes("qa") ||
      lower.includes("question") ||
      lower.includes("answer")
    )
      return "qa";
    if (
      lower.includes("onboard") ||
      lower.includes("welcome") ||
      lower.includes("getting-started")
    )
      return "onboarding";
    if (
      lower.includes("test") ||
      lower.includes("spec") ||
      lower.includes("case")
    )
      return "testcases";

    // Content-based detection
    if (content.includes("test case") || content.includes("testing"))
      return "testcases";
    if (
      content.includes("Q:") ||
      content.includes("A:") ||
      content.includes("FAQ")
    )
      return "qa";

    return "unknown";
  }

  /**
   * Categorize content based on patterns
   */
  private categorizeContent(content: string): string | undefined {
    const lowerContent = content.toLowerCase();

    for (const [category, keywords] of Object.entries(patterns)) {
      const matchCount = keywords.reduce((count, keyword) => {
        return count + (lowerContent.includes(keyword.toLowerCase()) ? 1 : 0);
      }, 0);

      // If we find 2+ matching keywords, classify it
      if (matchCount >= 2) {
        return category;
      }
    }

    return undefined;
  }

  /**
   * Extract keywords from content using pattern matching
   */
  private extractKeywords(content: string): string[] {
    const keywords = new Set<string>();
    const lowerContent = content.toLowerCase();

    // Add pattern-based keywords
    (Object.values(patterns).flat() as string[]).forEach((keyword) => {
      if (lowerContent.includes(keyword.toLowerCase())) {
        keywords.add(keyword.toLowerCase());
      }
    });

    // Extract technical terms (simple heuristic)
    const technicalPatterns = [
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b\w+[A-Z]\w+\b/g, // CamelCase
      /\b\w+[-_]\w+\b/g, // kebab-case, snake_case
      /\b\d+\.\d+\.\d+\b/g, // Version numbers
      /\bhttps?:\/\/\S+\b/g, // URLs
    ];

    technicalPatterns.forEach((pattern) => {
      const matches = (content.match(pattern) ?? []) as string[];
      matches.forEach((match) => keywords.add(match.toLowerCase()));
    });

    return Array.from(keywords).slice(0, 10); // Limit to 10 keywords
  }

  /**
   * Smart chunking based on content structure
   */
  private createContentAwareChunks(content: string): string[] {
    // Split by natural boundaries
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
    const chunks: string[] = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      // If adding this paragraph would exceed max size, finalize current chunk
      if (
        currentChunk &&
        currentChunk.length + trimmed.length > this.maxChunkSize
      ) {
        if (currentChunk.length >= this.minChunkSize) {
          chunks.push(currentChunk.trim());

          // Add overlap from the end of the previous chunk
          const overlap = this.extractOverlap(currentChunk);
          currentChunk = overlap + "\n\n" + trimmed;
        } else {
          // Current chunk is too small, just add the paragraph
          currentChunk += "\n\n" + trimmed;
        }
      } else {
        // Add paragraph to current chunk
        currentChunk += currentChunk ? "\n\n" + trimmed : trimmed;
      }
    }

    // Add the final chunk if it has content
    if (currentChunk.trim() && currentChunk.length >= this.minChunkSize) {
      chunks.push(currentChunk.trim());
    } else if (currentChunk.trim() && chunks.length > 0) {
      // Merge small final chunk with the last chunk
      chunks[chunks.length - 1] += "\n\n" + currentChunk.trim();
    } else if (currentChunk.trim()) {
      // If it's the only chunk, keep it even if small
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [content]; // Fallback to original content
  }

  /**
   * Extract overlap text from the end of a chunk
   */
  private extractOverlap(chunk: string): string {
    if (chunk.length <= this.overlapSize) return "";

    // Get the last N characters and try to break at sentence boundary
    let overlap = chunk.slice(-this.overlapSize);
    const sentenceEnd = overlap.lastIndexOf(".");

    if (sentenceEnd > this.overlapSize * 0.5) {
      // If we find a good sentence boundary, use it
      overlap = overlap.slice(sentenceEnd + 1).trim();
    }

    return overlap;
  }

  /**
   * Main chunking method
   */
  public chunkDocument(
    content: string,
    filename: string,
    pageNumber?: number
  ): Array<{
    content: string;
    metadata: {
      source_file: string;
      page_number?: number;
      document_type: string;
      category?: string;
      keywords: string[];
      chunk_index: number;
    };
  }> {
    const documentType = this.extractDocumentType(filename, content);
    const contentChunks = this.createContentAwareChunks(content);

    return contentChunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        source_file: filename,
        page_number: pageNumber,
        document_type: documentType,
        category: this.categorizeContent(chunk),
        keywords: this.extractKeywords(chunk),
        chunk_index: index,
      },
    }));
  }
}
