import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkipAdButton } from "@/components/player/SkipAdButton";

describe("Netflix-style Skip Ad Button", () => {
  it("renders SkipAdButton with clean 'Bỏ qua quảng cáo' text during early playback", () => {
    const handleSkip = vi.fn();
    render(
      <SkipAdButton
        currentTime={15}
        duration={1200}
        isScreenLocked={false}
        onSkipAd={handleSkip}
      />,
    );

    expect(screen.getByTestId("skip-ad-button")).toBeDefined();
    expect(screen.getByText("Bỏ qua quảng cáo")).toBeDefined();
  });

  it("does not render when currentTime is past early playback threshold (>= 120s)", () => {
    const handleSkip = vi.fn();
    const { container } = render(
      <SkipAdButton
        currentTime={150}
        duration={1200}
        isScreenLocked={false}
        onSkipAd={handleSkip}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("does not render on short videos (<= 60s)", () => {
    const handleSkip = vi.fn();
    const { container } = render(
      <SkipAdButton
        currentTime={10}
        duration={50}
        isScreenLocked={false}
        onSkipAd={handleSkip}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("does not render when screen is locked", () => {
    const handleSkip = vi.fn();
    const { container } = render(
      <SkipAdButton
        currentTime={10}
        duration={1200}
        isScreenLocked={true}
        onSkipAd={handleSkip}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("calls onSkipAd(85) and dismisses itself when clicked", () => {
    const handleSkip = vi.fn();
    render(
      <SkipAdButton
        currentTime={10}
        duration={1200}
        isScreenLocked={false}
        onSkipAd={handleSkip}
      />,
    );

    const button = screen.getByText("Bỏ qua quảng cáo").closest("button");
    expect(button).not.toBeNull();
    fireEvent.click(button!);

    expect(handleSkip).toHaveBeenCalledWith(85);
    // Button dismisses immediately after click
    expect(screen.queryByTestId("skip-ad-button")).toBeNull();
  });
});
