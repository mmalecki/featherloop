import { compact } from '../compact.ts';
import { defineTool, ToolInputError } from '../tool.ts';
import { htmlToMarkdown } from './shared/html.ts';

export interface WebFetchParams {
  url: string;
  /** What the agent is looking for; steers compaction. */
  focus: string | undefined;
  /** Summarize the page with a model before returning it. */
  compact: boolean;
  /** Model used for compaction. Defaults to the loop's model. */
  compactAgent: string | undefined;
  compactPrompt: string;
  /** Extra request fields for the compaction call. */
  compactOptions: Record<string, unknown> | undefined;
  /** Page text beyond this many characters is dropped (before compaction). */
  maxChars: number;
  maxBytes: number;
  timeoutMs: number;
  userAgent: string;
}

const MARKDOWN_TYPES = /^(text\/(markdown|x-markdown|plain|csv)|application\/(json|xml|[\w.+-]+\+(json|xml)))\b/;
const HTML_TYPES = /^(text\/html|application\/xhtml\+xml)\b/;

export const WebFetchTool = defineTool<WebFetchParams>({
  description: 'Fetch a web page and return its content as markdown.',
  params: {
    url: {
      schema: { type: 'string', description: 'http(s) URL' },
      required: true,
    },
    focus: {
      schema: { type: 'string', description: 'What to look for on the page' },
    },
    compact: {
      schema: { type: 'boolean', description: 'Summarize the page instead of returning it whole' },
      default: true,
      expose: false,
    },
    compactAgent: {
      schema: { type: 'string' },
      expose: false,
    },
    compactPrompt: {
      schema: { type: 'string' },
      default:
        'Compact the following web page into a summary for another agent. ' +
        'Keep facts, numbers, prices, names, dates and useful links verbatim. ' +
        'Drop navigation, ads and boilerplate. If a focus is given, keep only what is relevant to it ' +
        'and say so if the page does not cover it. Reply with the summary only.',
      expose: false,
    },
    compactOptions: {
      schema: { type: 'object' },
      expose: false,
    },
    maxChars: {
      schema: { type: 'integer' },
      default: 50_000,
      expose: false,
    },
    maxBytes: {
      schema: { type: 'integer' },
      default: 5 * 1024 * 1024,
      expose: false,
    },
    timeoutMs: {
      schema: { type: 'integer' },
      default: 30_000,
      expose: false,
    },
    userAgent: {
      schema: { type: 'string' },
      default: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
      expose: false,
    },
  },

  async invoke(params, ctx) {
    const url = parseUrl(params.url);
    const signal = AbortSignal.any([AbortSignal.timeout(params.timeoutMs), ...(ctx.signal ? [ctx.signal] : [])]);

    const response = await fetch(url, {
      signal,
      redirect: 'follow',
      headers: {
        'user-agent': params.userAgent,
        // Prefer servers that can hand us markdown directly.
        accept: 'text/markdown;q=1.0, text/plain;q=0.9, text/html;q=0.8, application/xhtml+xml;q=0.8, */*;q=0.1',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);

    const type = response.headers.get('content-type')?.toLowerCase() ?? '';
    const body = await readText(response, params.maxBytes, type);

    let title: string | undefined;
    let text: string;
    if (HTML_TYPES.test(type) || (!type && /^\s*</.test(body))) {
      ({ title, markdown: text } = htmlToMarkdown(body, response.url || url.href));
    } else if (MARKDOWN_TYPES.test(type) || !type) {
      text = body.trim();
    } else {
      throw new ToolInputError(`Unsupported content type "${type}" at ${url}`);
    }

    if (text.length > params.maxChars) {
      text = `${text.slice(0, params.maxChars)}\n\n[Truncated: ${text.length - params.maxChars} more characters]`;
    }
    if (!text) text = '[Page has no readable content]';
    else if (params.compact) {
      text = await compact(ctx, {
        prompt: params.compactPrompt,
        content: title ? `# ${title}\n\n${text}` : text,
        focus: params.focus,
        model: params.compactAgent,
        request: params.compactOptions,
      });
    }

    const header = [title && `# ${title}`, `URL: ${response.url || url.href}`].filter(Boolean).join('\n');
    return `${header}\n\n${text}`;
  },
});

function parseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ToolInputError(`Invalid URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ToolInputError(`Only http(s) URLs are supported: ${raw}`);
  }
  return url;
}

async function readText(response: Response, maxBytes: number, type: string): Promise<string> {
  const length = Number(response.headers.get('content-length'));
  if (length > maxBytes) throw new Error(`Response too large (${length} bytes, limit ${maxBytes})`);

  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    size += chunk.byteLength;
    if (size > maxBytes) {
      await response.body?.cancel();
      throw new Error(`Response too large (over ${maxBytes} bytes)`);
    }
    chunks.push(chunk);
  }
  return decoder(type).decode(Buffer.concat(chunks));
}

function decoder(type: string): TextDecoder {
  const charset = /charset="?([\w-]+)/.exec(type)?.[1];
  try {
    return new TextDecoder(charset);
  } catch {
    return new TextDecoder();
  }
}
