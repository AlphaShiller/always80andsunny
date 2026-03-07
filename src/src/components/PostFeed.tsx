"use client";

import { useState } from "react";
import { Post, TierName } from "@/types";
import { COLORS } from "@/utils/colors";
import PostCard from "./PostCard";

type FilterTab = "all" | "free" | "unlocked";

export default function PostFeed({
  posts,
  canViewTier,
  onSubscribeClick,
}: {
  posts: Post[];
  canViewTier: (tier: TierName) => boolean;
  onSubscribeClick: () => void;
}) {
  const [filter, setFilter] = useState<FilterTab>("all");

  // Sort by date, newest first
  const sorted = [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filtered = sorted.filter((post) => {
    if (filter === "free") return post.tier === "free";
    if (filter === "unlocked") return canViewTier(post.tier);
    return true;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All Posts" },
    { key: "free", label: "Free" },
    { key: "unlocked", label: "My Access" },
  ];

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: filter === tab.key ? COLORS.purple : "transparent",
              color: filter === tab.key ? "white" : COLORS.lightText,
            }}
          >
            {tab.label}
          </button>
        ))}
        <span
          className="ml-auto text-xs self-center"
          style={{ color: COLORS.midGray }}
        >
          {filtered.length} post{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Posts */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center border"
          style={{ backgroundColor: COLORS.cardBg, borderColor: "#2D2550" }}
        >
          <p className="text-sm" style={{ color: COLORS.midGray }}>
            {filter === "unlocked"
              ? "Subscribe to a tier to unlock exclusive content."
              : "No posts yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canView={canViewTier(post.tier)}
              onSubscribeClick={onSubscribeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
