import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { storage } from '../database/database-storage.js';
import { type User } from '@shared/sqlite-schema';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
  private readonly JWT_EXPIRES_IN = '24h';

  async login(credentials: LoginCredentials): Promise<User | null> {
    try {
      const user = await storage.getUserByUsername(credentials.username);
      
      if (!user) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(credentials.password, user.password);
      
      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await storage.updateUser(user.id, { 
        lastLogin: new Date() 
      });

      return user;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  async register(data: RegisterData): Promise<User | null> {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return null;
      }

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return null;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await storage.createUser({
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'user',
        firstName: null,
        lastName: null,
        department: null,
        profileImageUrl: null,
        isActive: true,
      });

      return user;
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  }

  generateToken(userId: number): string {
    return jwt.sign(
      { userId },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  validateToken(token: string): { userId: number } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: number };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  async getUserById(userId: number): Promise<User | null> {
    try {
      const user = await storage.getUser(userId);
      return user || null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }
}