import { Router, type NextFunction, type Request, type Response } from 'express';

import { authContext } from '../../middleware/require-auth';
import { ProspectModel } from '../prospects/prospect.model';
import { SignalModel } from '../signals/signal.model';
import { CampaignProspectModel } from './campaign-prospect.model';
import { CampaignModel } from './campaign.model';

export function createCampaignProspectRouter(): Router {
  const router = Router();

  router.get('/:campaignId/prospects', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = authContext(req);
      const campaign = await CampaignModel.findOne({ _id: req.params.campaignId, workspaceId }).select('_id');
      if (!campaign) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
        return;
      }

      const joins = await CampaignProspectModel.find({ workspaceId, campaignId: campaign._id })
        .sort({ updatedAt: -1 })
        .lean();
      const prospectIds = joins.map((value) => value.prospectId);
      const signalIds = joins.map((value) => value.primarySignalId);
      const [prospects, signals] = await Promise.all([
        ProspectModel.find({ workspaceId, _id: { $in: prospectIds } }).lean(),
        SignalModel.find({ workspaceId, _id: { $in: signalIds } }).lean(),
      ]);
      const prospectById = new Map(prospects.map((value) => [value._id.toString(), value]));
      const signalById = new Map(signals.map((value) => [value._id.toString(), value]));

      res.status(200).json({
        prospects: joins.map((join) => ({
          campaignProspect: join,
          prospect: prospectById.get(join.prospectId.toString()),
          primarySignal: signalById.get(join.primarySignalId.toString()),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
