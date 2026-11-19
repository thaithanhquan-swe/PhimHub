import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkipAdButton } from "@/components/player/SkipAdButton";
import { AD_SKIP_OPTIONS } from "@/components/player/constants";

describe("Skip Ad Feature", () => {
  it("provides valid standard ad skip options", () => {
    const values = AD_SKIP_OPTIONS.map((o) => o.val);
    expect(values).toContain(0);
    expect(values).toContain(30);
    expect(values).toContain(60);
    expect(values).toContain(85);
    expect(values).toContain(90);
    expect(values).toContain(120);
  });

  it("renders SkipAdButton during early playback when movie is long enough", () => {
    const handleSkip = vi.fn();
    render(
      <SkipAdButton
        currentTime={15}
        duration={1200}
        isScreenLocked={false}
        onSkipAd={handleSkip}
        defaultSkipSeconds={85}
      />,
    );

    expect(screen.getByTestId("skip-ad-button")).toBeDefined();
    expect(screen.getByText("Bỏ qua quảng cáo")).toBeDefined();
    expect(screen.getByText("(+85s)")).toBeDefined();
  });

  it("does not render when currentTime is past early playback threshold (>= 120s)", () => {
    const handleSkip = vi.fn();
    const { container } = render(
      <SkipAdButton
        currentTime={150}
        duration={1200}
        isScreenLocked={false}
        onSkipAd={handleSkip}
        defaultSkipSeconds={85}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("does not render on short videos (<= 150s)", () => {
    const handleSkip = vi.fn();
    const { container } = render(
      <SkipAdButton
        currentTime={10}
        duration={100}
        isScreenLocked={false}
        onSkipAd={handleSkip}
        defaultSkipSeconds={85}
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
        defaultSkipSeconds={85}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("triggers onSkipAd with selected seconds when clicking skip button", () => {
    const handleSkip = vi.fn();
    render(
      <SkipAdButton
        currentTime={10}
        duration={1200}
        isScreenLocked={false}
        onSkipAd={handleSkip}
        defaultSkipSeconds={85}
      />,
    );

    const mainButton = screen.getByText("Bỏ qua quảng cáo").closest("button");
    expect(mainButton).not.toBeNull();
    fireEvent.click(mainButton!);

    expect(handleSkip).toHaveBeenCalledWith(85);
  });

  it("triggers onSkipAd with preset seconds when clicking 30s or 60s", () => {
    const handleSkip = vi.fn();
    render(
      <SkipAdButton
        currentTime={10}
        duration={1200}
        isScreenLocked={false}
        onSkipAd={handleSkip}
        defaultSkipSeconds={85}
      />,
    );

    const preset30 = screen.getByTitle("Bỏ qua 30 giây");
    fireEvent.click(preset30);
    expect(handleSkip).toHaveBeenCalledWith(30);

    const preset60 = screen.getByTitle("Bỏ qua 60 giây");
    fireEvent.click(preset60);
    expect(handleSkip).toHaveBeenCalledWith(60);
  });

  it("dismisses button when clicking close icon", () => {
    const handleSkip = vi.fn();
    render(
      <SkipAdButton
        currentTime={10}
        duration={1200}
        isScreenLocked={false}
        onSkipAd={handleSkip}
        defaultSkipSeconds={85}
      />,
    );

    const closeButton = screen.getByTitle("Đóng thông báo");
    fireEvent.click(closeButton);

    expect(screen.queryByTestId("skip-ad-button")).toBeNull();
  });
});
