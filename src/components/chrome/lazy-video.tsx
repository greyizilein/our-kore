import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
  /** distance from viewport (px) to start loading. Default 200. */
  rootMargin?: string;
  loop?: boolean;
  /** set "auto" for above-the-fold video that must play immediately. Default "metadata". */
  preload?: "auto" | "metadata" | "none";
};

/**
 * Lightweight video that:
 *  - only mounts the <video> when it scrolls into view (saves first-paint bandwidth)
 *  - uses preload="metadata" so the browser doesn't pull the whole file
 *  - autoplays muted+inline once visible, pauses when scrolled away
 */
export function LazyVideo({
  src,
  poster,
  className,
  rootMargin = "200px",
  loop = true,
  preload = "metadata",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [intersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      setIntersecting(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible(true);
          setIntersecting(e.isIntersecting);
        });
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  // Drive play/pause here instead of inside the observer callback: on the
  // first intersection the <video> hasn't mounted yet (visible just flipped
  // true), so videoRef.current would still be null at that point.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (intersecting) v.play().catch(() => {});
    else v.pause();
  }, [visible, intersecting]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ background: poster ? `center/cover url('${poster}')` : "#0a0a0b" }}
    >
      {visible && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          muted
          playsInline
          loop={loop}
          preload={preload}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
