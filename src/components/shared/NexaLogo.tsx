import React from "react";

interface NexaLogoProps {
  variant?: "full" | "icon";
  colorMode?: "brand" | "monochrome";
  height?: number | string;
  className?: string;
  id?: string;
}

export function NexaLogo({
  variant = "full",
  colorMode = "brand",
  height = 32,
  className = "",
  id = "nexastoreos-logo"
}: NexaLogoProps) {
  // Brand colors
  const deepBlue = "#1A3FBF";
  const cobalt = "#2563EB";
  const tealCyan = "#00B4D8";

  // Determine colors based on mode
  const isMonochrome = colorMode === "monochrome";
  const iconColorLeft = isMonochrome ? "currentColor" : cobalt;
  const iconColorRight = isMonochrome ? "currentColor" : tealCyan;
  const textPrimaryColor = isMonochrome ? "currentColor" : deepBlue;
  const textSecondaryColor = isMonochrome ? "currentColor" : tealCyan;
  const textTertiaryColor = isMonochrome ? "currentColor" : "#475569"; // Slate 600

  if (variant === "icon") {
    return (
      <svg
        id={id}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height }}
        className={className}
      >
        {/* Left curve and diagonal with futuristic gap */}
        <path
          d="M 8 25 C 8 16 9.5 7 12 7 L 19.5 24"
          stroke={iconColorLeft}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right curved stem */}
        <path
          d="M 21.5 24 C 23.2 17 24.5 12 24.5 7"
          stroke={iconColorRight}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Full lockup: Horizontal layout with wordmark
  return (
    <svg
      id={id}
      viewBox="0 0 210 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height }}
      className={className}
    >
      {/* Icon portion (translated slightly to align) */}
      <g transform="translate(2, 4)">
        <path
          d="M 8 25 C 8 16 9.5 7 12 7 L 19.5 24"
          stroke={iconColorLeft}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 21.5 24 C 23.2 17 24.5 12 24.5 7"
          stroke={iconColorRight}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </g>

      {/* Wordmark portion */}
      <text
        x="38"
        y="26"
        fill={textPrimaryColor}
        style={{
          fontFamily: "Montserrat, Poppins, -apple-system, sans-serif",
          fontWeight: 900,
          fontSize: "19px",
          letterSpacing: "-0.5px"
        }}
      >
        Nexa
      </text>
      <text
        x="84"
        y="26"
        fill={textSecondaryColor}
        style={{
          fontFamily: "Montserrat, Poppins, -apple-system, sans-serif",
          fontWeight: 800,
          fontSize: "19px",
          letterSpacing: "-0.5px"
        }}
      >
        Store
      </text>
      <text
        x="137"
        y="26"
        fill={textTertiaryColor}
        style={{
          fontFamily: "Montserrat, Poppins, -apple-system, sans-serif",
          fontWeight: 700,
          fontSize: "19px",
          letterSpacing: "-0.5px"
        }}
      >
        OS
      </text>
    </svg>
  );
}
