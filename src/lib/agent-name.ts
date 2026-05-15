// Tiny client-side store for the user's chosen AI agent name.
// Mirrors profile.agent_name (saved server-side from /dashboard) into
// localStorage so the concierge page and chat widget don't need to wait
// for a network round-trip to greet the user with the right name.

import { useEffect, useState } from "react";

const KEY = "kore.agent_name";
const DEFAULT = "KORE";

export function getAgentName(): string {
  if (typeof window === "undefined") return DEFAULT;
  try {
    return localStorage.getItem(KEY)?.trim() || DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setAgentName(name: string) {
  if (typeof window === "undefined") return;
  try {
    const v = (name || "").trim().slice(0, 40) || DEFAULT;
    localStorage.setItem(KEY, v);
    window.dispatchEvent(new CustomEvent("kore:agent-name", { detail: v }));
  } catch {
    /* ignore */
  }
}

export function useAgentName(): string {
  const [name, setName] = useState<string>(DEFAULT);
  useEffect(() => {
    setName(getAgentName());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") setName(detail || DEFAULT);
      else setName(getAgentName());
    };
    window.addEventListener("kore:agent-name", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("kore:agent-name", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return name;
}
