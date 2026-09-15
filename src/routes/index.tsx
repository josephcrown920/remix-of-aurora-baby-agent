import { createFileRoute } from "@tanstack/react-router";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Aperture, ArrowDownToLine, ArrowLeft, ArrowRight, AudioLines, Bot, Braces,
  Captions, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clapperboard, Copy,
  Download, FileText, Film, FolderOpen, HardDriveUpload, LayoutTemplate, LockKeyhole, Menu,
  MessageSquareText, Mic2, Music2, PanelRight, Pause, Play, Plus, Redo2, RotateCcw, Search,
  Send, Settings2, SlidersHorizontal, Sparkles, Split, SunMedium, Trash2, Undo2, Upload,
  WandSparkles, X, ZoomIn, ZoomOut,
} from "lucide-react";

import { checkVideo, directorChat, generateImage, startVideo } from "@/lib/agent/agent.functions";

export const Route = createFileRoute("/")({
  component: AuroraWorkspace,
});

type Render = { status: "idle" | "image" | "video" | "done"; imageUrl?: string; videoUrl?: string; error?: string; progress?: number };
type Renders = Record<string, Render>;

type WorkspaceMode = "home" | "agent" | "edit";
type AgentTab = "context" | "notebook" | "scenes" | "final";
type MessageRole = "user" | "agent";

type Clip = { id: string; label: string; sub: string; tone: string; width: number; state?: string };
type Media = { id: string; name: string; type: string; color: string; glyph: string };
type AgentMessage = { id: string; role: MessageRole; text: string; meta?: string };

const initialClips: Clip[] = [
  { id: "shot-01", label: "01  —  The signal", sub: "00:00–00:06", tone: "from-[#5d3d2c] via-[#1f2630] to-[#10131b]", width: 18 },
  { id: "shot-02", label: "02  —  A city that listens", sub: "00:06–00:13", tone: "from-[#183f47] via-[#162b35] to-[#11141d]", width: 23 },
  { id: "shot-03", label: "03  —  Find your frequency", sub: "00:13–00:21", tone: "from-[#7a5130] via-[#362a35] to-[#11131b]", width: 27 },
  { id: "shot-04", label: "04  —  Stay curious", sub: "00:21–00:28", tone: "from-[#1d3d42] via-[#293441] to-[#11131b]", width: 22 },
  { id: "shot-05", label: "05  —  Make the next move", sub: "00:28–00:34", tone: "from-[#5e332b] via-[#202433] to-[#11131b]", width: 20 },
];

const initialMedia: Media[] = [
  { id: "m1", name: "signal-dawn.mp4", type: "VIDEO", color: "from-[#704328] to-[#16212c]", glyph: "01" },
  { id: "m2", name: "city-listens.mp4", type: "VIDEO", color: "from-[#184854] to-[#141b2a]", glyph: "02" },
  { id: "m3", name: "frequency-close.mp4", type: "VIDEO", color: "from-[#8e5f37] to-[#292538]", glyph: "03" },
  { id: "m4", name: "grain-overlay.mov", type: "OVERLAY", color: "from-[#3b3431] to-[#11131b]", glyph: "FX" },
  { id: "m5", name: "ambient-aurora.wav", type: "AUDIO", color: "from-[#15535b] to-[#121927]", glyph: "♪" },
  { id: "m6", name: "title-card.png", type: "IMAGE", color: "from-[#5f4a30] to-[#202232]", glyph: "T" },
];

const contextSections = [
  { title: "Josh", detail: "NBA Josh — the artist. Red-tipped dreads, dark brown eyes, calm fearless face.", tag: "CHARACTER" },
  { title: "Wet night street", detail: "Dark urban street at night, rain-slicked blacktop, overhead streetlights, red and blue police flashers.", tag: "LOCATION" },
];

const workflowOptions = [
  { label: "Start from an idea", detail: "Brief → script → first cut" },
  { label: "Script to video", detail: "Keep your script, build the world" },
  { label: "Turn this into a Short", detail: "Repurpose for Reels / TikTok" },
];

const projectTabs = ["Film", "Promo", "Performance Ad", "Product Ad", "Microdrama"];

const defaultPrompt =
  "Create a 35-second launch film for a new kind of city guide. Make it feel like the city is speaking directly to one curious person — tactile, nocturnal, quietly optimistic.";

const defaultRevision =
  "Make shot 03 feel more intimate. Bring the camera closer, deepen the amber light, and keep the voiceover exactly as it is.";

const initialMessages: AgentMessage[] = [
  {
    id: "agent-intro",
    role: "agent",
    text: "I'm your video director. Tell me what you want to make — the idea, who it's for, and roughly how long. I'll ask a couple of questions before I create anything.",
    meta: "ready",
  },
];

function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  const tenths = Math.floor((value % 1) * 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function IconButton({ label, children, onClick, active = false, testId }: { label: string; children: ReactNode; onClick?: () => void; active?: boolean; testId: string }) {
  return (
    <button
      aria-label={label}
      data-testid={testId}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-md border transition-colors ${active ? "border-primary/40 bg-primary/12 text-primary" : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function AuroraWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>("home");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [selectedClip, setSelectedClip] = useState("shot-03");
  const [clips, setClips] = useState(initialClips);
  const [media, setMedia] = useState(initialMedia);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(13.6);
  const [zoom, setZoom] = useState(1);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [revision, setRevision] = useState(defaultRevision);
  const [revisionApplied, setRevisionApplied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exported, setExported] = useState(false);
  const [renderQuality, setRenderQuality] = useState("4K");
  const [renderFormat, setRenderFormat] = useState("H.264");
  const [volume, setVolume] = useState(78);
  const [opacity, setOpacity] = useState(100);
  const [scale, setScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [xPosition, setXPosition] = useState(0);
  const [yPosition, setYPosition] = useState(0);
  const [mutedTracks, setMutedTracks] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [agentTab, setAgentTab] = useState<AgentTab>("context");
  const [activeProjectTab, setActiveProjectTab] = useState("Film");
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentStage, setAgentStage] = useState(0);
  const [messages, setMessages] = useState(initialMessages);
  const [rules, setRules] = useState("");
  const [rulesEditing, setRulesEditing] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [showMediaSearch, setShowMediaSearch] = useState(false);
  const [pastClips, setPastClips] = useState<Clip[][]>([]);
  const [futureClips, setFutureClips] = useState<Clip[][]>([]);
  const [renders, setRenders] = useState<Renders>({});
  const [shotPrompts, setShotPrompts] = useState<Record<string, { image: string; video: string }>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const activeClip = useMemo(() => clips.find((clip) => clip.id === selectedClip) ?? clips[0], [clips, selectedClip]);
  const filteredMedia = useMemo(() => media.filter((item) => item.name.toLowerCase().includes(mediaSearch.toLowerCase())), [media, mediaSearch]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTime((current) => (current >= 34 ? 0 : Number((current + 0.1).toFixed(1)))), 100);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);


  useEffect(() => {
    if (!exporting) return;
    const timer = window.setInterval(() => {
      setExportProgress((value) => {
        if (value >= 100) {
          window.clearInterval(timer);
          setExporting(false);
          setExported(true);
          setToast("Master render is ready to download.");
          return 100;
        }
        return Math.min(100, value + 4);
      });
    }, 120);
    return () => window.clearInterval(timer);
  }, [exporting]);

  function notify(message: string) {
    setToast(message);
  }

  function setClipsWithHistory(nextClips: Clip[]) {
    setPastClips((current) => [...current.slice(-19), clips]);
    setFutureClips([]);
    setClips(nextClips);
  }

  function undoTimeline() {
    const previous = pastClips[pastClips.length - 1];
    if (!previous) {
      notify("There are no more timeline changes to undo.");
      return;
    }
    setFutureClips((current) => [clips, ...current]);
    setPastClips((current) => current.slice(0, -1));
    setClips(previous);
    setSelectedClip(previous[0]?.id ?? "");
    notify("Last timeline change undone.");
  }

  function redoTimeline() {
    const next = futureClips[0];
    if (!next) {
      notify("There are no timeline changes to restore.");
      return;
    }
    setPastClips((current) => [...current, clips]);
    setFutureClips((current) => current.slice(1));
    setClips(next);
    setSelectedClip(next[0]?.id ?? "");
    notify("Timeline change restored.");
  }

  async function runAgent(nextPrompt = prompt) {
    const value = nextPrompt.trim();
    if (!value) {
      notify("Tell the agent what you want to make first.");
      return;
    }
    const history = [...messages, { id: `user-${Date.now()}`, role: "user" as MessageRole, text: value }];
    setMessages(history);
    setAgentRunning(true);
    setAgentStage(1);
    setWorkflowOpen(false);

    const memory = [
      rules.trim() && `RULES:\n${rules.trim()}`,
      contextSections.map((section) => `${section.tag} — ${section.title}: ${section.detail}`).join("\n"),
      `PROJECT TYPE: ${activeProjectTab}`,
    ].filter(Boolean).join("\n\n");

    try {
      const turn = await directorChat({
        data: {
          memory,
          messages: history.map((message) => ({ role: message.role === "user" ? ("user" as const) : ("assistant" as const), text: message.text })),
        },
      });

      setMessages((current) => [
        ...current,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          text: [turn.reply, ...(turn.readyToCreate ? [] : turn.questions.map((question) => `• ${question}`))].join("\n"),
          meta: turn.readyToCreate ? "shot list ready" : "gathering the brief",
        },
      ]);

      if (turn.readyToCreate && turn.shots.length) {
        const nextClips: Clip[] = turn.shots.map((shot, index) => ({
          id: `shot-${String(index + 1).padStart(2, "0")}`,
          label: `${String(index + 1).padStart(2, "0")}  —  ${shot.title}`,
          sub: `${Math.max(2, Math.round(shot.durationSeconds))}s · ${shot.description.slice(0, 48)}`,
          tone: initialClips[index % initialClips.length]?.tone ?? initialClips[0]!.tone,
          width: Math.max(10, Math.min(30, Math.round(shot.durationSeconds) * 3)),
        }));
        setClipsWithHistory(nextClips);
        setSelectedClip(nextClips[0]?.id ?? "");
        setShotPrompts(Object.fromEntries(turn.shots.map((shot, index) => [`shot-${String(index + 1).padStart(2, "0")}`, { image: shot.imagePrompt, video: shot.videoPrompt }])));
        setRenders({});
        setAgentTab("scenes");
        setAgentStage(4);
        notify("Shot list ready — render any shot as an image or a clip.");
      } else {
        setAgentStage(1);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Something went wrong.";
      setMessages((current) => [...current, { id: `agent-error-${Date.now()}`, role: "agent", text: detail, meta: "error" }]);
      notify(detail);
    } finally {
      setAgentRunning(false);
    }
  }

  async function renderShotImage(clipId: string) {
    const shot = shotPrompts[clipId];
    const clip = clips.find((item) => item.id === clipId);
    const promptText = shot?.image ?? `Cinematic still frame: ${clip?.label ?? ""} ${clip?.sub ?? ""}. ${prompt}`;
    setRenders((current) => ({ ...current, [clipId]: { ...current[clipId], status: "image" } }));
    try {
      const { imageUrl } = await generateImage({ data: { prompt: promptText } });
      setRenders((current) => ({ ...current, [clipId]: { ...current[clipId], status: "done", imageUrl } }));
      notify("Frame rendered.");
    } catch (error) {
      setRenders((current) => ({ ...current, [clipId]: { ...current[clipId], status: "idle", error: error instanceof Error ? error.message : "Image render failed." } }));
    }
  }

  async function renderShotVideo(clipId: string) {
    const shot = shotPrompts[clipId];
    const clip = clips.find((item) => item.id === clipId);
    const promptText = shot?.video ?? `${clip?.label ?? ""}: ${clip?.sub ?? ""}. ${prompt}`;
    setRenders((current) => ({ ...current, [clipId]: { ...current[clipId], status: "video", progress: 0 } }));
    try {
      const job = await startVideo({ data: { prompt: promptText } });
      let status = job.status;
      let guard = 0;
      while (status !== "completed" && status !== "failed" && guard < 90) {
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
        const next = await checkVideo({ data: { id: job.id } });
        status = next.status;
        setRenders((current) => ({ ...current, [clipId]: { ...current[clipId], status: "video", progress: next.progress } }));
        if (status === "failed") throw new Error(next.error || "The video provider could not finish this shot.");
        guard += 1;
      }
      if (status !== "completed") throw new Error("The shot is taking longer than expected. Try again in a moment.");
      setRenders((current) => ({ ...current, [clipId]: { ...current[clipId], status: "done", videoUrl: `/api/video/${job.id}` } }));
      notify("Clip rendered.");
    } catch (error) {
      setRenders((current) => ({ ...current, [clipId]: { ...current[clipId], status: "idle", error: error instanceof Error ? error.message : "Video render failed." } }));
    }
  }

  function startCreating(nextPrompt: string) {
    const value = nextPrompt.trim();
    if (!value) {
      notify("Describe the video you want the director to make.");
      return;
    }
    setPrompt(value);
    setMode("agent");
    void runAgent(value);
  }

  function applyRevision() {
    if (!revision.trim() || !activeClip) {
      notify("Select a shot and describe the revision first.");
      return;
    }
    const baseLabel = activeClip.label.split("  —  ")[0];
    setClipsWithHistory(clips.map((clip) => (clip.id === selectedClip ? { ...clip, label: `${baseLabel}  —  Intimate frequency`, state: "revised" } : clip)));
    setRevisionApplied(true);
    setMessages((current) => [
      ...current,
      {
        id: `revision-${Date.now()}`,
        role: "agent",
        text: `I revised ${baseLabel} in place. The rest of the timeline, voiceover, and captions stayed untouched.`,
        meta: "Agentic edit · shot preserved",
      },
    ]);
    notify(`${baseLabel} revised in place. Timeline and voice preserved.`);
  }

  function splitSelectedClip() {
    if (!activeClip) return;
    const index = clips.findIndex((clip) => clip.id === selectedClip);
    const first: Clip = { ...activeClip, id: `${activeClip.id}-a`, label: activeClip.label.replace("  —  ", "  —  A · "), sub: "split · 00:04", width: Math.max(8, activeClip.width * 0.48) };
    const second: Clip = { ...activeClip, id: `${activeClip.id}-b`, label: activeClip.label.replace("  —  ", "  —  B · "), sub: "split · 00:04", width: Math.max(8, activeClip.width * 0.48) };
    setClipsWithHistory([...clips.slice(0, index), first, second, ...clips.slice(index + 1)]);
    setSelectedClip(first.id);
    notify("Selected shot split into two editable clips.");
  }

  function duplicateSelectedClip() {
    if (!activeClip) return;
    const index = clips.findIndex((clip) => clip.id === selectedClip);
    const duplicate = { ...activeClip, id: `${activeClip.id}-copy-${Date.now()}`, label: `${activeClip.label} · copy`, state: "duplicate" };
    setClipsWithHistory([...clips.slice(0, index + 1), duplicate, ...clips.slice(index + 1)]);
    setSelectedClip(duplicate.id);
    notify("Shot duplicated and selected.");
  }

  function deleteSelectedClip() {
    if (!activeClip) return;
    if (clips.length === 1) {
      notify("Slate needs at least one video shot.");
      return;
    }
    const index = clips.findIndex((clip) => clip.id === selectedClip);
    const nextClips = clips.filter((clip) => clip.id !== selectedClip);
    setClipsWithHistory(nextClips);
    setSelectedClip(nextClips[Math.max(0, index - 1)]?.id ?? nextClips[0]?.id ?? "");
    notify(`${activeClip.label.split("  —  ")[0]} removed from the timeline.`);
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const added = files.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      name: file.name,
      type: file.type.includes("audio") ? "AUDIO" : file.type.includes("image") ? "IMAGE" : "VIDEO",
      color: file.type.includes("audio") ? "from-[#15535b] to-[#111827]" : file.type.includes("image") ? "from-[#6c4d55] to-[#252234]" : "from-[#5e4735] to-[#252234]",
      glyph: file.type.includes("audio") ? "♪" : file.type.includes("image") ? "IMG" : "UP",
    }));
    setMedia((current) => [...added, ...current]);
    notify(`${files.length} ${files.length === 1 ? "asset" : "assets"} added to your library.`);
    event.target.value = "";
  }

  function addMediaToTimeline(item: Media) {
    const id = `shot-${Date.now()}`;
    setClipsWithHistory([
      ...clips,
      { id, label: `${String(clips.length + 1).padStart(2, "0")}  —  ${item.name.replace(/\.[^/.]+$/, "")}`, sub: "new clip · 00:06", tone: item.color, width: 18 },
    ]);
    setSelectedClip(id);
    notify(`${item.name} added to the video track.`);
  }

  function startExport() {
    setExported(false);
    setExportProgress(0);
    setExporting(true);
    notify(`Preparing your ${renderQuality} ${renderFormat} master render…`);
  }

  function selectWorkflow(label: string) {
    if (label === "Turn this into a Short") {
      setPrompt("Repurpose the current film into three punchy vertical Shorts. Keep the strongest hook, captions, and the visual bible intact.");
    }
    setWorkflowOpen(false);
    notify(`${label} workflow selected.`);
  }

  function copyShareLink() {
    void navigator.clipboard?.writeText("filmstudio.ai/project/night-signal");
    notify("Share link copied to clipboard.");
  }

  const playhead = `${Math.min(100, Math.max(0, (time / 34) * 100))}%`;

  return (
    <div className="film-shell film-grain flex min-h-[100dvh] flex-col overflow-hidden">
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card/90 px-3 backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-3">
          <IconButton label="Open navigation" onClick={() => setMobileMenuOpen((open) => !open)} active={mobileMenuOpen} testId="button-open-navigation"><Menu size={18} /></IconButton>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="relative">
            <button onClick={() => setProjectMenuOpen((open) => !open)} data-testid="button-project-name" className="group flex items-center gap-2 text-left">
              <span className="grid h-7 w-7 place-items-center rounded bg-primary text-primary-foreground"><Clapperboard size={15} /></span>
              <span>
                <span className="block text-[11px] font-extrabold tracking-[.18em] text-foreground">FILMSTUDIO <span className="text-primary">AI</span></span>
                <span className="block text-[9px] uppercase tracking-[.18em] text-muted-foreground">Project / Night Signal</span>
              </span>
              <ChevronDown size={13} className="text-muted-foreground transition-transform group-hover:translate-y-0.5" />
            </button>
            {projectMenuOpen && (
              <div className="absolute left-0 top-11 z-40 w-56 rounded-lg border border-border bg-popover p-2 shadow-2xl">
                <p className="px-2 py-2 text-[10px] uppercase tracking-[.16em] text-muted-foreground">Current project</p>
                <button onClick={() => notify("Project name is ready to rename.")} data-testid="button-rename-project" className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-secondary"><FileText size={14} /> Rename Night Signal</button>
                <button onClick={() => notify("A duplicate project would keep the full production state.")} data-testid="button-duplicate-project" className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-secondary"><Copy size={14} /> Duplicate project</button>
                <button onClick={() => { setMode("home"); setProjectMenuOpen(false); }} data-testid="button-back-to-projects" className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-secondary"><FolderOpen size={14} /> Back to projects</button>
              </div>
            )}
          </div>
        </div>
        <div className="hidden items-center gap-1 rounded-lg border border-border/80 bg-secondary/45 p-1 md:flex">
          <button onClick={() => setMode("agent")} data-testid="button-switch-agent" className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold transition-all ${mode === "agent" ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Bot size={14} className={mode === "agent" ? "text-accent" : ""} /> Agent workspace
          </button>
          <button onClick={() => setMode("edit")} data-testid="button-switch-editor" className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold transition-all ${mode === "edit" ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Clapperboard size={14} className={mode === "edit" ? "text-primary" : ""} /> Slate editor
          </button>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="hidden items-center gap-1.5 text-[10px] uppercase tracking-[.14em] text-muted-foreground lg:flex">
            <span className="h-1.5 w-1.5 animate-[pulseDot_2s_ease-in-out_infinite] rounded-full bg-accent" /> autosaved just now
          </span>
          <IconButton label="Undo" onClick={undoTimeline} testId="button-undo"><Undo2 size={16} /></IconButton>
          <IconButton label="Redo" onClick={redoTimeline} testId="button-redo"><Redo2 size={16} /></IconButton>
          <button onClick={startExport} data-testid="button-export-header" className="flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">
            <ArrowDownToLine size={14} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => notify("Project settings opened.")} data-testid="button-settings" className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"><Settings2 size={16} /></button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="absolute left-3 top-14 z-40 w-60 rounded-b-lg border border-t-0 border-border bg-popover p-3 shadow-2xl md:hidden">
          <p className="px-2 py-2 text-[10px] uppercase tracking-[.16em] text-muted-foreground">Workspace</p>
          <button onClick={() => { setMode("home"); setMobileMenuOpen(false); }} data-testid="button-mobile-projects" className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-xs hover:bg-secondary"><FolderOpen size={15} /> Projects</button>
          <button onClick={() => { setMode("agent"); setMobileMenuOpen(false); }} data-testid="button-mobile-agent" className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-xs hover:bg-secondary"><Bot size={15} className="text-accent" /> Agent workspace</button>
          <button onClick={() => { setMode("edit"); setMobileMenuOpen(false); }} data-testid="button-mobile-editor" className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-xs hover:bg-secondary"><Clapperboard size={15} className="text-primary" /> Slate editor</button>
          <button onClick={() => { notify("Template browser opened."); setMobileMenuOpen(false); }} data-testid="button-mobile-templates" className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-xs hover:bg-secondary"><LayoutTemplate size={15} /> Templates</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="hidden w-[66px] shrink-0 flex-col items-center border-r border-border bg-sidebar py-4 md:flex">
          <div className="flex flex-1 flex-col items-center gap-2">
            <IconButton label="Projects" active={mode === "home"} onClick={() => setMode("home")} testId="button-sidebar-projects"><FolderOpen size={18} /></IconButton>
            <IconButton label="Agent workspace" active={mode === "agent"} onClick={() => setMode("agent")} testId="button-sidebar-agent"><Bot size={18} /></IconButton>
            <IconButton label="Slate editor" active={mode === "edit"} onClick={() => setMode("edit")} testId="button-sidebar-editor"><Clapperboard size={18} /></IconButton>
            <div className="my-2 h-px w-7 bg-border" />
            <IconButton label="Media library" onClick={() => { setMode("edit"); notify("Media library is open below."); }} testId="button-sidebar-media"><HardDriveUpload size={18} /></IconButton>
            <IconButton label="Templates" onClick={() => notify("Template browser opened.")} testId="button-sidebar-templates"><LayoutTemplate size={18} /></IconButton>
            <IconButton label="Audio" onClick={() => { setMode("edit"); notify("Audio track selected."); }} testId="button-sidebar-audio"><Music2 size={18} /></IconButton>
          </div>
          <IconButton label="Help" onClick={() => notify("FilmStudio help center opened.")} testId="button-sidebar-help"><CircleHelp size={18} /></IconButton>
        </aside>
        <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {mode === "home" ? (
            <HomeWorkspace startCreating={startCreating} notify={notify} />
          ) : mode === "agent" ? (
            <AgentWorkspace
              prompt={prompt} setPrompt={setPrompt} setMode={setMode} agentTab={agentTab} setAgentTab={setAgentTab}
              activeProjectTab={activeProjectTab} setActiveProjectTab={setActiveProjectTab} agentRunning={agentRunning}
              agentStage={agentStage} messages={messages} runAgent={runAgent} rules={rules} setRules={setRules}
              rulesEditing={rulesEditing} setRulesEditing={setRulesEditing} clips={clips} selectedClip={selectedClip}
              setSelectedClip={setSelectedClip} workflowOpen={workflowOpen} setWorkflowOpen={setWorkflowOpen}
              selectWorkflow={selectWorkflow} notify={notify} startExport={startExport}
            />
          ) : (
            <EditorWorkspace
              clips={clips} media={filteredMedia} selectedClip={selectedClip} setSelectedClip={setSelectedClip}
              activeClip={activeClip} playing={playing} setPlaying={setPlaying} time={time} setTime={setTime}
              playhead={playhead} zoom={zoom} setZoom={setZoom} inspectorOpen={inspectorOpen} setInspectorOpen={setInspectorOpen}
              volume={volume} setVolume={setVolume} opacity={opacity} setOpacity={setOpacity} scale={scale} setScale={setScale}
              rotation={rotation} setRotation={setRotation} xPosition={xPosition} setXPosition={setXPosition}
              yPosition={yPosition} setYPosition={setYPosition} mutedTracks={mutedTracks} setMutedTracks={setMutedTracks}
              fileRef={fileRef} handleFiles={handleFiles} addMediaToTimeline={addMediaToTimeline} revision={revision}
              setRevision={setRevision} applyRevision={applyRevision} revisionApplied={revisionApplied} startExport={startExport}
              exporting={exporting} exportProgress={exportProgress} exported={exported} renderQuality={renderQuality}
              setRenderQuality={setRenderQuality} renderFormat={renderFormat} setRenderFormat={setRenderFormat} notify={notify}
              onSplit={splitSelectedClip} onDuplicate={duplicateSelectedClip} onDelete={deleteSelectedClip}
              onUndo={undoTimeline} onRedo={redoTimeline} copyShareLink={copyShareLink} mediaSearch={mediaSearch}
              setMediaSearch={setMediaSearch} showMediaSearch={showMediaSearch} setShowMediaSearch={setShowMediaSearch}
            />
          )}
        </main>
      </div>
      <input ref={fileRef} type="file" multiple accept="video/*,audio/*,image/*" onChange={handleFiles} className="hidden" data-testid="input-media-file" />
      {toast && (
        <div data-testid="status-toast" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/30 bg-accent/15 px-4 py-2.5 text-xs font-semibold text-accent-foreground shadow-2xl">
          <Check size={14} /> {toast}
        </div>
      )}
    </div>
  );
}

function HomeWorkspace({ startCreating, notify }: { startCreating: (prompt: string) => void; notify: (message: string) => void }) {
  const [idea, setIdea] = useState("");
  const examples = [
    "Create a 30-second cinematic launch film for a new streetwear label.",
    "Turn this product brief into a punchy vertical ad with captions.",
    "Make a documentary-style video about the future of cities.",
  ];

  function submitIdea() {
    startCreating(idea);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitIdea();
    }
  }

  return (
    <section className="relative min-h-[calc(100dvh-56px)] overflow-hidden bg-background px-4 py-10 sm:px-8 lg:px-14 lg:py-16">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/35 bg-primary/15 px-3 py-1.5 text-[10px] font-semibold text-primary">
            <Sparkles size={12} /> Meet Agent Two
          </div>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-.055em] text-foreground sm:text-6xl lg:text-7xl">
            Make the video.<br /><span className="text-primary">Agent Two handles the rest.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Start with an idea, a script, or a brief. Your agent builds the story, finds the assets, and gives you every scene back editable.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border bg-card/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-md">
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to create?"
            data-testid="input-create-idea"
            className="min-h-28 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-2 pt-3">
            <div className="flex items-center gap-2">
              <button onClick={() => notify("Reference upload is ready for your brief.")} data-testid="button-home-attach" className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"><Plus size={15} /></button>
              <button onClick={() => notify("Choose a workflow after you describe your idea.")} data-testid="button-home-workflow" className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground"><WandSparkles size={12} /> Workflow <ChevronDown size={11} /></button>
            </div>
            <button onClick={submitIdea} data-testid="button-start-creating" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40" disabled={!idea.trim()}>
              Start creating <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
          {examples.map((example, index) => (
            <button key={example} onClick={() => setIdea(example)} data-testid={`button-example-${index}`} className="rounded-full border border-border bg-secondary/50 px-3 py-2 text-[10px] text-muted-foreground transition-colors hover:border-border/40 hover:bg-primary/10 hover:text-foreground/80">
              {example}
            </button>
          ))}
        </div>

        <div className="mt-16 overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-2">
            {projectTabs.map((tab, index) => (
              <button key={tab} onClick={() => notify(`${tab} project template selected.`)} data-testid={`button-home-project-${index}`} className={`flex shrink-0 items-center gap-2 px-4 py-3 text-[10px] ${index === 0 ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <FileText size={12} /> {tab}
              </button>
            ))}
            <Plus size={14} className="ml-2 text-muted-foreground" />
          </div>
          <div className="grid gap-6 p-5 md:grid-cols-[.8fr_1.2fr] md:p-7">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><span className="grid h-7 w-7 place-items-center rounded-full bg-primary"><Bot size={14} /></span> Agent Two</div>
              <p className="mt-4 max-w-xs text-xs leading-5 text-muted-foreground">Describe a video and Agent Two turns your intent into a script, scenes, voice, music, and a cut you can still change.</p>
              <div className="mt-5 flex items-center gap-2 text-[10px] text-muted-foreground"><Check size={13} className="text-primary" /> Context stays attached to every scene</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {initialClips.slice(0, 4).map((clip, index) => (
                <div key={clip.id} className={`relative aspect-video overflow-hidden rounded-md bg-gradient-to-br ${clip.tone}`}>
                  <div className="absolute inset-0 bg-black/20" />
                  <span className="absolute left-2 top-2 mono text-[8px] text-foreground/75">SCENE {String(index + 1).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentWorkspace({
  prompt, setPrompt, setMode, agentTab, setAgentTab, activeProjectTab, setActiveProjectTab, agentRunning,
  agentStage, messages, runAgent, rules, setRules, rulesEditing, setRulesEditing, clips, selectedClip,
  setSelectedClip, workflowOpen, setWorkflowOpen, selectWorkflow, notify, startExport,
}: {
  prompt: string; setPrompt: (value: string) => void; setMode: (mode: WorkspaceMode) => void;
  agentTab: AgentTab; setAgentTab: (tab: AgentTab) => void; activeProjectTab: string;
  setActiveProjectTab: (tab: string) => void; agentRunning: boolean; agentStage: number;
  messages: AgentMessage[]; runAgent: (nextPrompt?: string) => void; rules: string;
  setRules: (value: string) => void; rulesEditing: boolean; setRulesEditing: (value: boolean) => void;
  clips: Clip[]; selectedClip: string; setSelectedClip: (id: string) => void; workflowOpen: boolean;
  setWorkflowOpen: (value: boolean) => void; selectWorkflow: (label: string) => void;
  notify: (message: string) => void; startExport: () => void;
}) {
  const [composer, setComposer] = useState("");
  const [composerFiles, setComposerFiles] = useState<string[]>([]);
  const composerFileRef = useRef<HTMLInputElement>(null);
  void prompt;

  function submitComposer() {
    const value = composer.trim();
    if (!value) return;
    setPrompt(value);
    setComposer("");
    runAgent(value);
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitComposer();
    }
  }

  function addReferenceFiles(event: ChangeEvent<HTMLInputElement>) {
    const names = Array.from(event.target.files ?? []).map((file) => file.name);
    setComposerFiles((current) => [...current, ...names]);
    if (names.length) notify(`${names.length} reference${names.length === 1 ? "" : "s"} attached to the next run.`);
    event.target.value = "";
  }

  return (
    <section className="mx-auto max-w-[1280px] px-4 py-5 sm:px-8 lg:py-7">
      <div className="mb-5 overflow-x-auto rounded-t-xl border border-border bg-card">
        <div className="flex min-w-max items-center">
          {projectTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveProjectTab(tab); notify(`${tab} project view selected.`); }}
              data-testid={`button-project-tab-${tab.toLowerCase().replace(/\W+/g, "-")}`}
              className={`flex items-center gap-2 border-r border-border px-4 py-3 text-[10px] font-semibold transition-colors ${activeProjectTab === tab ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
            >
              <FileText size={12} className={activeProjectTab === tab ? "text-primary" : ""} />
              {tab}
            </button>
          ))}
          <button onClick={() => notify("New project created from this workspace.")} data-testid="button-new-project-tab" className="grid h-10 w-10 place-items-center text-muted-foreground hover:bg-secondary/60 hover:text-foreground" aria-label="Create a new project"><Plus size={15} /></button>
          <div className="ml-auto hidden items-center gap-1 px-3 sm:flex">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[9px] font-bold text-foreground">A</span>
            <span className="grid h-6 w-6 -ml-2 place-items-center rounded-full bg-accent text-[9px] font-bold text-primary-foreground">Y</span>
          </div>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => notify("Back to projects is ready.")} data-testid="button-back-projects" className="grid h-8 w-8 place-items-center rounded border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft size={15} /></button>
          <div>
            <p className="mono text-[9px] uppercase tracking-[.2em] text-primary">Agent Two / individual video agent</p>
            <h1 className="mt-1 text-sm font-bold">Night Signal <span className="ml-2 text-xs font-normal text-muted-foreground">· individual video agent</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-accent/20 bg-accent/8 px-2.5 py-1.5 text-[10px] text-accent sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> context synced</span>
          <button onClick={() => notify("Project memory is always available in Context.")} data-testid="button-project-memory" className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-[10px] uppercase tracking-[.14em] text-muted-foreground hover:text-foreground"><Braces size={14} className="text-accent" /> <span className="hidden sm:inline">Project memory</span></button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-1 overflow-x-auto border-b border-border">
            <button onClick={() => setAgentTab("context")} data-testid="button-agent-context-tab" className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${agentTab === "context" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Braces size={14} className={agentTab === "context" ? "text-accent" : ""} /> Context
            </button>
            <button onClick={() => setAgentTab("notebook")} data-testid="button-agent-notebook-tab" className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${agentTab === "notebook" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <FileText size={14} className={agentTab === "notebook" ? "text-primary" : ""} /> Notebook · Page 1
            </button>
            <button onClick={() => setAgentTab("scenes")} data-testid="button-agent-scenes-tab" className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${agentTab === "scenes" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Clapperboard size={14} className={agentTab === "scenes" ? "text-primary" : ""} /> Scenes
            </button>
            <button onClick={() => setAgentTab("final")} data-testid="button-agent-final-tab" className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${agentTab === "final" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Film size={14} className={agentTab === "final" ? "text-accent" : ""} /> Final
            </button>
            <button onClick={() => notify("New notebook page created.")} data-testid="button-new-notebook-page" className="ml-auto grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"><Plus size={15} /></button>
          </div>

          {agentTab === "context" && <ContextView rules={rules} setRules={setRules} rulesEditing={rulesEditing} setRulesEditing={setRulesEditing} notify={notify} />}
          {agentTab === "notebook" && <NotebookView agentRunning={agentRunning} agentStage={agentStage} notify={notify} />}
          {agentTab === "scenes" && <ScenesView clips={clips} selectedClip={selectedClip} setSelectedClip={setSelectedClip} setMode={setMode} notify={notify} />}
          {agentTab === "final" && <FinalView clips={clips} startExport={startExport} setMode={setMode} notify={notify} />}

          <div className="mt-5 rounded-xl border border-border bg-card shadow-md">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-muted-foreground"><Sparkles size={13} className="text-primary" /> Agent conversation</div>
              <span className="mono text-[9px] text-muted-foreground">{agentRunning ? "working" : "ready"}</span>
            </div>
            <div className="max-h-52 space-y-3 overflow-y-auto p-4">
              {messages.slice(-4).map((message) => (
                <div key={message.id} data-testid={`message-agent-${message.id}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                  {message.role === "agent" && <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/20/20 text-accent"><Bot size={13} /></span>}
                  <div className={`max-w-[82%] rounded-lg px-3 py-2.5 text-xs leading-5 ${message.role === "user" ? "bg-secondary text-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <p>{message.text}</p>
                    {message.meta && <p className="mono mt-1.5 text-[8px] uppercase tracking-[.12em] text-muted-foreground/70">{message.meta}</p>}
                  </div>
                </div>
              ))}
              {agentRunning && <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Agent Two is making production decisions…</div>}
            </div>
            <div className="border-t border-border/70 p-3">
              {composerFiles.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{composerFiles.map((file) => <span key={file} className="rounded-full border border-accent/25 bg-accent/8 px-2 py-1 text-[9px] text-accent">{file}</span>)}</div>}
              <div className="flex items-end gap-2 rounded-lg border border-border bg-background p-2">
                <button onClick={() => composerFileRef.current?.click()} data-testid="button-attach-reference" className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"><Plus size={16} /></button>
                <textarea value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Tell me what to change, make, or keep…" data-testid="input-agent-composer" className="max-h-24 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-xs leading-5 text-foreground outline-none placeholder:text-muted-foreground" />
                <button onClick={submitComposer} disabled={agentRunning || !composer.trim()} data-testid="button-send-agent-message" className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} /></button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="relative">
                  <button onClick={() => setWorkflowOpen(!workflowOpen)} data-testid="button-agent-workflows" className="flex items-center gap-2 rounded border border-border px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground"><WandSparkles size={12} className="text-primary" /> Workflows <ChevronDown size={11} /></button>
                  {workflowOpen && <div className="absolute bottom-9 left-0 z-30 w-64 rounded-lg border border-border bg-popover p-2 shadow-2xl">{workflowOptions.map((workflow) => <button key={workflow.label} onClick={() => selectWorkflow(workflow.label)} data-testid={`button-workflow-${workflow.label.toLowerCase().replace(/\W+/g, "-")}`} className="w-full rounded px-2.5 py-2 text-left hover:bg-secondary"><span className="block text-xs font-semibold">{workflow.label}</span><span className="mt-1 block text-[10px] text-muted-foreground">{workflow.detail}</span></button>)}</div>}
                </div>
                <div className="flex items-center gap-2"><span className="hidden text-[10px] text-muted-foreground sm:inline">Agent Two Pro</span><button onClick={() => notify("Agent settings opened.")} data-testid="button-agent-settings" className="text-muted-foreground hover:text-foreground"><Settings2 size={13} /></button></div>
              </div>
              <input ref={composerFileRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.txt" onChange={addReferenceFiles} className="hidden" data-testid="input-agent-reference" />
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card/70 p-5">
          <div className="mb-5 flex items-center justify-between"><div><p className="mono text-[9px] uppercase tracking-[.19em] text-accent">Production loop</p><h2 className="mt-1 text-sm font-bold">Your project, in motion</h2></div><Activity size={17} className="text-accent" /></div>
          <div className="space-y-1">
            {["Brief", "Script", "Storyboard", "Assets", "Generation", "Edit"].map((label, index) => {
              const done = index < agentStage || (!agentRunning && index < 4);
              const active = agentRunning && index === agentStage;
              return (
                <button key={label} onClick={() => notify(`${label} stage selected.`)} data-testid={`button-agent-step-${label.toLowerCase()}`} className="group flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-secondary/70">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${done ? "border-accent/50 bg-accent/12 text-accent" : active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{done ? <Check size={12} /> : String(index + 1).padStart(2, "0")}</span>
                  <span className={`text-xs ${active ? "font-bold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{label}</span>
                  {active && <span className="ml-auto rounded-full bg-primary/12 px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary">working</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-5 border-t border-border pt-4"><p className="text-xs leading-5 text-muted-foreground">The agent can search stock, select models, preserve your visual bible, and revise only the shots that need attention.</p><button onClick={() => setMode("edit")} data-testid="button-open-slate" className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/8 py-2.5 text-xs font-bold text-accent transition-colors hover:bg-accent/15">Open editable Slate <ArrowRight size={14} /></button></div>
        </aside>
      </div>
    </section>
  );
}

function ContextView({ rules, setRules, rulesEditing, setRulesEditing, notify }: { rules: string; setRules: (value: string) => void; rulesEditing: boolean; setRulesEditing: (value: boolean) => void; notify: (message: string) => void }) {
  return (
    <div className="space-y-7">
      <section className="reveal">
        <p className="mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">Context / About this project</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-foreground sm:text-4xl">About this project</h2>
        <div className="mt-3 flex items-start gap-3 border-t border-border pt-4"><MessageSquareText size={16} className="mt-0.5 shrink-0 text-muted-foreground" /><p className="max-w-2xl text-xs leading-5 text-muted-foreground">This helps the agent understand the big picture. Give it the audience, the intent, and the rules that should remain true across every generation.</p></div>
      </section>
      <section className="reveal reveal-delay-1">
        <label htmlFor="context-description" className="mono text-[9px] uppercase tracking-[.18em] text-muted-foreground">Description</label>
        <input id="context-description" defaultValue="NBA Josh — The One Hook" data-testid="input-context-description" className="mt-2 w-full border-b border-border bg-transparent pb-2 text-sm font-bold text-foreground outline-none focus:border-primary" />
        <p className="mt-4 max-w-3xl text-xs leading-6 text-muted-foreground">25-second 16:9 cinematic lip-sync for NBA Josh, Out The Mud Records. Track: The One Hook (24.35s) at <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-foreground">SEQ 1.1</span>.</p>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-muted-foreground">The one idea: Josh performs the hook, calm, on a wet night street, while police officers loop endlessly behind him and never catch up. He glances back once, smirks, walks off.</p>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">Sunglasses off. Josh bottom-right, officers upper-left, empty center.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">Brief: <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-foreground">NBA Josh — The One Hook</span> Artist lore: <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-foreground">SEQ 2.1</span></div>
      </section>
      <section className="rounded-xl border border-border bg-card/75 p-4 sm:p-5">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Briefs</h3><button onClick={() => notify("Brief context is already pinned to this project.")} data-testid="button-pin-brief" className="text-muted-foreground hover:text-foreground"><LockKeyhole size={14} /></button></div>
        <p className="mono mt-4 text-[9px] uppercase tracking-[.16em] text-muted-foreground">Brief</p>
        <p className="mt-2 text-sm font-semibold">NBA Josh — The One Hook</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">25s 16:9 cinematic lip-sync. Josh performs the hook on a wet night street while the world loops behind him.</p>
      </section>
      <section>
        <div className="flex items-center justify-between border-b border-border pb-3"><h2 className="text-2xl font-semibold tracking-[-.03em]">invideo rules</h2><button onClick={() => setRulesEditing(!rulesEditing)} data-testid="button-edit-rules" className="text-[10px] uppercase tracking-[.14em] text-muted-foreground hover:text-foreground">{rulesEditing ? "Done" : "Edit"}</button></div>
        {rulesEditing ? <textarea value={rules} onChange={(event) => setRules(event.target.value)} placeholder="Set a default tone, pacing, audience, format, or any rules you want followed." data-testid="input-invideo-rules" className="mt-3 min-h-24 w-full resize-y rounded-md border border-border bg-card p-3 text-xs leading-5 outline-none focus:border-primary" /> : <p className="mt-4 text-xs leading-5 text-muted-foreground">{rules || "Nothing here yet."}</p>}
        {!rulesEditing && <p className="mt-4 flex items-start gap-3 text-xs italic leading-5 text-muted-foreground"><SlidersHorizontal size={14} className="mt-0.5 shrink-0 not-italic" />The more the agent knows, the better it creates. Set your default tone, pacing, audience, format, or any rules you want followed. You can always override per prompt.</p>}
      </section>
      <section>
        <div className="flex items-center justify-between border-b border-border pb-3"><h2 className="text-2xl font-semibold tracking-[-.03em]">World</h2><button onClick={() => notify("Add a character, location, wardrobe, or visual rule to the world.")} data-testid="button-add-world-item" className="flex items-center gap-1.5 text-[10px] uppercase tracking-[.14em] text-muted-foreground hover:text-foreground"><Plus size={13} /> Add</button></div>
        <div className="mt-4 space-y-3">{contextSections.map((section) => <button key={section.title} onClick={() => notify(`${section.title} context opened.`)} data-testid={`button-world-${section.title.toLowerCase().replace(/\s+/g, "-")}`} className="w-full rounded-xl border border-border bg-card/75 p-4 text-left transition-colors hover:border-accent/40"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">{section.title}</h3><span className="mono text-[8px] uppercase tracking-[.16em] text-muted-foreground">{section.tag}</span></div><div className="mt-2 h-px bg-border" /><p className="mt-3 text-xs leading-5 text-muted-foreground">{section.detail}</p><div className="mt-3 flex items-center gap-2 text-[10px] text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> continuity locked <ChevronRight size={12} className="ml-auto" /></div></button>)}</div>
      </section>
    </div>
  );
}

function NotebookView({ agentRunning, agentStage, notify }: { agentRunning: boolean; agentStage: number; notify: (message: string) => void }) {
  const notebookItems = [
    { title: "Treatment", body: "One artist. One continuous mix. The world keeps moving while Josh stays calm.", state: "approved" },
    { title: "Shot 01 — The signal", body: "Wide wet street. Police lights loop behind Josh. Hold the empty center.", state: agentStage >= 1 ? "approved" : "ready" },
    { title: "Shot 02 — The hook", body: "Move into a low-angle portrait. Match the red-tipped dreads and jewelry from World.", state: agentStage >= 2 ? "approved" : "ready" },
    { title: "Shot 03 — The glance", body: "A single glance back to camera. Keep the voiceover and performance timing intact.", state: agentStage >= 3 ? "approved" : "needs review" },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card/70 p-5">
        <div className="flex items-center justify-between"><div><p className="mono text-[9px] uppercase tracking-[.18em] text-primary">Notebook / Page 1</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">The One Hook</h2></div><button onClick={() => notify("Notebook page downloaded.")} data-testid="button-download-notebook" className="grid h-8 w-8 place-items-center rounded border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"><Download size={14} /></button></div>
        <p className="mt-4 max-w-xl text-xs leading-5 text-muted-foreground">A working production document the agent can read, revise, and hand back to the editable Slate without losing context.</p>
      </div>
      <div className="space-y-3">
        {notebookItems.map((item) => (
          <button key={item.title} onClick={() => notify(`${item.title} selected in Notebook.`)} data-testid={`button-notebook-${item.title.toLowerCase().replace(/\W+/g, "-")}`} className="w-full rounded-lg border border-border bg-card/55 p-4 text-left hover:border-primary/40">
            <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">{item.title}</h3><span className={`rounded-full px-2 py-1 text-[9px] uppercase tracking-[.12em] ${item.state === "approved" ? "bg-accent/12 text-accent" : item.state === "needs review" ? "bg-primary/12 text-primary" : "bg-secondary text-muted-foreground"}`}>{item.state}</span></div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.body}</p>
          </button>
        ))}
      </div>
      {agentRunning && <div className="flex items-center gap-2 rounded-md border border-primary/25 bg-primary/8 px-3 py-2 text-xs text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Updating Notebook from the current run…</div>}
      <button onClick={() => notify("Notebook changes approved and sent back to the agent.")} data-testid="button-approve-notebook" className="flex w-full items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/8 py-2.5 text-xs font-bold text-accent hover:bg-accent/15"><Check size={14} /> Approve notebook changes</button>
    </div>
  );
}

function ScenesView({ clips, selectedClip, setSelectedClip, setMode, notify }: { clips: Clip[]; selectedClip: string; setSelectedClip: (id: string) => void; setMode: (mode: WorkspaceMode) => void; notify: (message: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">Agent Two / Scenes</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-.03em]">Your film, scene by scene</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">Review the generated cut, select a scene to revise, or open it in Slate for frame-accurate editing.</p>
        </div>
        <span className="rounded-full border border-accent/20 bg-accent/8 px-2.5 py-1.5 text-[10px] text-accent">{clips.length} editable scenes</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {clips.map((clip, index) => (
          <button
            key={clip.id}
            onClick={() => { setSelectedClip(clip.id); notify(`${clip.label.split("  —  ")[0]} selected for review.`); }}
            data-testid={`button-scene-card-${clip.id}`}
            className={`group overflow-hidden rounded-xl border text-left transition-all hover:-translate-y-0.5 ${selectedClip === clip.id ? "border-primary/70 bg-primary/6 shadow-lg shadow-primary/5" : "border-border bg-card/70 hover:border-accent/40"}`}
          >
            <div className={`relative aspect-video bg-gradient-to-br ${clip.tone}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(244,190,108,.35),transparent_20%),linear-gradient(135deg,transparent,rgba(5,8,14,.6))]" />
              <span className="absolute left-3 top-3 rounded bg-background/70 px-2 py-1 mono text-[9px] text-foreground">SCENE {String(index + 1).padStart(2, "0")}</span>
              <span className="absolute bottom-3 right-3 rounded bg-background/70 px-2 py-1 mono text-[9px] text-foreground">{clip.sub}</span>
              <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100"><Play size={28} className="text-primary" /></span>
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className="text-xs font-bold text-foreground">{clip.label.replace(/^\d+\s+—\s+/, "")}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{clip.state ? `Agentic edit · ${clip.state}` : "Generated from project context"}</p>
              </div>
              <ChevronRight size={15} className="shrink-0 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/55 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles size={14} className="text-primary" /> Select a scene to keep the rest of the production intact.</div>
        <button onClick={() => setMode("edit")} data-testid="button-scenes-open-slate" className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/8 px-3 py-2 text-xs font-bold text-accent hover:bg-accent/15">Open in Slate <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

function FinalView({ clips, startExport, setMode, notify }: { clips: Clip[]; startExport: () => void; setMode: (mode: WorkspaceMode) => void; notify: (message: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">Agent Two / Final</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-.03em]">Ready for your final pass?</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">The agent keeps the project editable until you approve the cut. Export a master or return to Slate for a precise adjustment.</p>
        </div>
        <span className="rounded-full border border-accent/20 bg-accent/8 px-2.5 py-1.5 text-[10px] text-accent">Context preserved</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="relative aspect-video bg-[radial-gradient(circle_at_65%_30%,rgba(208,146,64,.5),transparent_18%),linear-gradient(135deg,#34291e,#101722_54%,#162d35)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_25%,rgba(0,0,0,.45))]" />
          <div className="absolute bottom-5 left-5">
            <p className="mono text-[9px] uppercase tracking-[.2em] text-primary">Night Signal</p>
            <p className="mt-1 text-lg font-bold">The One Hook</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{clips.length} scenes · 00:34 · 16:9 cinematic</p>
          </div>
          <button onClick={() => notify("Preview playback started.")} data-testid="button-final-preview" className="absolute inset-0 m-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105"><Play size={20} fill="currentColor" /></button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Check size={13} className="text-accent" /> Voice, captions, music, and continuity checked</div>
          <div className="flex gap-2">
            <button onClick={() => setMode("edit")} data-testid="button-final-edit" className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">Edit in Slate</button>
            <button onClick={startExport} data-testid="button-final-export" className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><ArrowDownToLine size={14} /> Export master</button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Visual bible", "Locked", "text-accent"], ["Audio mix", "Ready", "text-accent"], ["Export", "4K H.264", "text-primary"]].map(([label, value, color]) => (
          <div key={label} className="rounded-lg border border-border bg-card/60 p-4">
            <p className="mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">{label}</p>
            <p className={`mt-2 text-sm font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type EditorProps = {
  clips: Clip[]; media: Media[]; selectedClip: string; setSelectedClip: (id: string) => void; activeClip: Clip | undefined;
  playing: boolean; setPlaying: (value: boolean) => void; time: number; setTime: (value: number) => void;
  playhead: string; zoom: number; setZoom: (value: number) => void; inspectorOpen: boolean;
  setInspectorOpen: (value: boolean) => void; volume: number; setVolume: (value: number) => void; opacity: number;
  setOpacity: (value: number) => void; scale: number; setScale: (value: number) => void; rotation: number;
  setRotation: (value: number) => void; xPosition: number; setXPosition: (value: number) => void; yPosition: number;
  setYPosition: (value: number) => void; mutedTracks: string[]; setMutedTracks: (value: string[]) => void;
  fileRef: React.RefObject<HTMLInputElement | null>; handleFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  addMediaToTimeline: (item: Media) => void; revision: string; setRevision: (value: string) => void;
  applyRevision: () => void; revisionApplied: boolean; startExport: () => void; exporting: boolean;
  exportProgress: number; exported: boolean; renderQuality: string; setRenderQuality: (value: string) => void;
  renderFormat: string; setRenderFormat: (value: string) => void; notify: (message: string) => void;
  onSplit: () => void; onDuplicate: () => void; onDelete: () => void; onUndo: () => void; onRedo: () => void;
  copyShareLink: () => void; mediaSearch: string; setMediaSearch: (value: string) => void;
  showMediaSearch: boolean; setShowMediaSearch: (value: boolean) => void;
};

function EditorWorkspace(props: EditorProps) {
  const {
    clips, media, selectedClip, setSelectedClip, activeClip, playing, setPlaying, time, setTime, zoom, setZoom,
    inspectorOpen, setInspectorOpen, volume, setVolume, opacity, setOpacity, scale, setScale, rotation, setRotation,
    xPosition, setXPosition, yPosition, setYPosition, mutedTracks, setMutedTracks, fileRef, addMediaToTimeline,
    revision, setRevision, applyRevision, revisionApplied, startExport, exporting, exportProgress, exported,
    renderQuality, setRenderQuality, renderFormat, setRenderFormat, notify, onSplit, onDuplicate, onDelete,
    onUndo, onRedo, copyShareLink, mediaSearch, setMediaSearch, showMediaSearch, setShowMediaSearch,
  } = props;

  const safeClip = activeClip ?? clips[0];
  const toggleTrack = (track: string) => setMutedTracks(mutedTracks.includes(track) ? mutedTracks.filter((item) => item !== track) : [...mutedTracks, track]);

  return (
    <section className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
        <div><p className="mono text-[9px] uppercase tracking-[.2em] text-primary">Slate / sequence 01</p><h1 className="mt-1 text-sm font-bold">Night Signal <span className="ml-2 text-xs font-normal text-muted-foreground">· 00:34 · 16:9</span></h1></div>
        <div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 rounded-full border border-accent/20 bg-accent/8 px-2.5 py-1.5 text-[10px] text-accent sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> agent + editor synced</span><button onClick={copyShareLink} data-testid="button-share-project" className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"><Copy size={13} /> Share</button><button onClick={startExport} data-testid="button-export-editor" className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><ArrowDownToLine size={14} /> Export</button></div>
      </div>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="grid gap-3 bg-background p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-6">
            <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-card shadow-md">
              <div className={`absolute inset-0 bg-gradient-to-br ${safeClip?.tone ?? "from-[#2a3340] to-[#10131b]"}`} />
              <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(ellipse at 65% 35%, rgba(244,181,82,.55), transparent 26%), linear-gradient(120deg, transparent 40%, rgba(8,13,18,.75) 73%)" }} />
              <div className="absolute inset-0 bg-[linear-gradient(transparent_49.5%,rgba(255,255,255,.06)_50%,transparent_50.5%),linear-gradient(90deg,transparent_49.5%,rgba(255,255,255,.06)_50%,transparent_50.5%)] opacity-50" />
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded bg-background/70 px-2 py-1 text-[9px] uppercase tracking-[.16em] text-muted-foreground backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> preview / {safeClip?.id.replace("shot-", "shot ")}</div>
              <div className="absolute inset-0 flex items-center justify-center"><span className="grid h-16 w-16 place-items-center rounded-full border border-border/25 bg-background/20 text-foreground/80 backdrop-blur-sm">{playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}</span></div>
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between bg-gradient-to-t from-[#080a0e]/90 to-transparent p-4 pt-12"><div><p className="mono text-[9px] uppercase tracking-[.15em] text-primary">Current frame</p><p className="mt-1 max-w-sm text-sm font-semibold text-foreground">{safeClip?.label.split("  —  ")[1]}</p></div><span className="mono text-xs text-foreground">{formatTime(time)} / 00:34</span></div>
              <span className="absolute bottom-14 left-[49%] h-10 w-px bg-primary/80" />
            </div>
            <div className="flex aspect-video flex-col justify-between rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between"><span className="mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">Shot notes</span><button onClick={() => notify("Shot notes copied.")} data-testid="button-copy-shot-notes" className="text-muted-foreground hover:text-foreground"><Copy size={13} /></button></div>
              <div><p className="text-sm font-bold leading-5">{safeClip?.label.split("  —  ")[1]}</p><p className="mt-2 text-[11px] leading-5 text-muted-foreground">35mm / low angle / slow track<br />Amber practicals · shallow depth</p></div>
              <div className="flex items-center gap-2 text-[10px] text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> continuity approved</div>
            </div>
          </div>

          <div className="border-y border-border bg-card px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <IconButton label="Previous frame" onClick={() => setTime(Math.max(0, time - 0.5))} testId="button-previous-frame"><ChevronLeft size={16} /></IconButton>
                <button onClick={() => setPlaying(!playing)} data-testid="button-play-pause" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105">{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
                <IconButton label="Next frame" onClick={() => setTime(Math.min(34, time + 0.5))} testId="button-next-frame"><ChevronRight size={16} /></IconButton>
                <span className="mono ml-2 text-[11px] text-muted-foreground">{formatTime(time)} <span className="text-border">/</span> 00:34</span>
              </div>
              <div className="flex items-center gap-1">
                <IconButton label="Undo edit" onClick={onUndo} testId="button-editor-undo"><Undo2 size={15} /></IconButton>
                <IconButton label="Redo edit" onClick={onRedo} testId="button-editor-redo"><Redo2 size={15} /></IconButton>
                <div className="mx-2 h-5 w-px bg-border" />
                <IconButton label="Toggle inspector" onClick={() => setInspectorOpen(!inspectorOpen)} active={inspectorOpen} testId="button-toggle-inspector"><PanelRight size={16} /></IconButton>
              </div>
            </div>
            <input type="range" min="0" max="34" step=".1" value={time} onChange={(event) => setTime(Number(event.target.value))} data-testid="input-timeline-scrubber" className="mt-3 h-1.5 w-full cursor-pointer accent-[hsl(var(--primary))]" />
          </div>

          <div className="border-b border-border bg-background">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 sm:px-6">
              <div className="flex items-center gap-3"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-foreground">Timeline</span><span className="text-[10px] text-muted-foreground">{clips.length} shots · 3 tracks</span></div>
              <div className="flex items-center gap-2">
                <button onClick={onSplit} data-testid="button-split-clip" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"><Split size={13} /> Split</button>
                <button onClick={onDuplicate} data-testid="button-duplicate-clip" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"><Copy size={12} /> Duplicate</button>
                <div className="mx-1 h-4 w-px bg-border" />
                <button onClick={() => setZoom(Math.max(0.7, Number((zoom - 0.15).toFixed(2))))} data-testid="button-zoom-out" className="text-muted-foreground hover:text-foreground"><ZoomOut size={14} /></button>
                <input type="range" min=".7" max="1.8" step=".1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} data-testid="input-timeline-zoom" className="w-20 accent-[hsl(var(--primary))]" />
                <button onClick={() => setZoom(Math.min(1.8, Number((zoom + 0.15).toFixed(2))))} data-testid="button-zoom-in" className="text-muted-foreground hover:text-foreground"><ZoomIn size={14} /></button>
                <span className="mono w-8 text-right text-[9px] text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
            <div className="mobile-scroll scrollbar-thin overflow-x-auto px-4 py-3 sm:px-6">
              <div className="min-w-[690px]" style={{ width: `${Math.max(100, zoom * 100)}%` }}>
                <div className="mb-2 ml-[94px] flex justify-between mono text-[9px] text-muted-foreground"><span>00:00</span><span>00:08</span><span>00:16</span><span>00:24</span><span>00:32</span></div>
                <div className="relative space-y-2">
                  <div className="pointer-events-none absolute bottom-0 top-[-21px] z-10 w-px bg-primary shadow-[0_0_12px_hsl(var(--primary)/.6)]" style={{ left: `calc(94px + (100% - 94px) * ${time / 34})` }}><span className="absolute -left-1.5 -top-1.5 h-3 w-3 rotate-45 bg-primary" /></div>
                  <TrackRow label="V1" icon={<Film size={12} />} color="text-primary" muted={mutedTracks.includes("V1")} onToggleMute={() => toggleTrack("V1")}>
                    <div className="flex min-w-0 flex-1 gap-1">
                      {clips.map((clip) => (
                        <button key={clip.id} onClick={() => setSelectedClip(clip.id)} data-testid={`button-select-clip-${clip.id}`} style={{ width: `${clip.width}%` }} className={`relative h-[52px] shrink-0 overflow-hidden rounded border text-left transition-all ${selectedClip === clip.id ? "border-primary ring-1 ring-primary/40" : "border-border/70 hover:border-primary/50"}`}>
                          <div className={`absolute inset-0 bg-gradient-to-r ${clip.tone}`} />
                          <span className="relative block truncate px-2 pt-2 text-[10px] font-bold text-foreground">{clip.label}</span>
                          <span className="relative block px-2 pt-1 text-[9px] text-muted-foreground/80">{clip.state === "revised" ? "revised · " : ""}{clip.sub}</span>
                          <span className="absolute bottom-1 left-2 right-2 flex gap-0.5 opacity-40">{[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => <i key={bar} className="h-1 flex-1 rounded-full bg-primary" style={{ opacity: bar % 3 === 0 ? 0.35 : 0.75 }} />)}</span>
                        </button>
                      ))}
                    </div>
                  </TrackRow>
                  <TrackRow label="A1" icon={<AudioLines size={12} />} color="text-accent" muted={mutedTracks.includes("A1")} onToggleMute={() => toggleTrack("A1")}>
                    <div className={`h-10 w-[96%] rounded border border-accent/20 bg-accent/10 px-3 py-2 ${mutedTracks.includes("A1") ? "opacity-35" : ""}`}>
                      <div className="flex h-4 items-center gap-0.5 opacity-70">{Array.from({ length: 52 }).map((_, index) => <i key={index} className="flex-1 rounded-full bg-accent" style={{ height: `${20 + Math.abs(Math.sin(index * 1.8)) * 80}%` }} />)}</div>
                      <span className="mono text-[8px] text-accent/80">voiceover / night-signal.wav</span>
                    </div>
                  </TrackRow>
                  <TrackRow label="T1" icon={<Captions size={12} />} color="text-accent" muted={mutedTracks.includes("T1")} onToggleMute={() => toggleTrack("T1")}>
                    <div className="h-7 w-[62%] rounded border border-border/20 bg-accent/15 px-3 py-1.5 text-[9px] text-muted-foreground">captions · English (US)</div>
                    <div className="h-7 w-[24%] rounded border border-border/20 bg-accent/10 px-3 py-1.5 text-[9px] text-muted-foreground/70">end card</div>
                  </TrackRow>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 border-b border-border bg-background p-4 sm:grid-cols-[1fr_1fr] sm:p-6">
            <div>
              <div className="mb-3 flex items-center gap-2"><WandSparkles size={15} className="text-primary" /><h2 className="text-xs font-bold uppercase tracking-[.13em]">Revise with the agent</h2></div>
              <textarea value={revision} onChange={(event) => setRevision(event.target.value)} data-testid="input-shot-revision" className="min-h-[86px] w-full resize-none rounded-md border border-border bg-card p-3 text-xs leading-5 text-foreground outline-none focus:border-primary/60" />
              <div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Only selected shot · voice preserved</span><button onClick={applyRevision} data-testid="button-apply-revision" className="rounded-md bg-secondary px-3 py-2 text-[11px] font-bold text-foreground hover:bg-secondary/80"><RotateCcw size={12} className="mr-1.5 inline" /> {revisionApplied ? "Revision applied" : "Apply revision"}</button></div>
            </div>
            <div className="rounded-md border border-border bg-card/70 p-4">
              <p className="mono text-[9px] uppercase tracking-[.15em] text-muted-foreground">Agent observation</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Shot 03 has the strongest visual motif. Its current cut is <span className="text-primary">0.8s too slow</span> for the planned reveal. Want me to tighten the entrance?</p>
              <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => notify("Shot trimmed by 0.8 seconds.")} data-testid="button-tighten-shot" className="rounded border border-border px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground">Tighten entrance</button><button onClick={() => notify("Alternative take queued.")} data-testid="button-queue-take" className="rounded border border-border px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground">Queue alt take</button></div>
            </div>
          </div>
        </div>

        {inspectorOpen && (
          <aside className="border-t border-border bg-card xl:border-l xl:border-t-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><p className="mono text-[9px] uppercase tracking-[.17em] text-primary">Inspector</p><p className="mt-1 text-xs font-bold">{safeClip?.label.split("  —  ")[1]}</p></div><button onClick={() => setInspectorOpen(false)} data-testid="button-close-inspector" className="text-muted-foreground hover:text-foreground"><X size={16} /></button></div>
            <div className="space-y-5 p-4">
              <InspectorSection title="Transform" icon={<Aperture size={14} />}>
                <RangeControl label="Position X" value={xPosition} setValue={setXPosition} min={-50} max={50} suffix="" testId="input-position-x" />
                <RangeControl label="Position Y" value={yPosition} setValue={setYPosition} min={-50} max={50} suffix="" testId="input-position-y" />
                <RangeControl label="Scale" value={scale} setValue={setScale} min={50} max={150} suffix="%" testId="input-scale" />
                <RangeControl label="Rotation" value={rotation} setValue={setRotation} min={-180} max={180} suffix="°" testId="input-rotation" />
              </InspectorSection>
              <InspectorSection title="Image" icon={<SunMedium size={14} />}>
                <RangeControl label="Opacity" value={opacity} setValue={setOpacity} min={0} max={100} suffix="%" testId="input-opacity" />
                <button onClick={() => notify("Blend mode menu opened.")} data-testid="button-inspector-blend-mode" className="flex w-full items-center justify-between border-b border-border/70 py-2.5 text-xs"><span className="text-muted-foreground">Blend mode</span><span className="flex items-center gap-2 text-foreground">Normal <ChevronRight size={12} className="text-muted-foreground" /></span></button>
              </InspectorSection>
              <InspectorSection title="Audio" icon={<Mic2 size={14} />}>
                <RangeControl label="Volume" value={volume} setValue={setVolume} min={0} max={100} suffix="%" testId="input-volume" />
                <button onClick={() => notify("Audio fade controls opened.")} data-testid="button-audio-fade" className="flex w-full items-center justify-between border-b border-border/70 py-2 text-xs text-muted-foreground hover:text-foreground"><span>Fade in / out</span><ChevronRight size={13} /></button>
              </InspectorSection>
              <InspectorSection title="Effects" icon={<Sparkles size={14} />}>
                <button onClick={() => notify("Effects browser opened.")} data-testid="button-add-effect" className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"><Plus size={14} /> Add effect</button>
              </InspectorSection>
              <div className="border-t border-border pt-5"><button onClick={onDelete} data-testid="button-delete-clip" className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive/30 py-2.5 text-xs text-destructive hover:bg-destructive/8"><Trash2 size={14} /> Delete selected shot</button></div>
            </div>
          </aside>
        )}
      </div>

      <div className="border-t border-border bg-background p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="mono text-[9px] uppercase tracking-[.18em] text-accent">Media library</p><h2 className="mt-1 text-sm font-bold">The material bin</h2></div>
          <div className="flex items-center gap-2">
            {showMediaSearch && <input autoFocus value={mediaSearch} onChange={(event) => setMediaSearch(event.target.value)} placeholder="Search media" data-testid="input-search-media" className="h-8 w-32 rounded border border-border bg-card px-2 text-[10px] outline-none focus:border-primary" />}
            <button onClick={() => setShowMediaSearch(!showMediaSearch)} data-testid="button-search-media" className="grid h-8 w-8 place-items-center rounded border border-border text-muted-foreground hover:text-foreground"><Search size={14} /></button>
            <button onClick={() => notify("Agentic Stock is searching for a licensed match.")} data-testid="button-agentic-stock" className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/8 px-3 py-2 text-[11px] font-bold text-accent hover:bg-accent/15"><Sparkles size={13} /> <span className="hidden sm:inline">Agentic Stock</span></button>
            <button onClick={() => fileRef.current?.click()} data-testid="button-upload-media" className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-[11px] font-bold text-foreground hover:bg-secondary/80"><Upload size={13} /> Add media</button>
          </div>
        </div>
        {media.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">No matching media. Upload an asset or ask the agent to search Stock.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {media.map((item) => (
              <button key={item.id} onClick={() => addMediaToTimeline(item)} data-testid={`button-add-media-${item.id}`} className="group overflow-hidden rounded-md border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-primary/50">
                <div className={`relative aspect-[1.65] bg-gradient-to-br ${item.color}`}>
                  <div className="absolute inset-0 opacity-25" style={{ background: "radial-gradient(circle at 70% 35%, #f5c578, transparent 24%)" }} />
                  <span className="absolute left-2 top-2 rounded bg-background/65 px-1.5 py-1 mono text-[9px] font-medium text-foreground">{item.glyph}</span>
                  <span className="absolute bottom-2 right-2 rounded bg-background/65 px-1.5 py-1 text-[8px] uppercase tracking-wider text-foreground">{item.type}</span>
                  <span className="absolute inset-0 grid place-items-center bg-background/35 opacity-0 transition-opacity group-hover:opacity-100"><Plus size={22} className="text-primary" /></span>
                </div>
                <p className="truncate px-2.5 py-2 text-[10px] text-muted-foreground">{item.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {(exporting || exported) && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-background/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-popover p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div><p className="mono text-[9px] uppercase tracking-[.18em] text-primary">Final delivery</p><h2 className="mt-2 text-xl font-bold">{exported ? "Your film is ready." : "Rendering your film…"}</h2></div>
              {exported ? <div className="grid h-9 w-9 place-items-center rounded-full bg-accent/15 text-accent"><Check size={18} /></div> : <Film size={20} className="animate-pulse text-primary" />}
            </div>
            {exported ? (
              <>
                <p className="text-xs leading-5 text-muted-foreground">Night Signal · {renderQuality} · {renderFormat} · 00:34. The master was rendered from your current Slate state.</p>
                <button onClick={() => notify("Download started.")} data-testid="button-download-export" className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-xs font-bold text-primary-foreground"><ArrowDownToLine size={15} /> Download master</button>
                <button onClick={() => notify("Export panel closed.")} data-testid="button-close-export" className="mt-2 w-full py-2 text-xs text-muted-foreground hover:text-foreground">Close</button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[10px] text-muted-foreground">Quality<select value={renderQuality} onChange={(event) => setRenderQuality(event.target.value)} data-testid="select-render-quality" className="mt-1 w-full rounded border border-border bg-card px-2 py-2 text-xs text-foreground outline-none"><option>4K</option><option>1080p</option><option>720p</option></select></label>
                  <label className="text-[10px] text-muted-foreground">Format<select value={renderFormat} onChange={(event) => setRenderFormat(event.target.value)} data-testid="select-render-format" className="mt-1 w-full rounded border border-border bg-card px-2 py-2 text-xs text-foreground outline-none"><option>H.264</option><option>ProRes</option><option>WebM</option></select></label>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">Assembling shots, captions, voice and music. You can keep editing while we render locally.</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width] duration-100" style={{ width: `${exportProgress}%` }} /></div>
                <div className="mt-2 flex justify-between mono text-[10px] text-muted-foreground"><span>{exportProgress < 42 ? "Assembling timeline" : exportProgress < 78 ? "Encoding master" : "Verifying output"}</span><span>{exportProgress}%</span></div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function TrackRow({ label, icon, color, children, muted, onToggleMute }: { label: string; icon: ReactNode; color: string; children: ReactNode; muted: boolean; onToggleMute: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex w-[86px] shrink-0 items-center gap-2 ${color}`}>
        <span className="mono text-[10px] text-muted-foreground">{label}</span>
        {icon}
        <button onClick={onToggleMute} data-testid={`button-toggle-track-${label.toLowerCase()}`} className={`ml-auto text-[10px] ${muted ? "text-destructive" : "text-muted-foreground/50"} hover:text-foreground`}>{muted ? "M" : <LockKeyhole size={10} />}</button>
      </div>
      <div className={`timeline-grid flex min-h-[42px] flex-1 items-center gap-1 rounded-sm p-0.5 ${muted ? "opacity-35" : ""}`}>{children}</div>
    </div>
  );
}

function InspectorSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">{icon}<span className="text-[10px] font-bold uppercase tracking-[.15em]">{title}</span></div>
      <div className="rounded-md border border-border bg-card/55 px-3">{children}</div>
    </section>
  );
}

function RangeControl({ label, value, setValue, min, max, suffix, testId }: { label: string; value: number; setValue: (value: number) => void; min: number; max: number; suffix: string; testId: string }) {
  return (
    <label className="block border-b border-border/70 py-2.5 last:border-b-0">
      <span className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="mono text-[10px] text-foreground">{value}{suffix}</span></span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => setValue(Number(event.target.value))} data-testid={testId} className="h-1.5 w-full accent-[hsl(var(--primary))]" />
    </label>
  );
}
