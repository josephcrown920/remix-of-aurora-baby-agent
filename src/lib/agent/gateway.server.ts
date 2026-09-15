/** AI provider helpers: director chat, image render, video render (Lovable AI + ModelArk). */

const BASE = "https://ai.gateway.lovable.dev/v1";

function key() {
  const k = process.env['LOVABLE_API_KEY'];
  if (!k) throw new Error("AI is not configured on this project yet.");
  return k;
}

function headers() {
  return { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" };
}

async function fail(r: Response, what: string): Promise<never> {
  const body = await r.text().catch(() => "");
  let message = body.slice(0, 400);
  try {
    const j = JSON.parse(body) as { message?: string; title?: string };
    message = j.message || j.title || message;
  } catch { /* keep raw text */ }
  throw new Error(`${what} failed (${r.status}): ${message || "no details"}`);
}

export type DirectorShot = {
  title: string;
  description: string;
  durationSeconds: number;
  imagePrompt: string;
  videoPrompt: string;
};

export type DirectorTurn = {
  reply: string;
  questions: string[];
  readyToCreate: boolean;
  brief: string;
  shots: DirectorShot[];
};

const DIRECTOR_SYSTEM = `You are Aurora's AI video director. You are a conversationalist first.

Rules:
- Never start producing from a vague request. Read the user's brief, restate what you understood in one or two sentences, and ask at most three sharp clarifying questions when anything essential is missing (subject, audience, length, format/aspect, tone, must-have shots, brand or character constraints).
- Respect the project memory, locks and constraints you are given. Never contradict them. If the project memory is empty, this is a brand new project with no history — never invent or reuse people, brands or storylines from anywhere else.
- Set readyToCreate true ONLY when the brief is concrete enough to shoot: subject, tone, length and format are known, or the user explicitly tells you to just go.
- When readyToCreate is true, write "brief" as a tight production brief and return 3 to 6 shots. Each shot needs a cinematic imagePrompt (single still frame, camera, lens, light) and a videoPrompt (motion, camera move, action) in plain descriptive language.
- When readyToCreate is false, return an empty shots array and put your questions in "questions".
- Warm, concise, professional. No emojis. Never mention model names or providers.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    questions: { type: "array", items: { type: "string" } },
    readyToCreate: { type: "boolean" },
    brief: { type: "string" },
    shots: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          durationSeconds: { type: "number" },
          imagePrompt: { type: "string" },
          videoPrompt: { type: "string" },
        },
        required: ["title", "description", "durationSeconds", "imagePrompt", "videoPrompt"],
      },
    },
  },
  required: ["reply", "questions", "readyToCreate", "brief", "shots"],
} as const;

export async function directorTurn(args: {
  messages: { role: "user" | "assistant"; text: string }[];
  memory: string;
}): Promise<DirectorTurn> {
  const input = [
    { role: "developer" as const, content: [{ type: "input_text" as const, text: `${DIRECTOR_SYSTEM}\n\nPROJECT MEMORY:\n${args.memory || "(empty — brand new project)"}` }] },
    ...args.messages.map((m) => ({
      role: m.role,
      content: [{ type: m.role === "assistant" ? ("output_text" as const) : ("input_text" as const), text: m.text }],
    })),
  ];

  const r = await fetch(`${BASE}/responses`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      text: { format: { type: "json_schema", name: "director_turn", strict: true, schema: SCHEMA } },
    }),
  });
  if (!r.ok || !r.body) return fail(r, "The director");

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const s = line.trim();
        if (!s.startsWith("data:")) continue;
        const payload = s.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload) as { type?: string; delta?: string; response?: { output_text?: string } };
          if (j.type === "response.output_text.delta" && typeof j.delta === "string") text += j.delta;
          if (j.type === "response.completed" && !text && j.response?.output_text) text = j.response.output_text;
        } catch { /* ignore keepalives */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  try {
    const parsed = JSON.parse(text) as DirectorTurn;
    return {
      reply: parsed.reply || "Tell me a little more about what you want to make.",
      questions: parsed.questions ?? [],
      readyToCreate: Boolean(parsed.readyToCreate),
      brief: parsed.brief ?? "",
      shots: parsed.shots ?? [],
    };
  } catch {
    return { reply: text || "I didn't catch that — can you say it another way?", questions: [], readyToCreate: false, brief: "", shots: [] };
  }
}

/* ------------------------------ images ------------------------------ */

/** Returns a data URL (Lovable AI) or a remote URL (ModelArk). */
export async function renderImage(prompt: string, model: string): Promise<string> {
  if (model.startsWith("ark:")) {
    const { generateModelArkImage } = await import("./modelark.server");
    return generateModelArkImage({ prompt, model: model.slice(4) });
  }

  const r = await fetch(`${BASE}/images/generations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) return fail(r, "Image generation");
  const j = (await r.json()) as { data?: { b64_json?: string; url?: string }[] };
  const first = j.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first?.url) return first.url;
  throw new Error("Image generation returned no image.");
}

/* ------------------------------ video ------------------------------ */

export type VideoJob = { id: string; status: string; progress: number };

function videoBody(prompt: string, model: string, seconds: number) {
  if (model === "google/gemini-omni-1.1-flash") {
    const duration = Math.max(3, Math.min(10, Math.round(seconds)));
    return {
      model,
      input: prompt,
      response_format: { type: "video", resolution: "720p", duration: `${duration}s`, aspect_ratio: "16:9" },
    };
  }
  return {
    model,
    instances: [{ prompt }],
    parameters: {
      durationSeconds: [4, 6, 8].includes(Math.round(seconds)) ? Math.round(seconds) : 8,
      resolution: "720p",
      aspectRatio: "16:9",
      sampleCount: 1,
      generateAudio: true,
    },
  };
}

export async function createVideo(prompt: string, model: string, seconds = 8): Promise<VideoJob> {
  if (model.startsWith("ark:")) {
    const { createModelArkVideoTask } = await import("./modelark.server");
    const id = await createModelArkVideoTask({ prompt, model: model.slice(4), duration: seconds });
    return { id: `ark:${id}`, status: "in_progress", progress: 0 };
  }
  const r = await fetch(`${BASE}/videos`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(videoBody(prompt, model, seconds)),
  });
  if (!r.ok) return fail(r, "Video generation");
  const j = (await r.json()) as VideoJob;
  return { id: j.id, status: j.status, progress: j.progress ?? 0 };
}

export async function getVideo(id: string): Promise<VideoJob & { error?: string; url?: string }> {
  if (id.startsWith("ark:")) {
    const { getModelArkVideoTask } = await import("./modelark.server");
    const task = await getModelArkVideoTask(id.slice(4));
    return { id, status: task.status, progress: task.progress, ...(task.error ? { error: task.error } : {}), ...(task.url ? { url: task.url } : {}) };
  }
  const r = await fetch(`${BASE}/videos/${encodeURIComponent(id)}`, { headers: headers() });
  if (!r.ok) return fail(r, "Video status");
  const j = (await r.json()) as VideoJob & { error?: { message?: string } | string };
  const error = typeof j.error === "string" ? j.error : j.error?.message;
  return { id: j.id, status: j.status, progress: j.progress ?? 0, ...(error ? { error } : {}) };
}

export async function fetchVideoContent(id: string): Promise<Response> {
  return fetch(`${BASE}/videos/${encodeURIComponent(id)}/content`, {
    headers: { Authorization: `Bearer ${key()}` },
    redirect: "follow",
  });
}
