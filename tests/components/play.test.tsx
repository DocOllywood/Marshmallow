import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ChoiceButton } from "@/components/ChoiceButton";
import { BinaryPredictor, MultiPredictor } from "@/components/play/Predictors";
import { CancelledView, StillCookingView, WaitingCopy } from "@/components/play/PlayStates";
import { formatDuration } from "@/lib/format/duration";

afterEach(() => cleanup());

describe("play UI", () => {
  it("marks the selected choice", () => {
    render(
      <>
        <ChoiceButton selected>Alex</ChoiceButton>
        <ChoiceButton>Jordan</ChoiceButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "Alex" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Jordan" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("keeps a binary prediction totaling 100", () => {
    const Harness = () => {
      const [percents, setPercents] = useState([50, 50]);
      return (
        <BinaryPredictor
          choices={[
            { id: "a", label: "Still obsessed with their ex", sort_order: 0 },
            { id: "b", label: "Rude to the waiter", sort_order: 1 },
          ]}
          selectedId="a"
          percents={percents}
          onChange={setPercents}
        />
      );
    };
    render(<Harness />);
    fireEvent.change(screen.getByRole("slider"), {
      target: { value: "64" },
    });
    expect(document.querySelector(".predict-pct")?.textContent).toBe("64%");
    expect(screen.getByText(/How many people do you think agree with you/i)).toBeTruthy();
    expect(screen.getByText(/You picked Still obsessed with their ex/i)).toBeTruthy();
    const choiceRows = screen.getAllByRole("listitem");
    expect(choiceRows[0]?.textContent).toMatch(/64%\s*Still obsessed with their ex/i);
    expect(choiceRows[1]?.textContent).toMatch(/36%\s*Rude to the waiter/i);
    expect(screen.queryByLabelText(/Exact percent/i)).toBeNull();
  });

  it("shows a remaining total for 3-choice mixes", () => {
    render(
      <MultiPredictor
        choices={[
          { id: "a", label: "A", sort_order: 0 },
          { id: "b", label: "B", sort_order: 1 },
          { id: "c", label: "C", sort_order: 2 },
        ]}
        percents={[40, 40, 10]}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByText("Total 90%")).toBeTruthy();
  });

  it("renders cancelled copy without admin reasons or results", () => {
    render(<CancelledView />);
    expect(screen.getByRole("heading", { name: /closed early/i })).toBeTruthy();
    expect(screen.queryByText(/won't publish a crowd result/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "HOME" })).toBeTruthy();
    expect(screen.queryByText(/bad question/i)).toBeNull();
  });

  it("treats a zero countdown as finishing, not unlocked results", () => {
    render(
      <WaitingCopy
        choiceLabel="Alex"
        predictedPct={64}
        revealsAt="2026-08-21T12:00:00.000Z"
        remainingMs={0}
        nextHref="/m/other"
        showPlayAnother
        playMode="quick"
      />,
    );
    expect(screen.getByText(/result cooking|Cooking/i)).toBeTruthy();
    expect(screen.getByText(/Almost ready|Results in/i)).toBeTruthy();
    expect(screen.queryByText(/61%/)).toBeNull();
    expect(screen.getByRole("link", { name: "PLAY ANOTHER" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
    expect(screen.queryByText(formatDuration(0))).toBeNull();
  });

  it("shows Still cooking copy and PLAY ANOTHER without result numbers", () => {
    render(<StillCookingView nextHref="/m/other" showPlayAnother />);
    expect(screen.getByRole("heading", { name: /still cooking/i })).toBeTruthy();
    expect(screen.getByText(/waiting for a few more players/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "PLAY ANOTHER" })).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/players said/i)).toBeNull();
  });
});
