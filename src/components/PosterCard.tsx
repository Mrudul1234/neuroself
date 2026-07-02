import React from "react";

const COLORS = [
  "#e65100", // deep orange
  "#0d47a1", // cobalt blue
  "#1b5e20", // forest green
  "#fff8e1", // cream
  "#ff5252", // coral red
  "#fbc02d", // mustard yellow
  "#1a237e", // navy
];

// Fallback font stacks for the requested styles
const FONTS = [
  { family: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif', weight: 800, transform: "uppercase" as const }, // Neue Haas Grotesk / Sans
  { family: '"Fraunces", "Georgia", serif', weight: 700, style: "italic", transform: "none" as const }, // Elegant serif italic
  { family: '"Archivo Black", "Impact", sans-serif', weight: 900, transform: "uppercase" as const }, // Bold condensed
  { family: '"Canela", "Times New Roman", serif', weight: 400, transform: "none" as const }, // Display serif
  { family: '"General Sans", "system-ui", sans-serif', weight: 600, transform: "lowercase" as const }, // Modern geometric
];

const LAYOUTS = [
  "top-left",
  "center",
  "bottom-anchored",
  "split",
  "off-center",
] as const;

export interface PosterCardProps {
  title: string;
  subtitle?: string;
  number?: string | number;
  index: number;
  className?: string;
}

export function PosterCard({ title, subtitle, number, index, className = "" }: PosterCardProps) {
  const colorIndex = index % COLORS.length;
  const bgColor = COLORS[colorIndex];
  
  // Determine text color based on background luminance (naive check, cream gets dark text, others get light)
  const isLightBg = bgColor === "#fff8e1" || bgColor === "#fbc02d";
  const textColor = isLightBg ? "#111111" : "#ffffff";
  const mutedTextColor = isLightBg ? "rgba(17,17,17,0.6)" : "rgba(255,255,255,0.6)";

  const fontConfig = FONTS[index % FONTS.length];
  const layout = LAYOUTS[index % LAYOUTS.length];

  const paddedNum = String(number ?? (index + 1)).padStart(2, "0");

  const titleWords = title.split(" ");
  const splitTop = titleWords.slice(0, Math.ceil(titleWords.length / 2)).join(" ");
  const splitBottom = titleWords.slice(Math.ceil(titleWords.length / 2)).join(" ");

  const baseTitleStyle: React.CSSProperties = {
    fontFamily: fontConfig.family,
    fontWeight: fontConfig.weight,
    fontStyle: fontConfig.style,
    textTransform: fontConfig.transform,
    color: textColor,
    lineHeight: 1.1,
    letterSpacing: fontConfig.family.includes("sans") ? "-0.02em" : "normal",
  };

  const subtitleEl = subtitle && (
    <div
      style={{
        color: mutedTextColor,
        fontSize: "clamp(0.6rem, 2cqw, 0.9rem)",
        fontWeight: 400,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {subtitle}
    </div>
  );

  const renderLayout = () => {
    switch (layout) {
      case "top-left":
        return (
          <div className="flex h-full w-full flex-col justify-between p-[8%]">
            <div className="flex max-w-[85%] flex-col gap-4">
              <h2 style={{ ...baseTitleStyle, fontSize: "clamp(1.5rem, 8cqw, 4rem)" }}>
                {title}
              </h2>
              {subtitleEl}
            </div>
            <div className="self-end" style={{ color: mutedTextColor, fontWeight: 500 }}>
              {paddedNum}
            </div>
          </div>
        );
      case "center":
        return (
          <div className="flex h-full w-full flex-col p-[10%]">
            <div className="mb-auto self-start" style={{ color: mutedTextColor, fontWeight: 500 }}>
              {paddedNum}
            </div>
            <div className="my-auto flex flex-col items-center justify-center gap-6 text-center">
              <h2 style={{ ...baseTitleStyle, fontSize: "clamp(1.2rem, 6cqw, 3.5rem)" }}>
                {title}
              </h2>
              {subtitleEl}
            </div>
          </div>
        );
      case "bottom-anchored":
        return (
          <div className="flex h-full w-full flex-col justify-between p-[9%]">
            <div className="self-end" style={{ color: mutedTextColor, fontWeight: 500 }}>
              {paddedNum}
            </div>
            <div className="mt-auto flex flex-col gap-3">
              {subtitleEl}
              <h2 style={{ ...baseTitleStyle, fontSize: "clamp(1.8rem, 9cqw, 4.5rem)" }}>
                {title}
              </h2>
            </div>
          </div>
        );
      case "split":
        return (
          <div className="flex h-full w-full flex-col justify-between p-[8%]">
            <div className="flex w-full justify-between items-start">
              <h2 style={{ ...baseTitleStyle, fontSize: "clamp(2rem, 10cqw, 5rem)" }}>
                {splitTop}
              </h2>
              <div style={{ color: mutedTextColor, fontWeight: 500 }}>{paddedNum}</div>
            </div>
            <div className="flex w-full flex-col items-end gap-2 text-right">
              {subtitleEl}
              <h2 style={{ ...baseTitleStyle, fontSize: "clamp(2rem, 10cqw, 5rem)" }}>
                {splitBottom}
              </h2>
            </div>
          </div>
        );
      case "off-center":
        return (
          <div className="flex h-full w-full flex-col justify-between p-[10%]">
            <div className="self-start" style={{ color: mutedTextColor, fontWeight: 500 }}>
              {paddedNum}
            </div>
            <div className="ml-auto w-2/3 flex flex-col gap-4 text-right">
              <h2 style={{ ...baseTitleStyle, fontSize: "clamp(1.4rem, 7cqw, 3.8rem)" }}>
                {title}
              </h2>
              {subtitleEl}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden @container ${className}`}
      style={{
        backgroundColor: bgColor,
        containerType: "inline-size",
      }}
    >
      {renderLayout()}
    </div>
  );
}
