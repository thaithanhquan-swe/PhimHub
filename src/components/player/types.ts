export type QualityOption = {
  index: number; // -1 for auto
  label: string;
  height?: number;
};

export type SettingsTab = "main" | "speed" | "quality" | "ratio" | "audio";

export type DoubleTapFeedbackState = {
  side: "left" | "right";
  seconds: number;
} | null;

export interface VideoPlayerProps {
  m3u8Url?: string;
  embedUrl?: string;
  title: string;
  episodeName?: string;
  poster?: string;
  autoPlay?: boolean;
  hasNextEpisode?: boolean;
  onNextEpisode?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  preferEmbed?: boolean;
}
