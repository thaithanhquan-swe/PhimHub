import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useAudioBoost, _resetAudioGraphForTesting } from "@/hooks/useAudioBoost";

describe("useAudioBoost persistence and restoration", () => {
  let videoElement: HTMLVideoElement;
  let videoRef: { current: HTMLVideoElement | null };

  beforeEach(() => {
    localStorage.clear();
    _resetAudioGraphForTesting();
    videoElement = document.createElement("video");
    videoRef = { current: videoElement };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _resetAudioGraphForTesting();
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
    const mockSourceNode = { connect: vi.fn(), disconnect: vi.fn() };
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

  it("maintains 500% audio boost when transitioning to a new episode on the same video element", () => {
    const mockGainNode = { gain: { value: 1.0 }, connect: vi.fn() };
    const mockCompressor = {
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: vi.fn(),
    };
    const mockSourceNode = { connect: vi.fn(), disconnect: vi.fn() };
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

    // User had set boost to 500% in previous episode
    localStorage.setItem("phimhub_audio_boost", "5");

    const { result } = renderHook(() => useAudioBoost(videoRef));

    // Episode 1 plays with 500%
    act(() => {
      result.current.initAudioGain();
    });
    expect(mockGainNode.gain.value).toBe(5.0);
    expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledTimes(1);

    // Episode 2 loads on same video element (e.g. stream URL changed)
    act(() => {
      const gain = result.current.initAudioGain();
      expect(gain).toBeTruthy();
    });

    // Gain must remain 5.0 (500%), NOT reset to 1.0 (100%)
    expect(mockGainNode.gain.value).toBe(5.0);
    // Must NOT call createMediaElementSource again on same element (prevents InvalidStateError)
    expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledTimes(1);
  });

  it("maintains 500% audio boost and reuses running AudioContext when switching episodes with remounted video element", () => {
    const mockGainNode = { gain: { value: 1.0 }, connect: vi.fn() };
    const mockCompressor = {
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: vi.fn(),
    };
    const mockSource1 = { connect: vi.fn(), disconnect: vi.fn() };
    const mockSource2 = { connect: vi.fn(), disconnect: vi.fn() };
    let createCallCount = 0;

    const mockAudioContext = {
      state: "running",
      createMediaElementSource: vi.fn((_el: HTMLVideoElement) => {
        createCallCount++;
        return createCallCount === 1 ? mockSource1 : mockSource2;
      }),
      createGain: vi.fn(() => mockGainNode),
      createDynamicsCompressor: vi.fn(() => mockCompressor),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    let audioContextInstances = 0;
    // @ts-expect-error Mock AudioContext constructor
    window.AudioContext = function () {
      audioContextInstances++;
      return mockAudioContext;
    };

    localStorage.setItem("phimhub_audio_boost", "5");

    // Episode 1 mounts with videoElement 1
    const ep1Video = document.createElement("video");
    const ep1Ref = { current: ep1Video };
    const { unmount: unmountEp1 } = renderHook(() => useAudioBoost(ep1Ref));

    // Episode 1 plays with 500%
    expect(mockGainNode.gain.value).toBe(5.0);
    expect(mockSource1.connect).toHaveBeenCalled();

    // Episode 1 unmounts (switching episode)
    unmountEp1();

    // Verify AudioContext was NOT closed on unmount (preventing Chrome autoplay suspension & context exhaustion)
    expect(mockAudioContext.close).not.toHaveBeenCalled();

    // Episode 2 mounts with new videoElement 2
    const ep2Video = document.createElement("video");
    const ep2Ref = { current: ep2Video };
    const { result: ep2Result } = renderHook(() => useAudioBoost(ep2Ref));

    act(() => {
      ep2Result.current.initAudioGain();
    });

    // In Episode 2, gain MUST remain 5.0 (500%), and NOT drop to 100%
    expect(mockGainNode.gain.value).toBe(5.0);
    // Connects new video 2
    expect(mockSource2.connect).toHaveBeenCalled();
    // Reuses the single global AudioContext rather than spawning a new one
    expect(audioContextInstances).toBe(1);
  });

  it("mutes audio gain immediately upon pause event and restores it upon play", () => {
    const mockGainNode = {
      gain: {
        value: 1.0,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn((val: number) => {
          mockGainNode.gain.value = val;
        }),
      },
      connect: vi.fn(),
    };
    const mockCompressor = {
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: vi.fn(),
    };
    const mockSourceNode = { connect: vi.fn(), disconnect: vi.fn() };
    const mockAudioContext = {
      state: "running",
      currentTime: 12.34,
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

    const video = document.createElement("video");
    const ref = { current: video };
    renderHook(() => useAudioBoost(ref));

    expect(mockGainNode.gain.value).toBe(5.0);

    // When video pauses, sound must be silenced immediately (value -> 0)
    act(() => {
      video.dispatchEvent(new Event("pause"));
    });
    expect(mockGainNode.gain.value).toBe(0);
    expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, 12.34);

    // When video resumes, 500% gain must be restored immediately
    act(() => {
      video.dispatchEvent(new Event("play"));
    });
    expect(mockGainNode.gain.value).toBe(5.0);
    expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(5.0, 12.34);
  });
});
