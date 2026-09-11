import {
  updateVerticalProfileRequestSchema,
  type VerticalProfileCompanySize,
  type VerticalProfileResponse,
} from '@leadradar/shared';
import express, { Router, type NextFunction, type Request, type Response } from 'express';

import type { AppConfig } from '../../config/env';
import { validationError } from '../../errors/app-error';
import { createOriginGuard, requireJsonContentType } from '../../middleware/request-guards';
import { authContext } from '../../middleware/require-auth';
import { VerticalProfileModel } from './vertical-profile.model';

type StoredCompanySize = InstanceType<typeof VerticalProfileModel>['companySize'];

/**
 * Mongoose reports an unset subdocument number as `null`, while the API contract uses
 * optional properties. Dropping the nulls keeps a stored blank out of the response.
 */
function toCompanySize(stored: StoredCompanySize): VerticalProfileCompanySize | undefined {
  if (!stored) {
    return undefined;
  }

  const companySize: VerticalProfileCompanySize = {
    ...(typeof stored.min === 'number' ? { min: stored.min } : {}),
    ...(typeof stored.max === 'number' ? { max: stored.max } : {}),
  };

  return companySize.min === undefined && companySize.max === undefined
    ? undefined
    : companySize;
}

function toResponse(profile: InstanceType<typeof VerticalProfileModel>): VerticalProfileResponse {
  const companySize = toCompanySize(profile.companySize);

  return {
    verticalProfile: {
      id: profile._id.toString(),
      workspaceId: profile.workspaceId.toString(),
      name: profile.name,
      offer: profile.offer,
      targetRoles: profile.targetRoles,
      targetIndustries: profile.targetIndustries,
      ...(companySize ? { companySize } : {}),
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

export function createVerticalProfileRouter(config: AppConfig): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
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

  router.put(
    '/',
    createOriginGuard(config),
    requireJsonContentType,
    express.json({ limit: '100kb' }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { workspaceId } = authContext(req);
        const parsed = updateVerticalProfileRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          // The submitted values and the raw zod issues are deliberately not echoed back.
          throw validationError('The vertical profile was not valid.');
        }

        const input = parsed.data;
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
    },
  );

  return router;
}
