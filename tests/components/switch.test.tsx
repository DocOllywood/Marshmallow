import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TheSwitchStep } from "@/components/play/TheSwitchStep";

afterEach(() => cleanup());

describe("TheSwitchStep", () => {
  it("shows stay and switch actions for the original pick", () => {
    const onStay = vi.fn();
    const onSwitch = vi.fn();

    render(
      <TheSwitchStep
        switchPrompt="What if they only admitted it after being caught?"
        originalChoice={{ id: "yes", label: "Yes", sort_order: 0 }}
        choices={[
          { id: "yes", label: "Yes", sort_order: 0 },
          { id: "no", label: "No", sort_order: 1 },
        ]}
        onStay={onStay}
        onSwitch={onSwitch}
      />,
    );

    expect(screen.getByText(/The Switch/i)).toBeTruthy();
    expect(
      screen.getByText("What if they only admitted it after being caught?"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Stay with Yes/i }));
    fireEvent.click(screen.getByRole("button", { name: /Switch to No/i }));

    expect(onStay).toHaveBeenCalledOnce();
    expect(onSwitch).toHaveBeenCalledOnce();
  });
});
