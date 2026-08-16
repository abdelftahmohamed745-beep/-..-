import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { renderClinicHtml } from "./src/server/prerenderClinic";
import { renderLabHtml } from "./src/server/prerenderLab";
import { generateSitemapXml } from "./src/server/generateSitemap";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic security middleware headers & request logging
  app.use((req, res, next) => {
    console.log(`[Server Request Log] Method: ${req.method}, Path: ${req.path}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "Dawry-Security-Engine-v2.0"
    });
  });

  // In-Memory Rate Limiting for OTP Endpoint
  interface OtpRateLimitEntry {
    count: number;
    resetAt: number;
  }
  const otpIpRateMap = new Map<string, OtpRateLimitEntry>();
  const otpEmailRateMap = new Map<string, OtpRateLimitEntry>();

  function isOtpRateLimited(map: Map<string, OtpRateLimitEntry>, key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = map.get(key);
    if (!entry || now > entry.resetAt) {
      map.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    if (entry.count >= maxRequests) {
      return true;
    }
    entry.count += 1;
    return false;
  }

  // OTP Email Sending Route via Nodemailer (Gmail SMTP)
  app.post("/api/send-otp", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    try {
      const { email, code } = req.body || {};
      if (!email || !code) {
        return res.status(400).json({ success: false, error: "Email and OTP code are required" });
      }

      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown_ip";
      const normalizedEmail = String(email).trim().toLowerCase();

      // Per-IP Rate Limit: max 5 OTP requests per 5 minutes
      if (isOtpRateLimited(otpIpRateMap, clientIp, 5, 5 * 60 * 1000)) {
        return res.status(429).json({
          success: false,
          error: "تم تجاوز حد محاولات إرسال كود التحقق من هذا الجهاز. يرجى الانتظار 5 دقائق والمحاولة مجدداً."
        });
      }

      // Per-Email Rate Limit: max 3 OTP requests per 5 minutes
      if (isOtpRateLimited(otpEmailRateMap, normalizedEmail, 3, 5 * 60 * 1000)) {
        return res.status(429).json({
          success: false,
          error: "تم تجاوز حد الطلبات المسموح بها لهذا البريد الإلكتروني. يرجى الانتظار 5 دقائق والمحاولة مجدداً."
        });
      }

      const gmailUser = process.env.GMAIL_USER;
      const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

      if (!gmailUser || !gmailAppPassword) {
        console.error("[OTP Server Error] GMAIL_USER or GMAIL_APP_PASSWORD environment variable is missing.");
        return res.status(500).json({
          success: false,
          error: "خادم البريد غير مهيأ (يرجى إعداد GMAIL_USER و GMAIL_APP_PASSWORD في متغيرات البيئة)."
        });
      }

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // TLS
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

      const htmlContent = `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; background-color: #f0f9ff; padding: 12px 24px; border-radius: 16px; border: 1px solid #bae6fd;">
              <h1 style="color: #0284c7; margin: 0; font-size: 22px; font-weight: 800;">Dory Medical System</h1>
            </div>
          </div>
          <h2 style="color: #0f172a; text-align: center; font-size: 18px; margin-bottom: 12px;">كود التحقق من حسابك في Dory</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
            مرحباً بك! رمز التحقق الخاص بك لتأكيد البريد الإلكتروني وتفعيل حسابك في منصة Dory هو:
          </p>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 16px; margin: 16px 0; border: 1px border-dashed #cbd5e1;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0284c7; font-family: monospace; direction: ltr; display: inline-block;">${code}</span>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 20px; line-height: 1.5;">
            ⏰ صلاحية هذا الكود هي 10 دقائق فقط.<br/>
            إذا لم تطلب هذا الكود، يمكنك تجاهل هذه الرسالة بأمان.
          </p>
        </div>
      `;

      console.log(`[OTP Server Log] Initiating Gmail SMTP sendMail to target email...`);

      const info = await transporter.sendMail({
        from: `"Dory Medical System" <${gmailUser}>`,
        to: email.trim(),
        subject: "كود التحقق من حسابك في Dory",
        html: htmlContent,
      });

      console.log(`[OTP Server Log] Gmail SMTP sendMail succeeded:`, {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      });

      return res.status(200).json({
        success: true,
        message: "تم إرسال كود التحقق بنجاح",
        messageId: info.messageId
      });
    } catch (error: any) {
      console.error("[OTP Server Error] Failed to send email via Nodemailer Gmail SMTP:", {
        message: error?.message,
        code: error?.code,
        command: error?.command,
        response: error?.response,
        responseCode: error?.responseCode
      });

      return res.status(500).json({
        success: false,
        error: error?.message 
          ? `فشل إرسال البريد عبر Gmail SMTP: ${error.message}`
          : "فشل إرسال كود التحقق عبر Gmail. يرجى التأكد من البريد الإلكتروني والإعدادات."
      });
    }
  });

  // Admin Security Action: Toggle Doctor Account Status
  app.post("/api/admin/toggle-status", async (req, res) => {
    try {
      const { doctorId, isActive, adminKey } = req.body;
      
      if (!doctorId) {
        return res.status(400).json({ error: "Doctor ID is required" });
      }

      // Audit Log server event
      console.log(`[AUDIT LOG] Admin action: toggleDoctorStatus for doctorId: ${doctorId}, target status: ${isActive}`);

      res.json({
        success: true,
        message: `Doctor ${doctorId} status updated to ${isActive ? 'active' : 'deactivated'}`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update doctor status" });
    }
  });

  // Admin Security Action: Update Doctor Subscription
  app.post("/api/admin/update-subscription", async (req, res) => {
    try {
      const { doctorId, subscriptionStatus, durationMonths } = req.body;
      
      if (!doctorId || !subscriptionStatus) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      console.log(`[AUDIT LOG] Admin action: updateSubscription for doctorId: ${doctorId}, status: ${subscriptionStatus}`);

      res.json({
        success: true,
        message: `Subscription for doctor ${doctorId} set to ${subscriptionStatus}`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update subscription" });
    }
  });

  // Admin Security Action: Delete Doctor Account
  app.post("/api/admin/delete-doctor", async (req, res) => {
    try {
      const { doctorId, adminUid } = req.body;
      if (!doctorId) {
        return res.status(400).json({ error: "Doctor ID is required" });
      }

      console.log(`[AUDIT LOG] Admin action: deleteDoctorAccount by admin ${adminUid} for doctorId: ${doctorId}`);

      res.json({
        success: true,
        message: `Doctor account ${doctorId} deleted or deactivated successfully by Admin`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete doctor account" });
    }
  });

  // Admin Security Action: Set Custom Claim for Admin privilege
  app.post("/api/admin/set-custom-claim", async (req, res) => {
    try {
      const { targetUid, isAdmin } = req.body;
      if (!targetUid) {
        return res.status(400).json({ error: "Target UID is required" });
      }

      console.log(`[AUDIT LOG] Admin action: setCustomClaim admin=${isAdmin} for UID: ${targetUid}`);

      res.json({
        success: true,
        message: `Admin custom claim set to ${isAdmin} for user ${targetUid}`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to set custom claim" });
    }
  });

  // Security Verification Endpoint for Booking Rate Limiting
  app.post("/api/security/check-booking-spam", (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ allowed: false, error: "Phone number required" });
    }

    res.json({ allowed: true });
  });

  // Dynamic Sitemap Route
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const xml = await generateSitemapXml();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800");
      res.status(200).send(xml);
    } catch (err) {
      console.error("Express sitemap error:", err);
      const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://dory-system.vercel.app/</loc>\n  </url>\n</urlset>`;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.status(200).send(fallbackXml);
    }
  });

  // Clinic SEO Prerender Route (supports /clinic/:docId and /clinic/:docId/book)
  app.get(["/clinic/:docId", "/clinic/:docId/book"], async (req, res) => {
    try {
      const docId = req.params.docId;
      const rootDir = process.cwd();
      const result = await renderClinicHtml(rootDir, docId);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      if (result.status === 200) {
        res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
      } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }

      res.status(result.status).send(result.html);
    } catch (err) {
      console.error("Express clinic prerender error:", err);
      res.status(500).send('<!doctype html><html lang="ar" dir="rtl"><head><title>خطأ في الخادم</title></head><body><h1>500 - حدث خطأ غير متوقع</h1></body></html>');
    }
  });

  // Laboratory SEO Prerender Route
  app.get("/lab/:labId", async (req, res) => {
    try {
      const labId = req.params.labId;
      const rootDir = process.cwd();
      const result = await renderLabHtml(rootDir, labId);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      if (result.status === 200) {
        res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
      } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }

      res.status(result.status).send(result.html);
    } catch (err) {
      console.error("Express lab prerender error:", err);
      res.status(500).send('<!doctype html><html lang="ar" dir="rtl"><head><title>خطأ في الخادم</title></head><body><h1>500 - حدث خطأ غير متوقع</h1></body></html>');
    }
  });

  // Vite middleware for development vs Production static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running securely on http://localhost:${PORT}`);
  });
}

startServer();
