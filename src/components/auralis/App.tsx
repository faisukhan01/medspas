"use client";

import { useEffect } from "react";
import { useApp } from "./store";
import { api } from "./client";
import Landing from "./Landing";
import Login from "./Login";
import Shell from "./Shell";

export default function AuralisApp() {
  const { stage, setStage, setBoot, boot } = useApp();
  // Derived: the shell shows its own loader until the bootstrap payload lands.
  const booting = stage === "app" && !boot;

  // Pre-fetch bootstrap when heading into the app
  useEffect(() => {
    if (stage === "app" && !useApp.getState().boot) {
      api<Parameters<typeof setBoot>[0]>("/api/bootstrap")
        .then((b) => setBoot(b))
        .catch(() => {});
    }
  }, [stage, setBoot]);

  if (stage === "landing") return <Landing onEnter={() => setStage("login")} />;
  if (stage === "login") return <Login onBack={() => setStage("landing")} />;
  return <Shell booting={booting} />;
}
