import { createServerFn } from "@tanstack/react-start";

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

export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string }) => {
    const prompt = String(input?.prompt ?? "").trim();
    if (!prompt) throw new Error("Describe the image you want first.");
    return { prompt: prompt.slice(0, 4000) };
  })
  .handler(async ({ data }) => {
    const { renderImage } = await import("./gateway.server");
    return { imageUrl: await renderImage(data.prompt) };
  });

export const startVideo = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string; model?: string }) => {
    const prompt = String(input?.prompt ?? "").trim();
    if (!prompt) throw new Error("Describe the shot you want first.");
    return { prompt: prompt.slice(0, 4000), model: input?.model };
  })
  .handler(async ({ data }) => {
    const { createVideo } = await import("./gateway.server");
    return createVideo(data.prompt, data.model || "google/veo-3.1-fast");
  });

export const checkVideo = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    const id = String(input?.id ?? "").trim();
    if (!id) throw new Error("Missing video id.");
    return { id };
  })
  .handler(async ({ data }) => {
    const { getVideo } = await import("./gateway.server");
    return getVideo(data.id);
  });
