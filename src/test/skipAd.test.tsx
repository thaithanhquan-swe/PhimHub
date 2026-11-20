import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkipAdButton } from "@/components/player/SkipAdButton";

describe("Netflix-style Skip Ad Button", () => {
  it("renders SkipAdButton with clean 'Bỏ qua quảng cáo' text during the ad segment (< 85s)", () => {
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

  it("does not render when currentTime is past the ad threshold (>= 85s)", () => {
    const handleSkip = vi.fn();
    const { container } = render(
      <SkipAdButton
        currentTime={85}
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

  it("calls onSkipAd(85) when clicked", () => {
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
  });

  it("reappears when user seeks from a later part of the video back to the ad segment", () => {
    const handleSkip = vi.fn();
    const { rerender } = render(
      <SkipAdButton
        currentTime={500}
        duration={1200}
        isScreenLocked={false}
        onSkipAd={handleSkip}
      />,
    );

    // Later in video -> hidden
    expect(screen.queryByTestId("skip-ad-button")).toBeNull();

    // User seeks back into ad segment (< 85s) -> reappears!
    rerender(
      <SkipAdButton
        currentTime={25}
        duration={1200}
        isScreenLocked={false}
        onSkipAd={handleSkip}
      />,
    );

    expect(screen.getByTestId("skip-ad-button")).toBeDefined();
    expect(screen.getByText("Bỏ qua quảng cáo")).toBeDefined();
  });
});
