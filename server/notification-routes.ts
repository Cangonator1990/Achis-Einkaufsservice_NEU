import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export function registerNotificationRoutes(app: Express, isAuthenticated: (req: Request, res: Response, next: NextFunction) => void) {
  // Testendpunkt, der garantiert eine Benachrichtigung erstellt
  app.get("/api/test/create-notification", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Nicht autorisiert" });
      }
      
      console.log("Erstelle Test-Benachrichtigung für Benutzer:", req.user.id);
      
      const testNotification = await storage.createNotification({
        userId: req.user.id,
        type: "new_order",
        message: "Test-Benachrichtigung für Debug-Zwecke",
        isRead: false,
        triggeredByUserId: req.user.id
      });
      
      console.log("Test-Benachrichtigung erfolgreich erstellt:", testNotification);
      
      res.json({ success: true, notification: testNotification });
    } catch (error) {
      console.error("Fehler beim Erstellen der Test-Benachrichtigung:", error);
      res.status(500).json({ message: "Fehler beim Erstellen der Test-Benachrichtigung" });
    }
  });
  // GET all notifications for the authenticated user
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log("Fetching notifications for user:", req.user.id);
      
      try {
        const notifications = await storage.getNotificationsByUserId(req.user.id);
        console.log("Retrieved notifications:", notifications ? notifications.length : 0);
        res.json(notifications || []);
      } catch (dbError) {
        console.error("Database error while fetching notifications:", dbError);
        // Send empty array instead of error to prevent UI from breaking
        res.json([]);
      }
    } catch (error) {
      console.error("Unexpected error in notifications endpoint:", error);
      // Send empty array instead of error to prevent UI from breaking
      res.json([]);
    }
  });

  // GET unread notification count
  app.get("/api/notifications/unread/count", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const count = await storage.getUnreadNotificationCount(req.user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Error fetching notification count" });
    }
  });

  // PATCH mark notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const notificationId = parseInt(req.params.id);
      
      // Verify that notification exists and belongs to the user
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.markNotificationAsRead(notificationId);
      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, message: "Failed to mark notification as read" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error marking notification as read" });
    }
  });

  // PATCH mark all notifications as read
  app.patch("/api/notifications/read-all", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await storage.markAllNotificationsAsRead(req.user.id);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error marking notifications as read" });
    }
  });
  
  // DELETE a single notification
  app.delete("/api/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const notificationId = parseInt(req.params.id);
      
      // Verify that notification exists and belongs to the user
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Benachrichtigung nicht gefunden" });
      }
      
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: "Keine Berechtigung zum Löschen dieser Benachrichtigung" });
      }
      
      const success = await storage.deleteNotification(notificationId);
      
      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, message: "Benachrichtigung konnte nicht gelöscht werden" });
      }
    } catch (error) {
      console.error("Fehler beim Löschen der Benachrichtigung:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Benachrichtigung" });
    }
  });
  
  // DELETE all notifications for a user
  app.delete("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const success = await storage.deleteAllNotifications(req.user.id);
      
      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, message: "Benachrichtigungen konnten nicht gelöscht werden" });
      }
    } catch (error) {
      console.error("Fehler beim Löschen aller Benachrichtigungen:", error);
      res.status(500).json({ message: "Fehler beim Löschen aller Benachrichtigungen" });
    }
  });
}