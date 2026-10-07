import React from "react";
import { createRoot } from "react-dom/client";
import "../src/index.css";
import { PromptInputBox } from "../components/ui/ai-prompt-box";

declare global {
  interface Window {
    __jv?: { Live?: { active?: boolean; start?: () => void; stop?: () => void } };
  }
}

function syncLegacyInput(value: string) {
  const el = document.getElementById("txt") as HTMLTextAreaElement | null;
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function sendToJarvis(message: string) {
  const input = document.getElementById("txt") as HTMLTextAreaElement | null;
  const send = document.getElementById("send") as HTMLButtonElement | null;
  if (!input || !send) return;
  syncLegacyInput(message);
  send.click();
}

function toggleJarvisVoice() {
  const mic = document.getElementById("mic") as HTMLButtonElement | null;
  if (mic) mic.click();
}

function App() {
  return (
    <PromptInputBox
      placeholder="بنویس یا با جارویس صحبت کن…"
      onSend={(message) => sendToJarvis(message)}
      onVoiceToggle={toggleJarvisVoice}
      className="jarvis-react-prompt fixed bottom-3 left-3 right-3 z-[31] mx-auto max-w-[900px]"
    />
  );
}

const mount = document.getElementById("react-prompt-box");
if (mount) createRoot(mount).render(<App />);
