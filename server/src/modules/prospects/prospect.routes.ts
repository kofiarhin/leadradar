import { Router, type NextFunction, type Request, type Response } from 'express';

import { authContext } from '../../middleware/require-auth';
import { ProspectModel } from './prospect.model';

export function createProspectRouter(): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = authContext(req);
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const qualification = typeof req.query.qualification === 'string' ? req.query.qualification : undefined;
      const contact = typeof req.query.contact === 'string' ? req.query.contact : undefined;
      const outreach = typeof req.query.outreach === 'string' ? req.query.outreach : undefined;
      const intent = typeof req.query.intent === 'string' ? req.query.intent : undefined;

      const filter: Record<string, unknown> = { workspaceId };
      if (qualification) filter['qualification.status'] = qualification;
      if (contact) filter['contact.status'] = contact;
      if (outreach) filter['outreach.status'] = outreach;
      if (intent) filter['latestIntent.intent'] = intent;
      if (search) {
        filter.$or = [
          { 'identity.displayName': { $regex: search, $options: 'i' } },
          { 'identity.company': { $regex: search, $options: 'i' } },
          { 'identity.role': { $regex: search, $options: 'i' } },
          { 'contact.businessEmail': { $regex: search, $options: 'i' } },
        ];
      }

      const prospects = await ProspectModel.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
      res.status(200).json({ prospects });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
