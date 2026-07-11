import type { ReactNode } from "react";
import { LazyVideo } from "@/components/chrome/lazy-video";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Either a video src (.mp4) or image URL */
  media: string;
  /** treat media as image even if it ends with mp4 */
  asImage?: boolean;
  align?: "left" | "center";
  height?: string;
};

export function PageHero({
  eyebrow,
  title,
  subtitle,
  media,
  asImage,
  align = "center",
  height = "min-h-[60vh] md:min-h-[70vh]",
}: Props) {
  const isVideo = !asImage && /\.(mp4|webm|mov)$/i.test(media);
  return (
    <section className={`relative ${height} overflow-hidden flex items-end`}>
      {isVideo ? (
        <LazyVideo src={media} className="absolute inset-0 h-full w-full" preload="auto" />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${media}')` }}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_55%,transparent)_0%,transparent_40%,var(--background)_98%)]" />
      <div
        className={`relative z-10 mx-auto w-full max-w-[1400px] px-6 lg:px-10 pb-16 lg:pb-24 pt-32 ${
          align === "center" ? "text-center" : ""
        }`}
      >
        {eyebrow && (
          <p className="text-xs tracking-[0.25em] uppercase text-accent mb-5">{eyebrow}</p>
        )}
        <h1 className="font-display font-light leading-[0.95] text-[clamp(2.5rem,8vw,7rem)]">
          {title}
        </h1>
        {subtitle && (
          <p
            className={`mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl ${
              align === "center" ? "mx-auto" : ""
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
