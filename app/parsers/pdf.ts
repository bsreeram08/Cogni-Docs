/**
 * PDF parser using unpdf
 * @public
 */

import { extractText } from "unpdf";

export interface PdfParseInput {
  readonly data: Uint8Array;
}

export interface PdfParseOutput {
  readonly text: string;
}

export async function parsePdf(input: PdfParseInput): Promise<PdfParseOutput> {
  try {
    const result = await extractText(input.data);
    // unpdf returns { text: string[] } - join the array into a single string
    const text = Array.isArray(result.text) ? result.text.join('\n') : result.text;
    return { text };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error(
      `Failed to parse PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
