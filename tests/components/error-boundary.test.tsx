import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/MarshmallowMascot", () => ({
  MarshmallowMascot: () => <div>Mascot</div>,
}));

import RootError from "@/app/error";

afterEach(() => cleanup());

describe("RootError", () => {
  it("uses Money green for the retry button", () => {
    const reset = vi.fn();
    render(<RootError error={new Error("boom")} reset={reset} />);

    const button = screen.getByRole("button", { name: "Try again" });
    expect(button.className).toMatch(/bg-money/);
    expect(button.className).toMatch(/text-money-foreground/);

    fireEvent.click(button);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
