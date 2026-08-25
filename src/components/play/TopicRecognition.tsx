export function TopicRecognition({
  topicName,
  entityLabel,
  spoilerContext,
  imageUrl,
}: {
  topicName?: string | null;
  entityLabel?: string | null;
  spoilerContext?: string | null;
  imageUrl?: string | null;
}) {
  const label = entityLabel || topicName;
  return (
    <div className="flex flex-col gap-2">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-16 w-16 rounded-2xl object-cover"
        />
      ) : null}
      {label ? (
        <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
          {label}
        </p>
      ) : null}
      {spoilerContext ? (
        <p className="rounded-full bg-toasted-canvas px-3 py-1 text-xs font-semibold text-toasted">
          {spoilerContext}
        </p>
      ) : null}
    </div>
  );
}
