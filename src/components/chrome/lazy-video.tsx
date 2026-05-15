import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
  /** distance from viewport (px) to start loading. Default 200. */
  rootMargin?: string;
  loop?: boolean;
};

/**
 * Lightweight video that:
 *  - only mounts the <video> when it scrolls into view (saves first-paint bandwidth)
 *  - uses preload="metadata" so the browser doesn't pull the whole file
 *  - autoplays muted+inline once visible, pauses when scrolled away
 */
export function LazyVideo({ src, poster, className, rootMargin = "200px", loop = true }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible(true);
          const v = videoRef.current;
          if (!v) return;
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        });
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={wrapRef} className={className} style={{ background: poster ? `center/cover url('${poster}')` : "#0a0a0b" }}>
      {visible && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          muted
          playsInline
          loop={loop}
          preload="metadata"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
