import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TheLineStep } from "@/components/play/TheLineStep";

afterEach(() => cleanup());

describe("TheLineStep", () => {
  it("renders threshold choices and records selection", () => {
    const onSelect = vi.fn();
    render(
      <TheLineStep
        choices={[
          { id: "immediately", label: "Immediately", sort_order: 0 },
          { id: "week", label: "A week", sort_order: 1 },
          { id: "never", label: "Never", sort_order: 4 },
        ]}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText(/The Line/i)).toBeTruthy();
    expect(screen.getByText(/Where's your line/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "A week" }));
    expect(onSelect).toHaveBeenCalledWith("week");
  });
});
