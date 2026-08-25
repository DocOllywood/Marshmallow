"use client";

import { useEffect } from "react";

const TITLE_PREFIX = "☁️ ";

/** One-time document title cue while the tab is open. No flash, no native push. */
export function ReadyAttention({ readyCount }: { readyCount: number }) {
  useEffect(() => {
    if (readyCount <= 0) {
      if (document.title.startsWith(TITLE_PREFIX)) {
        document.title = document.title.slice(TITLE_PREFIX.length).replace(/^\d+\sReady\s·\s/, "");
      }
      return;
    }
    const previous = document.title;
    if (!previous.startsWith(TITLE_PREFIX)) {
      document.title = `${TITLE_PREFIX}${readyCount} Ready · ${previous}`;
    }
    return () => {
      document.title = previous;
    };
  }, [readyCount]);

  return null;
}
