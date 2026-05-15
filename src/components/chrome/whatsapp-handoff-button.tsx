import { useEffect, useState } from "react";
import { supabase } from "@/integrations/kore-supabase/client";
import { buildWhatsAppUrl, summarizeForHandoff } from "@/lib/whatsapp";

type Props = {
  context?: string;
  conversation?: { role: string; content: string }[];
  agentName?: string;
  className?: string;
  label?: string;
};

export function WhatsAppHandoffButton({ context, conversation, agentName, className, label }: Props) {
  const [cfg, setCfg] = useState<{ number: string; greeting?: string } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.from("site_settings").select("value").eq("key", "whatsapp").maybeSingle()
      .then(({ data }) => { if (!active) return; setCfg((data?.value as any) ?? null); });
    return () => { active = false; };
  }, []);

  if (!cfg?.number) return null;
  const message = (context || conversation) ? summarizeForHandoff({ context, conversation, agentName }) : (cfg.greeting ?? undefined);
  const href = buildWhatsAppUrl(cfg, message);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className ?? "inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-[11px] tracking-[0.2em] uppercase hover:bg-emerald-500 transition-colors"}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path d="M20.52 3.48A11.94 11.94 0 0 0 12.04 0C5.49 0 .15 5.34.15 11.89c0 2.1.55 4.14 1.6 5.94L0 24l6.34-1.66a11.86 11.86 0 0 0 5.7 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.42-8.42ZM12.04 21.7h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.76.99 1-3.66-.23-.38a9.81 9.81 0 0 1-1.5-5.18c0-5.43 4.42-9.85 9.85-9.85 2.63 0 5.1 1.02 6.96 2.88a9.78 9.78 0 0 1 2.88 6.97c0 5.43-4.41 9.81-9.82 9.81Zm5.39-7.34c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.79-1.67-2.09-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z"/>
      </svg>
      {label ?? "Continue on WhatsApp"}
    </a>
  );
}
