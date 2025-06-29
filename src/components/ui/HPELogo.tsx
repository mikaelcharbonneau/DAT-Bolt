import React from "react";

/**
 * HPE solid-frame logo (transparent centre)
 * ----------------------------------------
 * - Uniform 22% border in HPE Green #01A982
 * - Middle is left transparent so the page's background shows through
 * - `height` scales everything proportionally
 */
export interface HPEFrameLogoProps {
  height?: number; // overall pixel height (default = 32 px)
}

const HPEFrameLogo: React.FC<HPEFrameLogoProps> = ({ height = 32 }) => {
  /* Intrinsic PNG dimensions and border ratio */
  const VIEW_W = 1521;
  const VIEW_H = 438;
  const BORDER_RATIO = 96 / 438; // ~0.22 -> 22%

  const border = VIEW_H * BORDER_RATIO;

  /* Scale SVG so visible height == `height` prop */
  const scale = height / VIEW_H;
  const width = VIEW_W * scale;

  return (
    <svg
      role="img"
      aria-label="HPE solid-frame logo"
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{ display: "block" }}
    >
      {/* LEFT & RIGHT bars */}
      <rect x="0"              y="0" width={border}          height={VIEW_H} fill="#01A982" />
      <rect x={VIEW_W - border} y="0" width={border}          height={VIEW_H} fill="#01A982" />

      {/* TOP & BOTTOM bars */}
      <rect x={border} y="0"                 width={VIEW_W - 2 * border} height={border}          fill="#01A982" />
      <rect x={border} y={VIEW_H - border}   width={VIEW_W - 2 * border} height={border}          fill="#01A982" />
      {/* No interior rect -> centre is fully transparent */}
    </svg>
  );
};

export default HPEFrameLogo;