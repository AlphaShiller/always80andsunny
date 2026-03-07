"use client";

import { useState, useRef } from "react";
import { Post, TierName } from "@/types";
import { COLORS } from "@/utils/colors";

// Helper to extract YouTube video ID from various URL formats
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function CreatePostForm({
  creatorId,
  onPostCreated,
}: {
  creatorId: number;
  onPostCreated: (post: Post) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tier, setTier] = useState<TierName>("free");
  const [videoUrl, setVideoUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "publishing" | "success" | "error">("idle");
  const [emailInfo, setEmailInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const youtubeId = extractYoutubeId(videoUrl);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setStatus("publishing");
    setEmailInfo(null);

    try {
      // If there's an image file, convert to data URL for storage
      // In production you'd upload to S3/Cloudinary/etc.
      let imageUrl: string | undefined;
      if (imageFile && imagePreview) {
        imageUrl = imagePreview; // base64 data URL — works for dev/demo
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          tier,
          videoUrl: videoUrl.trim() || undefined,
          imageUrl,
          creatorId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      // Notify parent to update the UI immediately
      onPostCreated(data.post);

      // Show email notification info
      if (data.emailNotification?.sent) {
        setEmailInfo(`Email sent to ${data.emailNotification.recipientCount} subscriber${data.emailNotification.recipientCount > 1 ? "s" : ""}!`);
      }

      // Reset form
      setTitle("");
      setBody("");
      setTier("free");
      setVideoUrl("");
      removeImage();
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        setEmailInfo(null);
      }, 5000);
    } catch (err) {
      console.error("Error creating post:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const inputStyle = {
    backgroundColor: "#150F28",
    color: COLORS.lightText,
    border: "1px solid #2D2550",
  };

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: COLORS.cardBg }}>
      <h3 className="text-white font-bold mb-4">Create Post</h3>

      <div className="space-y-3">
        {/* === MEDIA PREVIEW AT TOP === */}
        {(imagePreview || youtubeId) && (
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: "#2D2550" }}>
            {youtubeId && !imagePreview ? (
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title="Video preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Upload preview"
                  className="w-full max-h-64 object-cover"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                >
                  ✕
                </button>
              </div>
            ) : null}
            {youtubeId && imagePreview && (
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title="Video preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )}

        {/* Media Attach Buttons */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:opacity-80"
            style={{ backgroundColor: "#2D2550", color: COLORS.lightText }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {imagePreview ? "Change Image" : "Attach Image"}
          </button>
          <span className="text-xs" style={{ color: COLORS.midGray }}>or paste a YouTube link below</span>
        </div>

        {/* Title */}
        <input
          type="text"
          placeholder="Post title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
          style={inputStyle}
        />

        {/* Body */}
        <textarea
          placeholder="Write your post content..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y focus:border-purple-500"
          style={inputStyle}
        />

        {/* Tier + Video URL row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: COLORS.midGray }}>
              Access Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as TierName)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              <option value="free">Free — Everyone</option>
              <option value="Explorer">Explorer ($9.99/mo)</option>
              <option value="Angler Pro">Angler Pro ($19.99/mo)</option>
              <option value="Charter VIP">Charter VIP ($29.99/mo)</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: COLORS.midGray }}>
              Video URL (optional)
            </label>
            <input
              type="text"
              placeholder="YouTube or Vimeo link..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !body.trim() || status === "publishing"}
            className="px-5 py-2 rounded-lg font-semibold text-sm text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-80"
            style={{ backgroundColor: COLORS.purple }}
          >
            {status === "publishing" ? "Publishing..." : "Publish Post"}
          </button>
          {status === "success" && (
            <span className="text-xs font-medium" style={{ color: COLORS.teal }}>
              Post published! Check the Feed tab.
            </span>
          )}
          {status === "error" && (
            <span className="text-xs font-medium" style={{ color: "#DC2626" }}>
              Failed to publish. Try again.
            </span>
          )}
          {emailInfo && (
            <span className="text-xs font-medium flex items-center gap-1" style={{ color: "#60A5FA" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {emailInfo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
