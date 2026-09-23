/// <reference lib="webworker" />
/**
 * Semantic search worker (A51). Loaded only when the Search island needs it: it
 * downloads the quantised multilingual e5 model once (pinned revision, from Hugging
 * Face; the browser's Cache API keeps it), embeds each query with the e5 "query:"
 * prefix, and ranks the committed term vectors by cosine similarity. Runs off the main
 * thread so typing never stutters. The ONNX runtime itself is served by this site (A55).
 */
import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import ortMjs from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import {
  EMBED_OPTIONS,
  MODEL,
  loadIndex,
  nearBest,
  queryText,
  rankBySimilarity,
  type SemanticIndex,
  type VectorFile,
} from '../lib/semantic';

export type WorkerRequest = { id: number; query: string; vectorsUrl: string };
export type WorkerResponse =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'result'; id: number; query: string; hits: { id: string; score: number }[] }
  | { type: 'error'; id: number; message: string };

// Models come from the Hugging Face Hub, never from this site; the runtime from this site.
env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = { wasm: ortWasm, mjs: ortMjs };

const post = (m: WorkerResponse) => (self as DedicatedWorkerGlobalScope).postMessage(m);

let ready: Promise<[FeatureExtractionPipeline, SemanticIndex]> | null = null;

function load(vectorsUrl: string) {
  const files = new Map<string, { loaded: number; total: number }>();
  const model = pipeline('feature-extraction', MODEL.id, {
    dtype: MODEL.dtype,
    revision: MODEL.revision,
    progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status !== 'progress' || !p.file) return;
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
      let loaded = 0;
      let total = 0;
      for (const f of files.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      post({ type: 'progress', loaded, total });
    },
  }) as Promise<FeatureExtractionPipeline>;
  const index = fetch(vectorsUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`vectors: HTTP ${r.status}`);
      return r.json() as Promise<VectorFile>;
    })
    .then(loadIndex);
  return Promise.all([model, index]).then((r) => {
    post({ type: 'ready' });
    return r;
  });
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, query, vectorsUrl } = e.data;
  try {
    // Only a failed load is forgotten (so an explicit retry reloads); a failed query isn't.
    ready ??= load(vectorsUrl).catch((err) => {
      ready = null;
      throw err;
    });
    const [extract, index] = await ready;
    const out = await extract(queryText(query), EMBED_OPTIONS);
    const hits = nearBest(rankBySimilarity(index, out.data as Float32Array));
    post({ type: 'result', id, query, hits });
  } catch (err) {
    post({ type: 'error', id, message: err instanceof Error ? err.message : String(err) });
  }
};
