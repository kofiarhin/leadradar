import type { WorkspaceResponse } from '@leadradar/shared';
import { Router, type NextFunction, type Request, type Response } from 'express';

import { authRequired } from '../../errors/app-error';
import { authContext } from '../../middleware/require-auth';
import { WorkspaceModel } from './workspace.model';

export const workspaceRouter: Router = Router();

/**
 * The authenticated owner's workspace.
 *
 * The identifier comes from the session; any workspaceId in the query or body is
 * ignored, so a client cannot reach another workspace by asking for it.
 */
workspaceRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = authContext(req);
    const workspace = await WorkspaceModel.findById(workspaceId);

    if (!workspace) {
      throw authRequired();
    }

    const body: WorkspaceResponse = {
      workspace: { id: workspace._id.toString(), name: workspace.name },
    };

    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
});
