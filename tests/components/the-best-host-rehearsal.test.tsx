import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { TheBestHostRehearsal } from "@/components/dev/TheBestHostRehearsal";
import { THE_BEST_HOST_REHEARSAL_STORAGE_KEY } from "@/domain/dev/the-best-host-rehearsal-fixture";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("TheBestHostRehearsal prototype C", () => {
  it("starts with host intro and separate storage", () => {
    render(<TheBestHostRehearsal />);
    expect(THE_BEST_HOST_REHEARSAL_STORAGE_KEY).toBe("marshmallow-the-best-host-rehearsal");
    expect(screen.getByText(/the host/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^BEGIN$/i })).toBeTruthy();
  });

  it("combines Q3 reaction with switch tease on one screen", () => {
    render(<TheBestHostRehearsal />);
    fireEvent.click(screen.getByRole("button", { name: /^BEGIN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /SAY YES/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /STILL SAY YES/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /REFUSE TO SAY/i }));
    expect(screen.getByText(/STILL NO/i)).toBeTruthy();
    expect(screen.getByText("Now switch sides.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^NOW SWITCH SIDES\.$/i })).toBeNull();
  });

  it("routes Q4 inverse directly to read the room", () => {
    render(<TheBestHostRehearsal />);
    fireEvent.click(screen.getByRole("button", { name: /^BEGIN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /SAY YES/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /STILL SAY YES/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /REFUSE TO SAY/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /^YES$/i }));
    expect(screen.getByText(/DIFFERENT FROM THIS SIDE/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /READ THE ROOM/i }));
    expect(screen.getByText(/Read the room/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /LOCK IT/i })).toBeTruthy();
  });

  it("records flip prediction locally and reaches host ending", () => {
    render(<TheBestHostRehearsal />);
    fireEvent.click(screen.getByRole("button", { name: /^BEGIN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /SAY YES/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /STILL SAY YES/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /REFUSE TO SAY/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /^YES$/i }));
    fireEvent.click(screen.getByRole("button", { name: /READ THE ROOM/i }));
    fireEvent.click(screen.getByRole("button", { name: /LOCK IT/i }));
    fireEvent.click(screen.getByRole("button", { name: /TELL ME WHO IT WAS/i }));
    expect(screen.getByText(/YOU WOULDN'T GIVE THE NAME/i)).toBeTruthy();
    expect(screen.getByText(/TELL ME WHO IT WAS/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /ANOTHER MARSHMALLOW/i })).toBeTruthy();
    expect(screen.queryByText(/Outside the experiment/i)).toBeNull();
  });

  it("ANOTHER MARSHMALLOW reaches completion screen", () => {
    render(<TheBestHostRehearsal />);
    fireEvent.click(screen.getByRole("button", { name: /^BEGIN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /SAY YES/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /STILL SAY YES/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /REFUSE TO SAY/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /^NO$/i }));
    fireEvent.click(screen.getByRole("button", { name: /READ THE ROOM/i }));
    fireEvent.click(screen.getByRole("button", { name: /LOCK IT/i }));
    fireEvent.click(screen.getByRole("button", { name: /I DON'T WANT TO KNOW/i }));
    fireEvent.click(screen.getByRole("button", { name: /ANOTHER MARSHMALLOW/i }));
    expect(screen.getByText(/That's one Marshmallow/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /ANOTHER MARSHMALLOW/i }));
    expect(screen.getByRole("button", { name: /^BEGIN$/i })).toBeTruthy();
  });
});

describe("TheBestHostRehearsal isolation", () => {
  it("does not import production analytics card", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/dev/TheBestHostRehearsal.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/BinaryPredictor|ExperimentTodaysReadCard/);
  });
});
