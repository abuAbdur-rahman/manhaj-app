export type Language = "yoruba" | "english" | "arabic";

export type Speed = 0.75 | 1 | 1.25 | 1.5 | 2;

export type Tag =
  | "aqeedah"
  | "fiqh"
  | "tafseer"
  | "hadith"
  | "seerah"
  | "manhaj"
  | "adab"
  | "family"
  | "ibadah"
  | "dawah"
  | "ruqyah"
  | "arabic";

export interface Scholar {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  languages: Language[];
  social_links: {
    youtube?: string;
    telegram?: string;
    whatsapp?: string;
    website?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  series_count?: number;
  episode_count?: number;
}

export interface Series {
  id: string;
  scholar_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  scholar?: Scholar;
  episode_count?: number;
}

export interface Episode {
  id: string;
  series_id: string | null;
  scholar_id: string;
  title: string;
  slug: string;
  description: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  language: Language;
  tags: Tag[];
  recorded_date: string | null;
  play_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  scholar?: Scholar;
  series?: Series | null;
}

export interface PlayerState {
  currentEpisode: Episode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: Speed;
  isLoading: boolean;
  sleepTimer: number | null;
}

export interface DownloadedEpisode {
  episode: Episode;
  downloadedAt: string;
  fileSizeBytes: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}
