export type VideoStatus =
  | "planned"
  | "filmed"
  | "on_drive"
  | "editing"
  | "ready"
  | "published";

export type Network =
  | "instagram"
  | "tiktok"
  | "youtube_short"
  | "youtube"
  | "facebook";

export interface Video {
  id: string;
  title: string;
  description: string | null;
  shoot_date: string | null;
  publish_date: string | null;
  publish_time: string | null;
  status: VideoStatus;
  networks: Network[];
  drive_link: string | null;
  cover_ready: boolean;
  cta_ready: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Copy {
  id: string;
  video_id: string;
  network: Network;
  caption: string | null;
  hashtags: string | null;
  ai_generated: boolean;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  video_id: string;
  item_key: string;
  checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
}

export interface Analytics {
  id: string;
  video_id: string;
  network: Network;
  recorded_at: string;
  views: number;
  saves: number;
  shares: number;
  comments: number;
  new_followers: number;
  notes: string | null;
}

export interface VideoNote {
  id: string;
  video_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: { name: string | null };
}

export interface Profile {
  id: string;
  name: string | null;
  role: "creator" | "editor" | null;
}

export const STATUS_LABELS: Record<VideoStatus, string> = {
  planned: "מתוכנן",
  filmed: "צולם",
  on_drive: "בדרייב",
  editing: "בעריכה",
  ready: "מוכן לעלייה",
  published: "עלה",
};

export const STATUS_EMOJI: Record<VideoStatus, string> = {
  planned: "📅",
  filmed: "🎬",
  on_drive: "☁️",
  editing: "✂️",
  ready: "✅",
  published: "🚀",
};

export const STATUS_COLORS: Record<VideoStatus, string> = {
  planned: "bg-gray-100 text-gray-700 border-gray-200",
  filmed: "bg-blue-100 text-blue-700 border-blue-200",
  on_drive: "bg-purple-100 text-purple-700 border-purple-200",
  editing: "bg-amber-100 text-amber-700 border-amber-200",
  ready: "bg-green-100 text-green-700 border-green-200",
  published: "bg-teal-100 text-teal-700 border-teal-200",
};

export const STATUS_BG: Record<VideoStatus, string> = {
  planned: "bg-gray-50 border-gray-200",
  filmed: "bg-blue-50 border-blue-200",
  on_drive: "bg-purple-50 border-purple-200",
  editing: "bg-amber-50 border-amber-200",
  ready: "bg-green-50 border-green-200",
  published: "bg-teal-50 border-teal-200",
};

export const NETWORK_LABELS: Record<Network, string> = {
  instagram: "אינסטגרם",
  tiktok: "טיקטוק",
  youtube_short: "יוטיוב שורטס",
  youtube: "יוטיוב",
  facebook: "פייסבוק",
};

export const NETWORK_COLORS: Record<Network, string> = {
  instagram: "bg-pink-100 text-pink-700",
  tiktok: "bg-gray-900 text-white",
  youtube_short: "bg-red-100 text-red-700",
  youtube: "bg-red-100 text-red-700",
  facebook: "bg-blue-100 text-blue-700",
};

export const ALL_STATUSES: VideoStatus[] = [
  "planned",
  "filmed",
  "on_drive",
  "editing",
  "ready",
  "published",
];

export const ALL_NETWORKS: Network[] = [
  "instagram",
  "tiktok",
  "youtube_short",
  "youtube",
  "facebook",
];
