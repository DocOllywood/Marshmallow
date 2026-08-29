import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const signOutAction = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/server/actions/auth", () => ({
  signOutAction,
}));

import { AccountMenu } from "@/components/account/AccountMenu";

afterEach(() => cleanup());

describe("AccountMenu", () => {
  it("exposes log out in the account menu", () => {
    render(<AccountMenu username="richieg" />);

    fireEvent.click(screen.getByRole("button", { name: /Account menu for richieg/i }));

    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeTruthy();
  });
});
