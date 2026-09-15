import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/video/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { fetchVideoContent } = await import("@/lib/agent/gateway.server");
        const upstream = await fetchVideoContent(params.id);
        if (!upstream.ok || !upstream.body) {
          return new Response(await upstream.text().catch(() => "Video unavailable"), { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
            "Cache-Control": "private, max-age=3600",
          },
        });
      },
    },
  },
});
