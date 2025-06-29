const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { database } = require('./database');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
  }

  async validateUser(email, password) {
    try {
      const result = await database.query(
        'SELECT id, email, encrypted_password, full_name, is_active FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return { success: false, message: 'Account is deactivated' };
      }

      // If no password is set (for Azure AD users), allow login
      if (!user.encrypted_password) {
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name
          }
        };
      }

      // Validate password
      const isValid = await bcrypt.compare(password, user.encrypted_password);
      if (!isValid) {
        return { success: false, message: 'Invalid password' };
      }

      // Update last sign in
      await database.query(
        'UPDATE users SET last_sign_in_at = NOW() WHERE id = $1',
        [user.id]
      );

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name
        }
      };

    } catch (error) {
      console.error('Error validating user:', error);
      return { success: false, message: 'Authentication error' };
    }
  }

  async createUser(userData) {
    try {
      const { email, password, fullName, department = 'Data Center Operations' } = userData;

      // Check if user exists
      const existingUser = await database.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return { success: false, message: 'User already exists' };
      }

      // Hash password
      const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

      // Create user
      const result = await database.transaction(async (client) => {
        const userResult = await client.query(
          `INSERT INTO users (email, encrypted_password, full_name, is_active, created_at, email_confirmed_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id, email, full_name`,
          [email, hashedPassword, fullName, true]
        );

        const user = userResult.rows[0];

        // Create user profile
        await client.query(
          `INSERT INTO user_profiles (user_id, full_name, department)
           VALUES ($1, $2, $3)`,
          [user.id, fullName, department]
        );

        // Initialize user stats
        await client.query(
          `INSERT INTO user_stats (user_id)
           VALUES ($1)`,
          [user.id]
        );

        return user;
      });

      return {
        success: true,
        user: {
          id: result.id,
          email: result.email,
          fullName: result.full_name
        }
      };

    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, message: 'Failed to create user' };
    }
  }

  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiry });
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return { success: true, payload: decoded };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { success: false, message: 'Token expired' };
      } else if (error.name === 'JsonWebTokenError') {
        return { success: false, message: 'Invalid token' };
      } else {
        return { success: false, message: 'Token verification failed' };
      }
    }
  }

  async getUserFromToken(token) {
    const verification = this.verifyToken(token);
    if (!verification.success) {
      return verification;
    }

    try {
      const result = await database.query(
        `SELECT u.id, u.email, u.full_name, up.department, up.phone
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.id = $1 AND u.is_active = true`,
        [verification.payload.userId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'User not found or inactive' };
      }

      const user = result.rows[0];
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          department: user.department,
          phone: user.phone
        }
      };

    } catch (error) {
      console.error('Error getting user from token:', error);
      return { success: false, message: 'Failed to get user information' };
    }
  }

  extractTokenFromRequest(request) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  async requireAuth(request) {
    const token = this.extractTokenFromRequest(request);
    if (!token) {
      return { success: false, message: 'No token provided', status: 401 };
    }

    const userResult = await this.getUserFromToken(token);
    if (!userResult.success) {
      return { success: false, message: userResult.message, status: 401 };
    }

    return { success: true, user: userResult.user };
  }
}

// Singleton instance
const authService = new AuthService();

module.exports = {
  authService,
  AuthService
};