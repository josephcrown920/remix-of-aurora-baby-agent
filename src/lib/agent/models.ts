/** Client-safe catalog of the image and video models the studio can use. */

export type StudioModel = {
  id: string;
  label: string;
  provider: "Lovable AI" | "ModelArk";
  note: string;
};

export const IMAGE_MODELS: StudioModel[] = [
  { id: "google/gemini-3-pro-image", label: "Gemini 3 Pro Image", provider: "Lovable AI", note: "Best all-round stills and text in frame" },
  { id: "google/gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image", provider: "Lovable AI", note: "Fast stills at near-pro quality" },
  { id: "google/gemini-3.1-flash-lite-image", label: "Gemini 3.1 Flash Lite Image", provider: "Lovable AI", note: "Cheapest, fastest stills" },
  { id: "openai/gpt-image-2", label: "GPT Image 2", provider: "Lovable AI", note: "Strong typography and product shots" },
  { id: "openai/gpt-image-2.5-flare", label: "GPT Image 2.5 Flare", provider: "Lovable AI", note: "Latency-first OpenAI stills" },
  { id: "openai/gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst", provider: "Lovable AI", note: "Quality-first OpenAI stills" },
  { id: "ark:seedream-4-5-251128", label: "Seedream 4.5", provider: "ModelArk", note: "High-detail cinematic stills, 2K output" },
  { id: "ark:seedream-4-0-250828", label: "Seedream 4.0", provider: "ModelArk", note: "Faster, cheaper Seedream generation" },
];

export const VIDEO_MODELS: StudioModel[] = [
  { id: "google/gemini-omni-1.1-flash", label: "Gemini Omni 1.1 Flash", provider: "Lovable AI", note: "Cheapest drafts, 3–10s with sound" },
  { id: "google/veo-3.1-lite", label: "Veo 3.1 Lite", provider: "Lovable AI", note: "Low-cost 8s clips with audio" },
  { id: "google/veo-3.1-fast", label: "Veo 3.1 Fast", provider: "Lovable AI", note: "Balanced speed and quality" },
  { id: "google/veo-3.1", label: "Veo 3.1", provider: "Lovable AI", note: "Highest quality, most expensive" },
  { id: "ark:seedance-1-0-pro-250528", label: "Seedance 1.0 Pro", provider: "ModelArk", note: "Cinematic 5–12s shots with camera control" },
];

export const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0]!.id;
export const DEFAULT_VIDEO_MODEL = VIDEO_MODELS[0]!.id;

export function modelLabel(id: string) {
  return [...IMAGE_MODELS, ...VIDEO_MODELS].find((model) => model.id === id)?.label ?? id;
}
