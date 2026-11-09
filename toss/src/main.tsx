import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Game from "@/components/Game";
import { KeyboardFocus } from "@/components/KeyboardFocus";
import { setupToss } from "./toss";
import "./index.css";

setupToss();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Korean only: the mini-app is for Toss users in Korea. */}
    <Game initialLang="ko" />
    <KeyboardFocus />
  </StrictMode>,
);
