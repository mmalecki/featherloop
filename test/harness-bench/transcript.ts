import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reading a run's `transcript.json`: the last request, which holds the whole
 * conversation, and its response, in either API dialect.
 */

export type Json = Record<string, any>;

export interface Transcript {
  request: Json;
  response: Json;
}

export interface Call {
  name: string;
  args: Json;
}

/** A tool call that reached the web, or meant to. */
export interface Fetch {
  tool: string;
  /** A URL, or a search query. */
  target: string;
  host?: string;
  /** A host where solutions to the cases are published: a fetch to look at with suspicion. */
  solutionSource: boolean;
}

/** Exercism's site, and code hosts, where people publish their solutions. */
const SOLUTION_HOSTS = /(^|\.)(exercism\.(org|io)|github\.com|githubusercontent\.com|gitlab\.com|bitbucket\.org|sourcegraph\.com)$/i;
const URL = /https?:\/\/[^\s'"`<>)\]]+/g;

export function readTranscript(runDir: string): Transcript | undefined {
  const file = join(runDir, 'transcript.json');
  if (!existsSync(file)) return undefined;
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as Json;
  return { request: parsed.request ?? {}, response: parsed.response ?? {} };
}

/** Tool results in conversation order: OpenAI tool messages, or Anthropic tool_result blocks. */
export function toolResults(transcript: Transcript | undefined): string[] {
  return (transcript?.request.messages ?? []).flatMap((message: Json) => {
    if (message.role === 'tool') return [text(message.content)];
    if (message.role === 'user' && Array.isArray(message.content)) {
      return message.content.filter((block: Json) => block.type === 'tool_result').map((block: Json) => text(block.content));
    }
    return [];
  });
}

/** Every tool call in the conversation, the last response's included. */
export function toolCalls(transcript: Transcript | undefined): Call[] {
  if (!transcript) return [];
  const assistant = (transcript.request.messages ?? []).filter((message: Json) => message.role === 'assistant');
  const response = transcript.response;
  const last = response.choices?.[0]?.message ?? response;
  return [...assistant, last].flatMap((message: Json) => [
    // OpenAI, and the proxy's own assembly of a cut-off stream.
    ...(message.tool_calls ?? []).map((call: Json) => ({
      name: String(call.function?.name ?? call.name ?? ''),
      args: parseArgs(call.function?.arguments ?? call.arguments),
    })),
    // Anthropic.
    ...(Array.isArray(message.content) ? message.content : [])
      .filter((block: Json) => block.type === 'tool_use')
      .map((block: Json) => ({ name: String(block.name), args: (block.input as Json) ?? {} })),
  ]);
}

/**
 * Calls that reached for the web: a fetch or search tool's target, and any URL in a
 * shell command (curl, wget, a script). URLs in other tools' arguments (say, code
 * being written) aren't fetches.
 */
export function webFetches(transcript: Transcript | undefined): Fetch[] {
  return toolCalls(transcript).flatMap(({ name, args }) => {
    const targets = /fetch|search|browse/i.test(name)
      ? [String(args.url ?? args.query ?? args.q ?? JSON.stringify(args))]
      : /^(bash|shell|exec|run)$/i.test(name)
        ? (String(args.command ?? args.cmd ?? '').match(URL) ?? [])
        : [];
    return targets.map((target) => {
      const host = hostOf(target);
      return { tool: name, target, ...(host ? { host } : {}), solutionSource: host !== undefined && SOLUTION_HOSTS.test(host) };
    });
  });
}

/** The reasoning of the last response, as the proxy assembled it. */
export function lastReasoning(transcript: Transcript | undefined): string {
  const response = transcript?.response ?? {};
  if (typeof response.reasoning === 'string') return response.reasoning;
  const message = response.choices?.[0]?.message;
  if (typeof message?.reasoning_content === 'string') return message.reasoning_content;
  if (Array.isArray(response.content)) return response.content.filter((block: Json) => block.type === 'thinking').map((block: Json) => block.thinking).join('\n');
  return '';
}

function hostOf(target: string): string | undefined {
  try {
    return new globalThis.URL(target).hostname;
  } catch {
    return undefined;
  }
}

function parseArgs(raw: unknown): Json {
  if (typeof raw !== 'string') return (raw as Json) ?? {};
  try {
    return JSON.parse(raw) as Json;
  } catch {
    return {};
  }
}

function text(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content ?? '');
}
