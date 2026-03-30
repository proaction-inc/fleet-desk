import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  // Load Playfair Display Bold from Google Fonts
  const fontData = await fetch(
    "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiukDQ.ttf"
  ).then((res) => res.arrayBuffer());

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
        }}
      >
        <span
          style={{
            fontFamily: "Playfair Display",
            color: "white",
            fontSize: "19px",
            fontWeight: 700,
            letterSpacing: "-1px",
            lineHeight: 1,
          }}
        >
          FD
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Playfair Display",
          data: fontData,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}
