import { createServerFn } from "@tanstack/react-start";

import { DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL } from "@/lib/agent/models";

export type StudioShot = {
  id: string;
  position: number;
  title: string;
  summary: string;
  durationSeconds: number;
  imagePrompt: string;
  videoPrompt: string;
  imageUrl: string | null;
  videoUrl: string | null;
};

export type StudioMessage = { id: string; role: "user" | "agent"; text: string; meta: string | null };

export type StudioProject = {
  id: string;
  title: string;
  brief: string;
  rules: string;
  projectType: string;
  world: { title: string; detail: string; tag: string }[];
  imageModel: string;
  videoModel: string;
  messages: StudioMessage[];
  shots: StudioShot[];
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function cleanKey(value: unknown) {
  const key = String(value ?? "").trim().slice(0, 80);
  if (!key) throw new Error("Missing workspace key.");
  return key;
}

/** Loads (or creates) the current workspace for this browser. */
export const loadStudio = createServerFn({ method: "POST" })
  .inputValidator((input: { ownerKey: string }) => ({ ownerKey: cleanKey(input?.ownerKey) }))
  .handler(async ({ data }): Promise<StudioProject> => {
    const { signMedia } = await import("@/lib/agent/storage.server");
    const client = await db();

    const existing = await client
      .from("studio_projects")
      .select("*")
      .eq("owner_key", data.ownerKey)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    let project = existing.data;
    if (!project) {
      const created = await client
        .from("studio_projects")
        .insert({ owner_key: data.ownerKey, image_model: DEFAULT_IMAGE_MODEL, video_model: DEFAULT_VIDEO_MODEL })
        .select("*")
        .single();
      if (created.error) throw new Error(created.error.message);
      project = created.data;
    }

    const [messages, shots] = await Promise.all([
      client.from("studio_messages").select("*").eq("project_id", project.id).order("created_at", { ascending: true }),
      client.from("studio_shots").select("*").eq("project_id", project.id).order("position", { ascending: true }),
    ]);

    const signedShots: StudioShot[] = await Promise.all(
      (shots.data ?? []).map(async (shot) => ({
        id: shot.id,
        position: shot.position,
        title: shot.title,
        summary: shot.summary,
        durationSeconds: Number(shot.duration_seconds),
        imagePrompt: shot.image_prompt,
        videoPrompt: shot.video_prompt,
        imageUrl: await signMedia(shot.image_url),
        videoUrl: await signMedia(shot.video_url),
      })),
    );

    return {
      id: project.id,
      title: project.title,
      brief: project.brief,
      rules: project.rules,
      projectType: project.project_type,
      world: Array.isArray(project.world) ? (project.world as StudioProject["world"]) : [],
      imageModel: project.image_model,
      videoModel: project.video_model,
      messages: (messages.data ?? []).map((message) => ({
        id: message.id,
        role: message.role === "user" ? "user" : "agent",
        text: message.text,
        meta: message.meta,
      })),
      shots: signedShots,
    };
  });

export const saveStudioSettings = createServerFn({ method: "POST" })
  .inputValidator((input: { projectId: string; title?: string; brief?: string; rules?: string; projectType?: string; imageModel?: string; videoModel?: string }) => {
    if (!input?.projectId) throw new Error("Missing project.");
    return input;
  })
  .handler(async ({ data }) => {
    const client = await db();
    const patch: Record<string, string> = {};
    if (data.title !== undefined) patch['title'] = data.title.slice(0, 200);
    if (data.brief !== undefined) patch['brief'] = data.brief.slice(0, 8000);
    if (data.rules !== undefined) patch['rules'] = data.rules.slice(0, 8000);
    if (data.projectType !== undefined) patch['project_type'] = data.projectType;
    if (data.imageModel !== undefined) patch['image_model'] = data.imageModel;
    if (data.videoModel !== undefined) patch['video_model'] = data.videoModel;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await client.from("studio_projects").update(patch).eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveStudioMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { projectId: string; role: "user" | "agent"; text: string; meta?: string }) => {
    if (!input?.projectId) throw new Error("Missing project.");
    return input;
  })
  .handler(async ({ data }) => {
    const client = await db();
    const { data: row, error } = await client
      .from("studio_messages")
      .insert({ project_id: data.projectId, role: data.role, text: data.text.slice(0, 8000), meta: data.meta ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

/** Replaces the shot list for a project (used when the director returns a new cut). */
export const saveStudioShots = createServerFn({ method: "POST" })
  .inputValidator((input: { projectId: string; shots: Omit<StudioShot, "id" | "imageUrl" | "videoUrl">[] }) => {
    if (!input?.projectId) throw new Error("Missing project.");
    return input;
  })
  .handler(async ({ data }): Promise<StudioShot[]> => {
    const client = await db();
    await client.from("studio_shots").delete().eq("project_id", data.projectId);
    if (!data.shots.length) return [];
    const { data: rows, error } = await client
      .from("studio_shots")
      .insert(
        data.shots.map((shot, index) => ({
          project_id: data.projectId,
          position: index,
          title: shot.title.slice(0, 200),
          summary: shot.summary.slice(0, 2000),
          duration_seconds: shot.durationSeconds,
          image_prompt: shot.imagePrompt.slice(0, 4000),
          video_prompt: shot.videoPrompt.slice(0, 4000),
        })),
      )
      .select("*");
    if (error) throw new Error(error.message);
    return (rows ?? [])
      .sort((a, b) => a.position - b.position)
      .map((shot) => ({
        id: shot.id,
        position: shot.position,
        title: shot.title,
        summary: shot.summary,
        durationSeconds: Number(shot.duration_seconds),
        imagePrompt: shot.image_prompt,
        videoPrompt: shot.video_prompt,
        imageUrl: null,
        videoUrl: null,
      }));
  });

export const resetStudio = createServerFn({ method: "POST" })
  .inputValidator((input: { ownerKey: string }) => ({ ownerKey: cleanKey(input?.ownerKey) }))
  .handler(async ({ data }) => {
    const client = await db();
    const { error } = await client.from("studio_projects").delete().eq("owner_key", data.ownerKey);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
