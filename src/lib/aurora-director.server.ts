export type AuroraDirectorInput = { instruction: string; context?: Record<string, unknown> };

export async function callAuroraDirector(input: AuroraDirectorInput) {
  const url = process.env.AURORA_MCP_URL?.trim();
  const token = process.env.AURORA_MCP_TOKEN?.trim();
  if (!url || !token) throw new Error("Aurora master director is not configured.");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const init = await fetch(url, {
    method: "POST", headers,
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "aurora-agent-bridge", version: "1.0.0" }
    }),
  });
  if (!init.ok) throw new Error(`Aurora MCP initialize failed: ${init.status}`);

  const result = await fetch(url, {
    method: "POST", headers,
    body: JSON.stringify({
      jsonrpc: "2.0", id: 2, method: "tools/call",
      params: { name: "aurora_modelark_director", arguments: input },
    }),
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(payload?.error?.message || `Aurora MCP director failed: ${result.status}`);
  return payload;
}
