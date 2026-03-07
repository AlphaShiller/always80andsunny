"use client";

import { Post, TierName } from "@/types";
import { COLORS } from "@/utils/colors";

function parseVideoEmbed(url: string): string | null {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}

const TIER_COLORS: Record<TierName, { bg: string; text: string }> = {
  free: { bg: "#0D3B2E", text: "#14F195" },
  Explorer: { bg: "#1E1245", text: "#C4B5FD" },
  "Angler Pro": { bg: "#2D1B69", text: "#DDD6FE" },
  "Charter VIP": { bg: "#4C1D95", text: "#F5D0FE" },
};

export default function PostCard({
  post,
  canView,
  onSubscribeClick,
}: {
  post: Post;
  canView: boolean;
  onSubscribeClick: () => void;
}) {
  const embedUrl = post.videoUrl ? parseVideoEmbed(post.videoUrl) : null;
  const tierStyle = TIER_COLORS[post.tier] || TIER_COLORS.free;
  const timeAgo = getTimeAgo(post.createdAt);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: COLORS.cardBg, borderColor: "#2D2550" }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: tierStyle.bg, color: tierStyle.text }}
          >
            {post.tier === "free" ? "FREE" : post.tier.toUpperCase()}
          </span>
          <span className="text-xs" style={{ color: COLORS.midGray }}>
            {timeAgo}
          </span>
        </div>
        <span className="text-xs" style={{ color: COLORS.midGray }}>
          {post.likes} likes
        </span>
      </div>

      {/* Image at top (full width, above content) */}
      {canView && post.imageUrl && (
        <div className="w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full max-h-80 object-cover"
          />
        </div>
      )}

      {/* Video embed at top if no image */}
      {canView && embedUrl && !post.imageUrl && (
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={post.title}
          />
        </div>
      )}

      {/* Content */}
      <div className="px-5 pb-5 relative">
        {canView ? (
          <>
            <h3 className="text-white font-bold text-lg mb-2 mt-4">{post.title}</h3>
            <p
              className="text-sm leading-relaxed mb-4"
              style={{ color: COLORS.lightText }}
            >
              {post.body}
            </p>
            {/* If there's both image AND video, show video below the text */}
            {embedUrl && post.imageUrl && (
              <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={post.title}
                />
              </div>
            )}
          </>
        ) : (
          <div className="relative">
            {/* Blurred preview */}
            <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
              <h3 className="text-white font-bold text-lg mb-2">{post.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: COLORS.lightText }}>
                {post.body.slice(0, 120)}...
              </p>
              {post.videoUrl && (
                <div
                  className="mt-3 rounded-lg"
                  style={{ backgroundColor: "#150F28", height: 180 }}
                />
              )}
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(15, 10, 30, 0.7)" }}>
              <div className="text-3xl mb-2">🔒</div>
              <p className="text-sm font-medium text-white mb-1">
                {post.tier} Tier Content
              </p>
              <p className="text-xs mb-3" style={{ color: COLORS.midGray }}>
                Subscribe to {post.tier} or higher to unlock
              </p>
              <button
                onClick={onSubscribeClick}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all hover:opacity-80"
                style={{ backgroundColor: COLORS.purple }}
              >
                Subscribe to Unlock
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
