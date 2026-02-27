"use client";

import { useState, useEffect } from "react";

const WORDS = ["성격", "직업", "연애", "올해 운세"];

export default function RotatingWords() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block h-[1.25em] w-[5em] overflow-hidden align-bottom">
      {WORDS.map((word, i) => (
        <span
          key={word}
          className="absolute left-0 top-0 block whitespace-nowrap bg-gradient-to-r from-cta-from to-cta-to bg-clip-text text-transparent transition-all duration-500"
          style={{
            transform: i === index ? "translateY(0%)" : i < index || (index === 0 && i === WORDS.length - 1 && i !== 0) ? "translateY(-110%)" : "translateY(110%)",
            opacity: i === index ? 1 : 0,
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
