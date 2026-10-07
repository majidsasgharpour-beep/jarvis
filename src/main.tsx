import React from "react";
import { createRoot } from "react-dom/client";
import Avatar from "@/components/ui/components-primitives-avatar";
import "./index.css";

const mount = document.getElementById("jarvis-react-avatar");

if (mount) {
  createRoot(mount).render(
    <Avatar
      blinking
      color="blue"
      size="lg"
      shape="squircle"
      className="jarvis-react-avatar"
    />
  );
}
