import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, insertUserSchema } from "@shared/schema";
import { z } from "zod";

// TypeScript-Fix: Erweiterung der Express Session
declare module 'express-session' {
  interface SessionData {
    passport: {
      user: number; // Benutzer-ID
    };
  }
}

declare global {
  namespace Express {
    // Typangabe für User
    interface User {
      id: number;
      username: string;
      password: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      phoneNumber?: string | null;
      birthDate: Date;
      isActive: boolean;
    }
  }
}

const scryptAsync = promisify(scrypt);

// Export the hashPassword function for use in direct routes
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Export the comparePasswords function for use in direct login routes
export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Session mit fest definiertem Secret für Produktionsumgebung
  const sessionSettings: session.SessionOptions = {
    secret: "achis-einkaufsservice-fixed-secret", // Fest definiertes Secret statt Umgebungsvariable
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 Stunden
      secure: false,
    },
    // Session-Store wird in storage.ts konfiguriert und dann hier verwendet
    store: storage.sessionStore
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error: any) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Extend the insert schema with password confirmation and birthDate as string
      const registerSchema = insertUserSchema.extend({
        confirmPassword: z.string(),
        // Override birthDate to accept string from the frontend
        birthDate: z.string().or(z.instanceof(Date)),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });

      // Parse and validate input data
      const parsedData = registerSchema.parse(req.body);
      
      // Create a processed version with birthDate converted to Date if it's a string
      const userData = {
        ...parsedData,
        birthDate: typeof parsedData.birthDate === 'string' 
          ? new Date(parsedData.birthDate) 
          : parsedData.birthDate
      };
      
      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: await hashPassword(userData.password),
      });

      // Send welcome notification
      await storage.createNotification({
        userId: user.id,
        type: "welcome",
        message: "Willkommen bei Achis Einkaufservice",
        relatedOrderId: null,
        isRead: false
      });

      // Login the user
      req.login(user, (err) => {
        if (err) return next(err);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt with username:", req.body.username);
    // Vereinfachte Login-Implementation
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Invalid credentials for user:", req.body.username);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log("User authenticated successfully:", user.username);
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return next(loginErr);
        }
        
        console.log("Login session created for user:", user.username);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Vereinfachte Logout-Implementation
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Add an admin user for testing if in development
  if (process.env.NODE_ENV !== "production") {
    (async () => {
      const existingAdmin = await storage.getUserByUsername("admin");
      if (!existingAdmin) {
        await storage.createUser({
          username: "admin",
          password: await hashPassword("admin123"),
          firstName: "Admin",
          lastName: "User",
          email: "admin@achis-einkaufservice.de",
          phoneNumber: "+49123456789",
          birthDate: new Date("1990-01-01"),
          role: "admin"
        });
        console.log("Created admin user: admin / admin123");
      }
      
      const existingUser = await storage.getUserByUsername("user");
      if (!existingUser) {
        await storage.createUser({
          username: "user",
          password: await hashPassword("user123"),
          firstName: "Max",
          lastName: "Mustermann",
          email: "max@example.com",
          phoneNumber: "+49987654321",
          birthDate: new Date("1985-05-15"),
          role: "user"
        });
        console.log("Created test user: user / user123");
      }
    })();
  }
}
