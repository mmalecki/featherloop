import Parallel from 'parallel-web';
import type { SearchParams, SearchResult } from 'parallel-web/resources/top-level';
import { defineTool, type Tool, type ToolOptions } from '../tool.ts';

export interface ParallelSearchParams {
  queries: string[];
  objective: string | undefined;
  mode: SearchParams['mode'];
  maxResults: number;
  /** Excerpt budget across all results. */
  maxCharsTotal: number;
  maxCharsPerResult: number | undefined;
}

export interface ParallelWebSearchConfig extends ToolOptions<ParallelSearchParams> {
  options?: {
    /** Defaults to the `PARALLEL_API_KEY` environment variable. */
    token?: string;
    client?: Parallel;
  };
}

/** Web search through Parallel's Search API, which already returns markdown excerpts. */
export function ParallelWebSearchTool({ options = {}, ...config }: ParallelWebSearchConfig = {}): Tool {
  const client = options.client ?? new Parallel(options.token ? { apiKey: options.token } : {});
  // Parallel asks for the session id to be passed along on follow-up calls of the same task.
  let sessionId: string | undefined;

  return defineTool<ParallelSearchParams>({
    description: 'Search the web. Returns relevant excerpts per result.',
    params: {
      queries: {
        schema: { type: 'array', items: { type: 'string' }, description: '2-3 short keyword queries' },
        required: true,
      },
      objective: {
        schema: { type: 'string', description: 'What you are trying to find out' },
      },
      mode: {
        schema: { type: 'string', enum: ['turbo', 'fast', 'basic', 'advanced'] },
        expose: false,
      },
      maxResults: {
        schema: { type: 'integer', minimum: 1 },
        default: 5,
        expose: false,
      },
      maxCharsTotal: {
        schema: { type: 'integer', minimum: 1 },
        default: 10_000,
        expose: false,
      },
      maxCharsPerResult: {
        schema: { type: 'integer', minimum: 1 },
        expose: false,
      },
    },

    async invoke({ queries, objective, mode, maxResults, maxCharsTotal, maxCharsPerResult }, { signal }) {
      const result = await client.search(
        {
          search_queries: queries,
          objective: objective ?? null,
          mode: mode ?? null,
          max_chars_total: maxCharsTotal,
          session_id: sessionId ?? null,
          advanced_settings: {
            max_results: maxResults,
            ...(maxCharsPerResult ? { excerpt_settings: { max_chars_per_result: maxCharsPerResult } } : {}),
          },
        },
        { signal },
      );
      sessionId = result.session_id;
      return format(result);
    },
  })(config);
}

function format({ results }: SearchResult): string {
  if (!results.length) return 'No results.';
  return results
    .map((r, i) => {
      const head = `## ${i + 1}. ${r.title ?? r.url}\n${r.url}${r.publish_date ? ` (${r.publish_date})` : ''}`;
      return [head, ...r.excerpts.map((e) => e.trim())].join('\n\n');
    })
    .join('\n\n');
}
