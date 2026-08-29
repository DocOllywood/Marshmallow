import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

vi.mock("@/server/actions/experiment-dare", () => ({
  acceptExperimentDareAction: vi.fn(async () => ({ ok: true, playHref: "/m/q1" })),
  trackDareOpenedAction: vi.fn(async () => undefined),
}));

import { DareInviteClient } from "@/components/dare/DareInviteClient";
import type { DarePublicView } from "@/domain/dare/types";

afterEach(() => {
  cleanup();
  push.mockClear();
});

const openDare: DarePublicView = {
  token: "a".repeat(32),
  dareId: "dare-1",
  roundId: "40000000-0000-4000-8000-000000000008",
  senderDisplayName: "Richie",
  invitationLabel: "A Marshmallow experiment",
  status: "open",
  isSender: false,
  isRecipient: false,
  playMarshmallowId: null,
  matchReady: false,
};

describe("DareInviteClient auth redirect", () => {
  it("sends logged-out users to login with dare next path", () => {
    render(<DareInviteClient dare={openDare} token={openDare.token} isAuthed={false} />);
    fireEvent.click(screen.getByRole("button", { name: /take the dare/i }));
    expect(push).toHaveBeenCalledWith(`/login?next=${encodeURIComponent(`/dare/${openDare.token}`)}`);
  });

  it("offers signup with preserved next path", () => {
    render(<DareInviteClient dare={openDare} token={openDare.token} isAuthed={false} />);
    const signup = screen.getByRole("link", { name: /create an account/i });
    expect(signup.getAttribute("href")).toBe(
      `/signup?next=${encodeURIComponent(`/dare/${openDare.token}`)}`,
    );
  });
});
