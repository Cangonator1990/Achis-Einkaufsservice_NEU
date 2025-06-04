import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      role: string;
      email: string;
      firstName: string;
      lastName: string;
      username: string;
      phoneNumber?: string | null;
      birthDate: Date;
      isActive: boolean;
    }
  }
}