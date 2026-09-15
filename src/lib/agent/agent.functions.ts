import { createServerFn } from "@tanstack/react-start";

import { DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL } from "./models";

export type ChatTurnInput = {
  messages: { role: "user" | "assistant"; text: string }[];
  memory: string;
};

export const directorChat = createServerFn({ method: "POST" })
  .inputValidator((input: ChatTurnInput) => {
    if (!Array.isArray(input?.messages) || input.messages.length === 0) throw new Error("Say something first.");
    return { messages: input.messages.slice(-24), memory: String(input.memory ?? "").slice(0, 6000) };
  })
  .handler(async ({ data }) => {
    const { directorTurn } = await import("./gateway.server");
    return directorTurn(data);
  });

/** Renders a still frame, stores it, and attaches it to the shot when one is given. */
export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string; model?: string; shotId?: string }) => {
    const prompt = String(input?.prompt ?? "").trim();
    if (!prompt) throw new Error("Describe the image you want first.");
    return { prompt: prompt.slice(0, 4000), model: input?.model || DEFAULT_IMAGE_MODEL, shotId: input?.shotId };
  })
  .handler(async ({ data }) => {
    const { renderImage } = await import("./gateway.server");
    const { storeDataUrl, storeRemote, signMedia } = await import("./storage.server");

    const raw = await renderImage(data.prompt, data.model);
    const path = `images/${crypto.randomUUID()}.png`;
    const stored = raw.startsWith("data:") ? await storeDataUrl(raw, path) : await storeRemote(raw, path, "image/png");

    if (data.shotId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("studio_shots").update({ image_url: stored }).eq("id", data.shotId);
    }
    return { imageUrl: (await signMedia(stored)) ?? raw };
  });

export const startVideo = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string; model?: string; seconds?: number }) => {
    const prompt = String(input?.prompt ?? "").trim();
    if (!prompt) throw new Error("Describe the shot you want first.");
    return { prompt: prompt.slice(0, 4000), model: input?.model || DEFAULT_VIDEO_MODEL, seconds: input?.seconds ?? 8 };
  })
  .handler(async ({ data }) => {
    const { createVideo } = await import("./gateway.server");
    return createVideo(data.prompt, data.model, data.seconds);
  });

/** Polls a video job; on completion the clip is stored and attached to the shot. */
export const checkVideo = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; shotId?: string }) => {
    const id = String(input?.id ?? "").trim();
    if (!id) throw new Error("Missing video id.");
    return { id, shotId: input?.shotId };
  })
  .handler(async ({ data }): Promise<{ id: string; status: string; progress: number; error?: string; videoUrl?: string }> => {
    const { getVideo, fetchVideoContent } = await import("./gateway.server");
    const job = await getVideo(data.id);
    if (job.status !== "completed") return job;

    const { storeMedia, storeRemote, signMedia } = await import("./storage.server");
    const path = `videos/${crypto.randomUUID()}.mp4`;
    let stored: string;
    if (job.url) {
      stored = await storeRemote(job.url, path, "video/mp4");
    } else {
      const upstream = await fetchVideoContent(data.id);
      if (!upstream.ok) throw new Error("The finished clip could not be downloaded.");
      stored = await storeMedia(await upstream.arrayBuffer(), path, "video/mp4");
    }

    if (data.shotId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("studio_shots").update({ video_url: stored }).eq("id", data.shotId);
    }
    const signed = await signMedia(stored);
    return { id: job.id, status: "completed", progress: 100, ...(signed ? { videoUrl: signed } : {}) };
  });
