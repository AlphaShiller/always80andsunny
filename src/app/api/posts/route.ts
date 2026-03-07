import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const POSTS_KEY = "posts.json";
const NEWSLETTER_KEY = "newsletter-subscribers.json";
const NOTIFICATIONS_KEY = "email-notifications.json";

async function readBlob<T>(key: string, fallback: T): Promise<T> {
  try {
    const { blobs } = await list({ prefix: key });
    if (blobs.length === 0) return fallback;
    const res = await fetch(blobs[0].downloadUrl, { cache: "no-store" });
    return await res.json();
  } catch {
    return fallback;
  }
}

async function writeBlob(key: string, data: unknown) {
  await put(key, JSON.stringify(data, null, 2), {
    access: "private",
    addRandomSuffix: false,
  });
}

export async function GET() {
  const posts = await readBlob<unknown[]>(POSTS_KEY, []);
  posts.sort((a: unknown, b: unknown) => {
    const aDate = (a as { createdAt: string }).createdAt;
    const bDate = (b as { createdAt: string }).createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: postBody, tier, videoUrl, imageUrl, creatorId } = body;

    if (!title?.trim() || !postBody?.trim()) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    const post = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      creatorId: creatorId || 1,
      title: title.trim(),
      body: postBody.trim(),
      tier: tier || "free",
      videoUrl: videoUrl?.trim() || undefined,
      imageUrl: imageUrl || undefined,
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    const posts = await readBlob<unknown[]>(POSTS_KEY, []);
    posts.unshift(post);
    await writeBlob(POSTS_KEY, posts);

    // --- Email notification to newsletter subscribers ---
    const subscribers = await readBlob<{ email: string; subscribedAt: string }[]>(NEWSLETTER_KEY, []);
    let emailsSent = 0;

    if (subscribers.length > 0) {
      const tierLabel = tier === "free" ? "Free" : tier;
      const videoLine = videoUrl
        ? `\n\n▶️ This post includes a video — watch it on the Feed!`
        : "";

      console.log(`[EMAIL NOTIFICATION] New post "${title}" — notifying ${subscribers.length} subscribers`);
      console.log(`[EMAIL PAYLOAD]`, JSON.stringify({
        from: "Always 80 and Sunny <noreply@always80andsunny.app>",
        subject: `🎣 New Post: ${title}`,
        tierLabel,
        videoLine,
        recipientCount: subscribers.length,
      }, null, 2));

      const notifications = await readBlob<unknown[]>(NOTIFICATIONS_KEY, []);
      notifications.push({
        id: `notif_${Date.now()}`,
        postId: post.id,
        postTitle: title,
        tier,
        recipientCount: subscribers.length,
        recipients: subscribers.map((s) => s.email),
        sentAt: new Date().toISOString(),
        status: "queued",
      });
      await writeBlob(NOTIFICATIONS_KEY, notifications);
      emailsSent = subscribers.length;
    }

    return NextResponse.json({
      post,
      emailNotification: {
        sent: emailsSent > 0,
        recipientCount: emailsSent,
        message: emailsSent > 0
          ? `Notification queued for ${emailsSent} subscriber${emailsSent > 1 ? "s" : ""}`
          : "No subscribers to notify",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
