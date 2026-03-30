import { ImageResponse } from "next/og";
import { getArticleBySlug } from "@/lib/supabase/queries";

export const alt = "The Fleet Desk article";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const PLAYFAIR_URL =
  "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiukDQ.ttf";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  const fontData = await fetch(PLAYFAIR_URL).then((res) => res.arrayBuffer());

  const fonts = [
    {
      name: "Playfair Display",
      data: fontData,
      style: "normal" as const,
      weight: 700 as const,
    },
  ];

  if (!article) {
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
            fontFamily: "Playfair Display",
            color: "white",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          The Fleet Desk
        </div>
      ),
      { ...size, fonts }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0c6e4f",
          padding: "60px",
          position: "relative",
          fontFamily: "Playfair Display",
        }}
      >
        {/* Top row: logo left, category right */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              style={{
                fontSize: 18,
                color: "rgba(255, 255, 255, 0.7)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            >
              THE
            </span>
            <span
              style={{
                fontSize: 30,
                color: "white",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Fleet Desk
            </span>
          </div>

          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              borderRadius: "9999px",
              padding: "8px 20px",
            }}
          >
            <span style={{ fontSize: 16, color: "white", fontWeight: 700 }}>
              {article.topic}
            </span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              fontSize:
                article.title.length > 80
                  ? 40
                  : article.title.length > 50
                    ? 48
                    : 56,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.2,
              textAlign: "center",
              maxWidth: "960px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {article.title}
          </div>
        </div>

        {/* Bottom: author and date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            width: "100%",
          }}
        >
          <span
            style={{
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.85)",
              fontWeight: 700,
            }}
          >
            {article.author}
          </span>
          {article.published_at && (
            <span
              style={{
                fontSize: 18,
                color: "rgba(255, 255, 255, 0.6)",
                fontWeight: 700,
              }}
            >
              {formatDate(article.published_at)}
            </span>
          )}
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size, fonts }
  );
}
