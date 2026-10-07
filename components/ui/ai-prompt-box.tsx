import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUp, Paperclip, Square, X, StopCircle, Mic, Globe, BrainCog, FolderCode } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PromptInputBoxProps = {
  onSend?: (message: string, files?: File[]) => void;
  onVoiceToggle?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
};

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn("z-50 rounded-md border border-[#333] bg-[#1F2023] px-3 py-1.5 text-sm text-white shadow-md", className)}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn("fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#1F2023] shadow-xl", className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full bg-[#2E3033] p-2">
        <X className="h-5 w-5 text-white" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={1}
      className={cn("flex min-h-[44px] w-full resize-none rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-100 placeholder:text-gray-400 focus:outline-none", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

const PromptInputAction: React.FC<{
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}> = ({ tooltip, children, side = "top" }) => (
  <Tooltip>
    <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
    <TooltipContent side={side}>{tooltip}</TooltipContent>
  </Tooltip>
);

const Divider = () => <div className="mx-1 h-6 w-px bg-gradient-to-b from-transparent via-[#9b87f5]/70 to-transparent" />;

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  ({ onSend = () => {}, onVoiceToggle = () => {}, isLoading = false, placeholder = "Type your message here...", className }, ref) => {
    const [input, setInput] = React.useState("");
    const [files, setFiles] = React.useState<File[]>([]);
    const [preview, setPreview] = React.useState<string | null>(null);
    const [recording, setRecording] = React.useState(false);
    const [search, setSearch] = React.useState(false);
    const [think, setThink] = React.useState(false);
    const [canvas, setCanvas] = React.useState(false);
    const uploadRef = React.useRef<HTMLInputElement>(null);
    const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const [seconds, setSeconds] = React.useState(0);

    React.useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

    const processFile = (file: File) => {
      if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
      setFiles([file]);
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(file);
    };

    const submit = () => {
      if (!input.trim() && !files.length) return;
      const mode = search ? "[Search: " : think ? "[Think: " : canvas ? "[Canvas: " : "";
      const message = mode ? `${mode}${input}]` : input;
      onSend(message, files);
      setInput(""); setFiles([]); setPreview(null);
    };

    const toggleRecording = () => {
      if (recording) {
        if (timer.current) clearInterval(timer.current);
        onVoiceToggle();
        setRecording(false); setSeconds(0);
      } else {
        onVoiceToggle();
        setRecording(true);
        timer.current = setInterval(() => setSeconds(v => v + 1), 1000);
      }
    };

    const hasContent = Boolean(input.trim() || files.length);

    return (
      <TooltipProvider>
        <div
          ref={ref}
          className={cn("w-full rounded-3xl border border-[#444] bg-[#1F2023] p-2 shadow-[0_8px_30px_rgba(0,0,0,.24)]", isLoading && "border-red-500/70", className)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = Array.from(e.dataTransfer.files).find(x => x.type.startsWith("image/")); if (f) processFile(f); }}
        >
          {preview && !recording && (
            <div className="relative mb-2 h-16 w-16 overflow-hidden rounded-xl">
              <button className="absolute right-1 top-1 z-10 rounded-full bg-black/70 p-1" onClick={() => { setFiles([]); setPreview(null); }}>
                <X className="h-3 w-3 text-white" />
              </button>
              <img src={preview} alt="Preview" className="h-full w-full object-cover" onClick={() => setPreview(preview)} />
            </div>
          )}

          {!recording ? (
            <Textarea
              value={input}
              disabled={isLoading}
              placeholder={search ? "Search the web..." : think ? "Think deeply..." : canvas ? "Create on canvas..." : placeholder}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-3 text-white">
              <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500"/><span className="font-mono text-sm">{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</span></div>
              <div className="flex h-8 w-full items-center justify-center gap-1">{Array.from({length:24},(_,i)=><span key={i} className="h-2 w-0.5 animate-pulse rounded-full bg-white/50" style={{animationDelay:`${i*50}ms`}}/>)}</div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className={cn("flex items-center gap-1", recording && "invisible")}>
              <PromptInputAction tooltip="Upload image">
                <button className="flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-gray-600/30" onClick={() => uploadRef.current?.click()}>
                  <Paperclip className="h-5 w-5" />
                  <input ref={uploadRef} type="file" accept="image/*" hidden onChange={e => { const f=e.target.files?.[0]; if(f) processFile(f); e.currentTarget.value=""; }} />
                </button>
              </PromptInputAction>

              <button type="button" onClick={() => {setSearch(v=>!v);setThink(false);}} className={cn("flex h-8 items-center gap-1 rounded-full px-2 text-[#9CA3AF]", search && "border border-[#1EAEDB] bg-[#1EAEDB]/15 text-[#1EAEDB]")}>
                <motion.span animate={{rotate:search?360:0}}><Globe className="h-4 w-4"/></motion.span>
                <AnimatePresence>{search && <motion.span initial={{width:0,opacity:0}} animate={{width:"auto",opacity:1}} exit={{width:0,opacity:0}} className="text-xs">Search</motion.span>}</AnimatePresence>
              </button>
              <Divider />
              <button type="button" onClick={() => {setThink(v=>!v);setSearch(false);}} className={cn("flex h-8 items-center gap-1 rounded-full px-2 text-[#9CA3AF]", think && "border border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#8B5CF6]")}>
                <motion.span animate={{rotate:think?360:0}}><BrainCog className="h-4 w-4"/></motion.span>
                <AnimatePresence>{think && <motion.span initial={{width:0,opacity:0}} animate={{width:"auto",opacity:1}} exit={{width:0,opacity:0}} className="text-xs">Think</motion.span>}</AnimatePresence>
              </button>
              <Divider />
              <button type="button" onClick={() => setCanvas(v=>!v)} className={cn("flex h-8 items-center gap-1 rounded-full px-2 text-[#9CA3AF]", canvas && "border border-[#F97316] bg-[#F97316]/15 text-[#F97316]")}>
                <motion.span animate={{rotate:canvas?360:0}}><FolderCode className="h-4 w-4"/></motion.span>
                <AnimatePresence>{canvas && <motion.span initial={{width:0,opacity:0}} animate={{width:"auto",opacity:1}} exit={{width:0,opacity:0}} className="text-xs">Canvas</motion.span>}</AnimatePresence>
              </button>
            </div>

            <PromptInputAction tooltip={isLoading ? "Stop generation" : recording ? "Stop recording" : hasContent ? "Send message" : "Voice message"}>
              <button
                className={cn("flex h-8 w-8 items-center justify-center rounded-full transition", recording ? "text-red-500" : hasContent ? "bg-white text-[#1F2023]" : "text-[#9CA3AF] hover:bg-gray-600/30")}
                onClick={() => recording ? toggleRecording() : hasContent ? submit() : toggleRecording()}
                disabled={isLoading && !hasContent}
              >
                {isLoading ? <Square className="h-4 w-4 fill-current animate-pulse"/> : recording ? <StopCircle className="h-5 w-5"/> : hasContent ? <ArrowUp className="h-4 w-4"/> : <Mic className="h-5 w-5"/>}
              </button>
            </PromptInputAction>
          </div>
        </div>

        <Dialog open={Boolean(preview)} onOpenChange={() => setPreview(null)}>
          <DialogContent className="overflow-hidden border-none bg-transparent p-0 shadow-none">
            <DialogPrimitive.Title className="sr-only">Image Preview</DialogPrimitive.Title>
            {preview && <img src={preview} alt="Full preview" className="max-h-[80vh] w-full rounded-2xl object-contain"/>}
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    );
  }
);
PromptInputBox.displayName = "PromptInputBox";
