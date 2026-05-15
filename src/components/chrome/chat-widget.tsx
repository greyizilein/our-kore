import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAgentName } from "@/lib/agent-name";

export function ChatWidget() {
  const { pathname } = useLocation();
  const [mounted, setMounted] = useState(false);
  const agentName = useAgentName();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Hide on the concierge route itself
  if (pathname.startsWith("/concierge")) return null;

  return (
    <Link
      to="/concierge"
      aria-label={`Talk to ${agentName}`}
      className={`group fixed z-40 bottom-6 right-6 lg:bottom-8 lg:right-8 transition-all duration-700 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <span className="absolute -top-9 right-0 whitespace-nowrap text-[10px] tracking-[0.25em] uppercase bg-foreground text-background px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        Ask {agentName}
      </span>
      <div className="relative h-14 w-14 lg:h-16 lg:w-16 rounded-full bg-foreground text-background grid place-items-center shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:scale-105 active:scale-95 transition-transform">
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" />
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="relative h-7 w-7 lg:h-8 lg:w-8"
          aria-hidden
        >
          {/* Speech bubble outline */}
          <path
            d="M6 9 C6 7 7.5 5.5 9.5 5.5 H22.5 C24.5 5.5 26 7 26 9 V18 C26 20 24.5 21.5 22.5 21.5 H14 L8 26 V21.5 H9.5 C7.5 21.5 6 20 6 18 Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Three animated dots */}
          <circle cx="12" cy="13.5" r="1.4" fill="currentColor">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" begin="0s" />
          </circle>
          <circle cx="16" cy="13.5" r="1.4" fill="currentColor">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" begin="0.2s" />
          </circle>
          <circle cx="20" cy="13.5" r="1.4" fill="currentColor">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" begin="0.4s" />
          </circle>
        </svg>
      </div>
    </Link>
  );
}
