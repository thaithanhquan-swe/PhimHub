import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useAudioBoost } from "@/hooks/useAudioBoost";

describe("useAudioBoost persistence and restoration", () => {
  let videoElement: HTMLVideoElement;
  let videoRef: { current: HTMLVideoElement | null };

  beforeEach(() => {
    localStorage.clear();
    videoElement = document.createElement("video");
    videoRef = { current: videoElement };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("loads 500% (5.0) audio boost factor from localStorage upon initial mount (F5)", () => {
    localStorage.setItem("phimhub_audio_boost", "5");

    const { result } = renderHook(() => useAudioBoost(videoRef));

    expect(result.current.audioBoostFactor).toBe(5.0);
  });

  it("persists 500% setting to localStorage when user chooses maximum boost", () => {
    const { result } = renderHook(() => useAudioBoost(videoRef));

    act(() => {
      result.current.setBoostLevel(5.0);
    });

    expect(result.current.audioBoostFactor).toBe(5.0);
    expect(localStorage.getItem("phimhub_audio_boost")).toBe("5");
  });

  it("configures AudioContext with 500% gain when AudioContext is supported", () => {
    const mockGainNode = { gain: { value: 1.0 }, connect: vi.fn() };
    const mockCompressor = {
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: vi.fn(),
    };
    const mockSourceNode = { connect: vi.fn() };
    const mockAudioContext = {
      state: "running",
      createMediaElementSource: vi.fn(() => mockSourceNode),
      createGain: vi.fn(() => mockGainNode),
      createDynamicsCompressor: vi.fn(() => mockCompressor),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // @ts-expect-error Mock AudioContext constructor
    window.AudioContext = function () {
      return mockAudioContext;
    };

    localStorage.setItem("phimhub_audio_boost", "5");

    const { result } = renderHook(() => useAudioBoost(videoRef));

    act(() => {
      const gain = result.current.initAudioGain();
      expect(gain).toBeTruthy();
    });

    expect(mockGainNode.gain.value).toBe(5.0);
  });
});
