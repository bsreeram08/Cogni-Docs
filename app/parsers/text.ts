/**
 * Plain text parser
 * @public
 */

export interface TextParseInput {
  readonly data: Uint8Array;
}

export interface TextParseOutput {
  readonly text: string;
}

export function parseText(input: TextParseInput): TextParseOutput {
  const decoder: TextDecoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });
  const text: string = decoder.decode(input.data);
  return { text };
}
