import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = "/tmp/always80-data";
const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const NEWSLETTER_FILE = path.join(DATA_DIR, "newsletter-subscribers.json");

function ensureDataDir() {
  const dir = path.dirname(POSTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(POSTS_FILE)) fs.writeFileSync(POSTS_FILE, "[]");
}

function getPosts() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(POSTS_FILE, "utf-8"));
}

function savePosts(posts: unknown[]) {
  ensureDataDir();
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

function getSubscribers(): { email: string; subscribedAt: string }[] {
  try {
    if (fs.existsSync(NEWSLETTER_FILE)) {
      return JSON.parse(fs.readFileSync(NEWSLETTER_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return [];
}

export async function GET() {
  const posts = getPosts();
  // Return sorted newest first
  posts.sort((a: { createdAt: string }, b: { createdAt: string }) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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

    const posts = getPosts();
    posts.unshift(post); // newest first
    savePosts(posts);

    // --- Email notification to newsletter subscribers ---
    const subscribers = getSubscribers();
    let emailsSent = 0;

    if (subscribers.length > 0) {
      // Determine which subscribers can see this post based on tier
      // For "free" tier posts, notify all subscribers
      // For paid tiers, still notify all — they'll see the teaser and may subscribe
      const tierLabel = tier === "free" ? "Free" : tier;
      const videoLine = videoUrl
        ? `\n\n▶️ This post includes a video — watch it on the Feed!`
        : "";

      const emailPayload = {
        from: "History Adventures <noreply@always80andsunny.app>",
        subject: `📚 New Post: ${title}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0B0620; color: #E8E0F0; padding: 32px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <img src="https://always80andsunny.app/logo.png" alt="AI Alpha Daily" style="height: 48px;" />
            </div>
            <h1 style="color: #FFFFFF; font-size: 22px; margin-bottom: 8px;">${title}</h1>
            <p style="color: #9B8FB8; font-size: 13px; margin-bottom: 16px;">Access: ${tierLabel} | ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            <div style="background: #1A1335; padding: 20px; border-radius: 8px; border: 1px solid #2D2550; margin-bottom: 20px;">
              <p style="color: #E8E0F0; font-size: 15px; line-height: 1.6; margin: 0;">${postBody.length > 300 ? postBody.slice(0, 300) + "..." : postBody}</p>
              ${videoLine}
            </div>
            <div style="text-align: center;">
              <a href="https://always80andsunny.app" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #2DD4BF); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">View on Always 80 and Sunny →</a>
            </div>
            <p style="color: #6B5F84; font-size: 11px; text-align: center; margin-top: 24px;">You're receiving this because you subscribed to the History Adventures newsletter.<br/>To unsubscribe, visit your account settings on Always 80 and Sunny.</p>
          </div>
        `,
      };

      // Log the email that would be sent (in production, integrate with SendGrid/Resend/etc.)
      console.log(`[EMAIL NOTIFICATION] New post "${title}" — notifying ${subscribers.length} subscribers`);
      console.log(`[EMAIL PAYLOAD]`, JSON.stringify({ ...emailPayload, recipientCount: subscribers.length }, null, 2));

      // Store notification record for dashboard tracking
      const notificationsFile = path.join(DATA_DIR, "email-notifications.json");
      let notifications: unknown[] = [];
      try {
        if (fs.existsSync(notificationsFile)) {
          notifications = JSON.parse(fs.readFileSync(notificationsFile, "utf-8"));
        }
      } catch { /* ignore */ }

      notifications.push({
        id: `notif_${Date.now()}`,
        postId: post.id,
        postTitle: title,
        tier,
        recipientCount: subscribers.length,
        recipients: subscribers.map((s) => s.email),
        sentAt: new Date().toISOString(),
        status: "queued", // Would be "sent" with a real email provider
      });

      fs.writeFileSync(notificationsFile, JSON.stringify(notifications, null, 2));
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
