/**
 * HTML parser to plain text
 * @public
 */

import { htmlToText } from "html-to-text";

export interface HtmlParseInput {
  readonly data: Uint8Array;
}

export interface HtmlParseOutput {
  readonly text: string;
}

export function parseHtml(input: HtmlParseInput): HtmlParseOutput {
  const decoder: TextDecoder = new TextDecoder("utf-8", {
    fatal: false,
    ignoreBOM: true,
  });
  const html: string = decoder.decode(input.data);
  const text: string = htmlToText(html, { wordwrap: false });
  return { text };
}
