import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Marshmallow — What's your price?";

export default function RootOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4ebe0",
          color: "#1c1410",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              fontWeight: 600,
              color: "#5a7267",
              textTransform: "uppercase",
            }}
          >
            Marshmallow
          </div>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: -1,
              maxWidth: 900,
            }}
          >
            What&apos;s your price?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 30, lineHeight: 1.35 }}>
            <div>Money changes people.</div>
            <div>Find out where it changes you.</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            letterSpacing: 4,
            fontWeight: 600,
            color: "#2f5c4a",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 48,
              height: 2,
              background: "#b8cfc0",
            }}
          />
          One uncomfortable money experiment every day
        </div>
      </div>
    ),
    size,
  );
}
