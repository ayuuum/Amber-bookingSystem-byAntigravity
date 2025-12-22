import { differenceInYears, parseISO } from 'date-fns';
import { HouseAsset } from '@/types';

export interface AssetProposal {
    assetId: string;
    type: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
}

/**
 * Rules for asset replacement proposals
 */
const PROPOSAL_RULES: Record<string, number> = {
    ac: 10,       // Air Conditioner: 10 years
    kitchen: 15,  // Kitchen: 15 years
    bath: 20,     // Bath: 20 years
    toilet: 15,   // Toilet: 15 years
    heater: 10,   // Water Heater: 10 years
};

export function checkAssetProposals(assets: HouseAsset[]): AssetProposal[] {
    const proposals: AssetProposal[] = [];
    const now = new Date();

    assets.forEach(asset => {
        if (!asset.installed_at) return;

        const installDate = typeof asset.installed_at === 'string' ? parseISO(asset.installed_at) : asset.installed_at;
        const yearsOld = differenceInYears(now, installDate);
        const threshold = PROPOSAL_RULES[asset.asset_type.toLowerCase()];

        if (threshold) {
            if (yearsOld >= threshold) {
                proposals.push({
                    assetId: asset.id,
                    type: 'replacement',
                    message: `${asset.asset_type} is ${yearsOld} years old. Recommended replacement age is ${threshold} years.`,
                    priority: 'high'
                });
            } else if (yearsOld >= threshold - 2) {
                proposals.push({
                    assetId: asset.id,
                    type: 'maintenance',
                    message: `${asset.asset_type} is ${yearsOld} years old. Approaching replacement age (${threshold} years). Consider maintenance or early quote.`,
                    priority: 'medium'
                });
            }
        }
    });

    return proposals;
}
