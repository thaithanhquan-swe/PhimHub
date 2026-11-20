import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NetflixIntro } from "@/components/NetflixIntro";

describe("Netflix-style Cinema Intro for PhimHub", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the NetflixIntro with PHIMHUB typography and Bỏ qua button", () => {
    const handleComplete = vi.fn();
    render(<NetflixIntro onComplete={handleComplete} autoPlayAudio={false} />);

    expect(screen.getByText("PHIM")).toBeDefined();
    expect(screen.getByText("HUB")).toBeDefined();
    expect(screen.getByText("Bỏ qua")).toBeDefined();
  });

  it("calls onComplete when user clicks 'Bỏ qua' (Skip)", () => {
    const handleComplete = vi.fn();
    render(<NetflixIntro onComplete={handleComplete} autoPlayAudio={false} />);

    const skipBtn = screen.getByText("Bỏ qua").closest("button");
    expect(skipBtn).not.toBeNull();
    fireEvent.click(skipBtn!);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(handleComplete).toHaveBeenCalled();
  });

  it("calls onComplete when user presses Escape key", () => {
    const handleComplete = vi.fn();
    render(<NetflixIntro onComplete={handleComplete} autoPlayAudio={false} />);

    fireEvent.keyDown(window, { key: "Escape" });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(handleComplete).toHaveBeenCalled();
  });

  it("calls onComplete when user presses Space key", () => {
    const handleComplete = vi.fn();
    render(<NetflixIntro onComplete={handleComplete} autoPlayAudio={false} />);

    fireEvent.keyDown(window, { key: " " });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(handleComplete).toHaveBeenCalled();
  });

  it("automatically completes after full cinematic animation duration", () => {
    const handleComplete = vi.fn();
    render(<NetflixIntro onComplete={handleComplete} autoPlayAudio={false} />);

    expect(handleComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(handleComplete).toHaveBeenCalled();
  });

  it("allows toggling audio mute state", () => {
    const handleComplete = vi.fn();
    render(<NetflixIntro onComplete={handleComplete} autoPlayAudio={false} />);

    const soundBtn = screen.getByTitle("Bật âm thanh intro Ta-dum");
    expect(soundBtn).toBeDefined();

    fireEvent.click(soundBtn);
    expect(screen.getByText("Âm thanh bật")).toBeDefined();
  });
});
