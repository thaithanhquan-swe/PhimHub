import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkipAdButton } from "@/components/player/SkipAdButton";

describe("Netflix-style Skip Ad Button", () => {
  it("does NOT render when movie has no ad (hasAd = false)", () => {
    const handleSkip = vi.fn();
    const { container } = render(
      <SkipAdButton
        currentTime={15}
        duration={1200}
        isScreenLocked={false}
        hasAd={false}
        onSkipAd={handleSkip}
      />,
    );

    // Clean movies without ads should NEVER show the skip button
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("skip-ad-button")).toBeNull();
  });

  it("renders SkipAdButton with clean 'Bỏ qua quảng cáo' text when hasAd = true during ad segment (< 85s)", () => {
    const handleSkip = vi.fn();
    render(
      <SkipAdButton
        currentTime={15}
        duration={1200}
        isScreenLocked={false}
        hasAd={true}
        adDuration={85}
        onSkipAd={handleSkip}
      />,
    );

    expect(screen.getByTestId("skip-ad-button")).toBeDefined();
    expect(screen.getByText("Bỏ qua quảng cáo")).toBeDefined();
  });

  it("does not render when currentTime is past the ad threshold (>= adDuration)", () => {
    const handleSkip = vi.fn();
    const { container } = render(
      <SkipAdButton
        currentTime={85}
        duration={1200}
        isScreenLocked={false}
        hasAd={true}
        adDuration={85}
        onSkipAd={handleSkip}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("handles custom ad durations (e.g. 30s intro sponsor clip)", () => {
    const handleSkip = vi.fn();
    const { container, rerender } = render(
      <SkipAdButton
        currentTime={20}
        duration={1200}
        isScreenLocked={false}
        hasAd={true}
        adDuration={30}
        onSkipAd={handleSkip}
      />,
    );

    // Visible at 20s
    expect(screen.getByTestId("skip-ad-button")).toBeDefined();
    const button = screen.getByText("Bỏ qua quảng cáo").closest("button");
    fireEvent.click(button!);
    expect(handleSkip).toHaveBeenCalledWith(30);

    // Past 30s -> hidden
    rerender(
      <SkipAdButton
        currentTime={30}
        duration={1200}
        isScreenLocked={false}
        hasAd={true}
        adDuration={30}
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
        hasAd={true}
        adDuration={85}
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
        hasAd={true}
        adDuration={85}
        onSkipAd={handleSkip}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("calls onSkipAd(85) when clicked for standard 85s ad", () => {
    const handleSkip = vi.fn();
    render(
      <SkipAdButton
        currentTime={10}
        duration={1200}
        isScreenLocked={false}
        hasAd={true}
        adDuration={85}
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
        hasAd={true}
        adDuration={85}
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
        hasAd={true}
        adDuration={85}
        onSkipAd={handleSkip}
      />,
    );

    expect(screen.getByTestId("skip-ad-button")).toBeDefined();
    expect(screen.getByText("Bỏ qua quảng cáo")).toBeDefined();
  });

  it("renders SkipAdButton during mid-roll or post-cold-open adRanges (e.g. at 01:48)", () => {
    const handleSkip = vi.fn();
    const adRanges = [{ start: 100, end: 185 }];

    const { rerender } = render(
      <SkipAdButton
        currentTime={45}
        duration={1400}
        isScreenLocked={false}
        hasAd={true}
        adRanges={adRanges}
        onSkipAd={handleSkip}
      />,
    );

    // Before the ad range -> hidden
    expect(screen.queryByTestId("skip-ad-button")).toBeNull();

    // At 108s (01:48) inside [100, 185] -> visible and skips to 185
    rerender(
      <SkipAdButton
        currentTime={108}
        duration={1400}
        isScreenLocked={false}
        hasAd={true}
        adRanges={adRanges}
        onSkipAd={handleSkip}
      />,
    );

    const button = screen.getByTestId("skip-ad-button").querySelector("button");
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    expect(handleSkip).toHaveBeenCalledWith(185);
  });

  it("hides SkipAdButton immediately once the ad finishes (at and past adRange end)", () => {
    const handleSkip = vi.fn();
    const adRanges = [{ start: 100, end: 130 }];

    const { container, rerender } = render(
      <SkipAdButton
        currentTime={115}
        duration={1431}
        isScreenLocked={false}
        hasAd={true}
        adRanges={adRanges}
        onSkipAd={handleSkip}
      />,
    );

    expect(screen.getByTestId("skip-ad-button")).toBeDefined();

    // Ad finishes at 130s -> button turns off immediately
    rerender(
      <SkipAdButton
        currentTime={130}
        duration={1431}
        isScreenLocked={false}
        hasAd={true}
        adRanges={adRanges}
        onSkipAd={handleSkip}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("skip-ad-button")).toBeNull();
  });
});
