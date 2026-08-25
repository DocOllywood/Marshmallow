import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { getPublicShare } from "@/server/dal/notify-share";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ShareOgImage({
  params,
}: PageProps<"/s/[shareId]">) {
  const { shareId } = await params;
  const share = await getPublicShare(shareId);
  if (!share) {
    notFound();
  }

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
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 28, letterSpacing: 6, color: "#e11d48" }}>
            {share.copy.headline}
          </div>
          <div style={{ fontSize: 44, lineHeight: 1.1, fontWeight: 700 }}>
            {share.shortQuestion}
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 32, gap: 8 }}>
            {share.copy.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28 }}>
          <span>{share.copy.challenge}</span>
          <span>MARSHMALLOW</span>
        </div>
      </div>
    ),
    size,
  );
}
