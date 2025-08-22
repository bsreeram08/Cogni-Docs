#!/usr/bin/env bun

/**
 * Smoke test for upload-server API endpoints
 * Requires the upload server to be running locally.
 * Default base URL: http://localhost:3001 (override with API_BASE_URL)
 */

const BASE_URL: string = process.env.API_BASE_URL || "http://localhost:3001";

interface HealthResponse {
  readonly status: "healthy" | "degraded";
  readonly storage: { readonly provider: string; readonly status: boolean };
  readonly embeddings: { readonly provider: string; readonly status: boolean };
  readonly uptime: number;
  readonly timestamp: string;
}

interface CreateSetResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly created_at: unknown;
  readonly document_count: number;
}

interface UploadResultItem {
  readonly filename: string;
  readonly documentId: string;
  readonly chunksCreated: number;
}

async function expectOk(res: Response, message: string): Promise<void> {
  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(`${message} failed: HTTP ${res.status} ${res.statusText} - ${JSON.stringify(body)}`);
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

async function run(): Promise<void> {
  console.log(`Using API base URL: ${BASE_URL}`);

  // 1) Health
  console.log("1) GET /health");
  const healthRes = await fetch(`${BASE_URL}/health`);
  await expectOk(healthRes, "Health check");
  const health: HealthResponse = (await healthRes.json()) as HealthResponse;
  console.log(`   status=${health.status}, storage=${health.storage.provider}, embeddings=${health.embeddings.provider}`);

  // 2) List sets (empty or existing)
  console.log("2) GET /sets");
  const setsRes = await fetch(`${BASE_URL}/sets`);
  await expectOk(setsRes, "List sets");
  const setsJson = (await setsRes.json()) as { readonly sets: readonly CreateSetResponse[] };
  console.log(`   sets=${setsJson.sets.length}`);

  // 3) Create set
  console.log("3) POST /sets");
  const setName = `demo-set-${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/sets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: setName, description: "Demo set" }),
  });
  await expectOk(createRes, "Create set");
  const created: CreateSetResponse = (await createRes.json()) as CreateSetResponse;
  console.log(`   created id=${created.id}`);

  // 4) Get set by id
  console.log("4) GET /sets/:setId");
  const getSetRes = await fetch(`${BASE_URL}/sets/${encodeURIComponent(created.id)}`);
  await expectOk(getSetRes, "Get set");
  const got: CreateSetResponse | { readonly error: string } = (await getSetRes.json()) as any;
  if ("error" in got) throw new Error(`Get set returned error: ${got.error}`);
  console.log(`   got id=${got.id}`);

  // 5) Upload files
  console.log("5) POST /sets/:setId/upload");
  const form = new FormData();
  const file1 = new Blob(["Hello from Bun!"], { type: "text/plain" });
  const file2 = new Blob(["Another file content"], { type: "text/plain" });
  form.append("files", file1, "hello.txt");
  form.append("files", file2, "another.txt");

  const uploadRes = await fetch(`${BASE_URL}/sets/${encodeURIComponent(created.id)}/upload`, {
    method: "POST",
    body: form,
  });
  await expectOk(uploadRes, "Upload files");
  const uploadJson = (await uploadRes.json()) as { readonly message: string; readonly results: readonly UploadResultItem[] };
  console.log(`   ${uploadJson.message}`);
  if (!uploadJson.results?.length) throw new Error("Upload did not return any results");

  // 6) List documents in set
  console.log("6) GET /sets/:setId/documents");
  const docsRes = await fetch(`${BASE_URL}/sets/${encodeURIComponent(created.id)}/documents`);
  await expectOk(docsRes, "List documents");
  const docsJson = await safeJson(docsRes);
  console.log(`   documents payload type=${typeof docsJson}`);

  // 7) Delete first uploaded document
  console.log("7) DELETE /sets/:setId/documents/:documentId");
  const firstDocId = uploadJson.results[0].documentId;
  const delRes = await fetch(`${BASE_URL}/sets/${encodeURIComponent(created.id)}/documents/${encodeURIComponent(firstDocId)}`, {
    method: "DELETE",
  });
  await expectOk(delRes, "Delete document");
  const delJson = (await delRes.json()) as { readonly message?: string; readonly error?: string };
  if (delJson.error) throw new Error(`Delete returned error: ${delJson.error}`);
  console.log(`   ${delJson.message}`);

  // 8) Negative: Get nonexistent set
  console.log("8) GET /sets/nonexistent");
  const notFoundRes = await fetch(`${BASE_URL}/sets/nonexistent-set-id`);
  if (notFoundRes.status !== 404) {
    const nf = await safeJson(notFoundRes);
    throw new Error(`Expected 404 for nonexistent set, got ${notFoundRes.status}: ${JSON.stringify(nf)}`);
  }
  console.log("   got 404 as expected");

  console.log("\n✅ All API checks passed");
}

run().catch((err) => {
  console.error("\n❌ API checks failed:", err);
  process.exit(1);
});
