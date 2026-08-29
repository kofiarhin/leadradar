import {
  updateVerticalProfileRequestSchema,
  type VerticalProfileResponse,
} from '@leadradar/shared';
import { Router, type NextFunction, type Request, type Response } from 'express';

import { authContext } from '../../middleware/require-auth';
import { VerticalProfileModel } from './vertical-profile.model';

export const verticalProfileRouter: Router = Router();

function toResponse(profile: InstanceType<typeof VerticalProfileModel>): VerticalProfileResponse {
  return {
    verticalProfile: {
      id: profile._id.toString(),
      workspaceId: profile.workspaceId.toString(),
      name: profile.name,
      offer: profile.offer,
      targetRoles: profile.targetRoles,
      targetIndustries: profile.targetIndustries,
      ...(profile.companySize ? { companySize: profile.companySize } : {}),
      targetRegions: profile.targetRegions,
      positiveSignals: profile.positiveSignals,
      negativeSignals: profile.negativeSignals,
      outreachGoal: profile.outreachGoal,
      outreachTone: profile.outreachTone,
      version: profile.version,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    },
  };
}

verticalProfileRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = authContext(req);
    const profile = await VerticalProfileModel.findOne({ workspaceId }).sort({ updatedAt: -1 });

    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vertical profile not found.' } });
      return;
    }

    res.status(200).json(toResponse(profile));
  } catch (error) {
    next(error);
  }
});

verticalProfileRouter.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = authContext(req);
    const input = updateVerticalProfileRequestSchema.parse(req.body);
    const current = await VerticalProfileModel.findOne({ workspaceId }).sort({ updatedAt: -1 });

    if (!current) {
      const created = await VerticalProfileModel.create({ workspaceId, ...input, version: 1 });
      res.status(201).json(toResponse(created));
      return;
    }

    current.set({ ...input, version: current.version + 1 });
    await current.save();
    res.status(200).json(toResponse(current));
  } catch (error) {
    next(error);
  }
});
