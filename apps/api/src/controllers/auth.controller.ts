import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../services/auth.service';
import { env } from '../config/env';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  private setSessionCookie(res: Response, token: string): void {
    res.cookie('dogfood_session', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, token } = await this.service.register(req.body, {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      this.setSessionCookie(res, token);

      res.status(201).json({
        success: true,
        data: { user, token },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, token } = await this.service.login(req.body, {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      this.setSessionCookie(res, token);

      res.status(200).json({
        success: true,
        data: { user, token },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user) {
        await this.service.logout(
          req.user.sessionId,
          req.user.id,
          req.ip || req.socket.remoteAddress
        );
      }

      res.clearCookie('dogfood_session', { path: '/' });

      res.status(200).json({
        success: true,
        data: { message: 'Successfully logged out' },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getMe(req.user!.id);
      res.status(200).json({
        success: true,
        data: { user },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
