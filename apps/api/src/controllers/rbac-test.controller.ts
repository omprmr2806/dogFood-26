import { Request, Response } from 'express';

export class RbacTestController {
  adminTest = (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      data: {
        message: 'ADMIN access verified successfully.',
        role: req.user?.role,
        userId: req.user?.id
      }
    });
  };

  organizerTest = (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      data: {
        message: 'ORGANIZER access verified successfully.',
        role: req.user?.role,
        userId: req.user?.id
      }
    });
  };

  judgeTest = (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      data: {
        message: 'JUDGE access verified successfully.',
        role: req.user?.role,
        userId: req.user?.id
      }
    });
  };

  participantTest = (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      data: {
        message: 'PARTICIPANT access verified successfully.',
        role: req.user?.role,
        userId: req.user?.id
      }
    });
  };
}

export const rbacTestController = new RbacTestController();
