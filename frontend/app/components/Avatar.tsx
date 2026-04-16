"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Tone = "positive" | "negative" | "neutral" | "mixed";

type AvatarProps = {
  tone?: string;
  size?: number;
};

function normalizeTone(tone?: string): Tone {
  if (tone === "positive") return "positive";
  if (tone === "negative") return "negative";
  if (tone === "mixed") return "mixed";
  return "neutral";
}

function getAvatarSrc(tone: Tone) {
  switch (tone) {
    case "positive":
      return "/avatars/positive.png";
    case "negative":
      return "/avatars/negative.png";
    case "mixed":
      return "/avatars/mixed.png";
    case "neutral":
    default:
      return "/avatars/neutral.png";
  }
}

export default function Avatar({ tone = "neutral", size = 64 }: AvatarProps) {
  const normalizedTone = normalizeTone(tone);
  const [displayTone, setDisplayTone] = useState<Tone>(normalizedTone);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (normalizedTone === displayTone) return;

    setVisible(false);

    const timeout = setTimeout(() => {
      setDisplayTone(normalizedTone);
      setVisible(true);
    }, 140);

    return () => clearTimeout(timeout);
  }, [normalizedTone, displayTone]);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <Image
        src={getAvatarSrc(displayTone)}
        alt={`${displayTone} avatar`}
        fill
        sizes={`${size}px`}
        priority
        style={{
          objectFit: "contain",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.18s ease",
        }}
      />
    </div>
  );
}