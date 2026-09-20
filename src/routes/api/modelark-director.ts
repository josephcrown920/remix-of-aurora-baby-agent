import { createFileRoute } from "@tanstack/react-router";
import { callAuroraDirector } from "@/lib/aurora-director.server";

export const Route = createFileRoute("/api/modelark-director")({
  server: { handlers: {
    POST: async ({ request }) => {
      const token = process.env.AURORA_MCP_TOKEN?.trim();
      const auth = request.headers.get("authorization") || "";
      if (!token) return Response.json({ error: "AURORA_MCP_TOKEN is not configured" }, { status: 503 });
      if (auth !== `Bearer ${token}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
      const body = await request.json().catch(() => ({}));
      if (typeof body?.instruction !== "string" || !body.instruction.trim()) return Response.json({ error: "instruction is required" }, { status: 400 });
      try {
        return Response.json(await callAuroraDirector({ instruction: body.instruction.trim(), context: body.context }));
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
      }
    },
  }},
});
