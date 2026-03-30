import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c6e4f",
          borderRadius: "6px",
          fontFamily: "serif",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "18px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          FD
        </span>
      </div>
    ),
    { ...size }
  );
}
