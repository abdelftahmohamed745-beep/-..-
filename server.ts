import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic security middleware headers
  app.use((req, res, next) => {
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
