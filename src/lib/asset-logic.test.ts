/**
 * Unit Tests for Asset Logic (House Assets / 家カルテ)
 */

import { describe, it, expect } from 'vitest';
import { checkAssetProposals, type AssetProposal } from './asset-logic';
import { HouseAsset } from '@/types';

describe('checkAssetProposals', () => {
    it('10年以上経過したエアコンは交換推奨', () => {
        const now = new Date();
        const elevenYearsAgo = new Date(now.getFullYear() - 11, now.getMonth(), now.getDate());

        const assets: HouseAsset[] = [
            {
                id: 'asset-1',
                customer_id: 'customer-1',
                asset_type: 'ac',
                installed_at: elevenYearsAgo.toISOString(),
                metadata: {},
                created_at: now.toISOString(),
            },
        ];

        const proposals = checkAssetProposals(assets);
        expect(proposals.length).toBe(1);
        expect(proposals[0].type).toBe('replacement');
        expect(proposals[0].priority).toBe('high');
        expect(proposals[0].assetId).toBe('asset-1');
    });

    it('8-10年のエアコンはメンテナンス推奨', () => {
        const now = new Date();
        const nineYearsAgo = new Date(now.getFullYear() - 9, now.getMonth(), now.getDate());

        const assets: HouseAsset[] = [
            {
                id: 'asset-1',
                customer_id: 'customer-1',
                asset_type: 'ac',
                installed_at: nineYearsAgo.toISOString(),
                metadata: {},
                created_at: now.toISOString(),
            },
        ];

        const proposals = checkAssetProposals(assets);
        expect(proposals.length).toBe(1);
        expect(proposals[0].type).toBe('maintenance');
        expect(proposals[0].priority).toBe('medium');
    });

    it('15年以上経過したキッチンは交換推奨', () => {
        const now = new Date();
        const sixteenYearsAgo = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());

        const assets: HouseAsset[] = [
            {
                id: 'asset-1',
                customer_id: 'customer-1',
                asset_type: 'kitchen',
                installed_at: sixteenYearsAgo.toISOString(),
                metadata: {},
                created_at: now.toISOString(),
            },
        ];

        const proposals = checkAssetProposals(assets);
        expect(proposals.length).toBe(1);
        expect(proposals[0].type).toBe('replacement');
        expect(proposals[0].priority).toBe('high');
    });

    it('設置日が未設定の資産は提案されない', () => {
        const assets: HouseAsset[] = [
            {
                id: 'asset-1',
                customer_id: 'customer-1',
                asset_type: 'ac',
                installed_at: null,
                metadata: {},
                created_at: new Date().toISOString(),
            },
        ];

        const proposals = checkAssetProposals(assets);
        expect(proposals.length).toBe(0);
    });

    it('複数の資産を一度にチェックできる', () => {
        const now = new Date();
        const oldAc = new Date(now.getFullYear() - 11, now.getMonth(), now.getDate());
        const newKitchen = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

        const assets: HouseAsset[] = [
            {
                id: 'asset-1',
                customer_id: 'customer-1',
                asset_type: 'ac',
                installed_at: oldAc.toISOString(),
                metadata: {},
                created_at: now.toISOString(),
            },
            {
                id: 'asset-2',
                customer_id: 'customer-1',
                asset_type: 'kitchen',
                installed_at: newKitchen.toISOString(),
                metadata: {},
                created_at: now.toISOString(),
            },
        ];

        const proposals = checkAssetProposals(assets);
        expect(proposals.length).toBe(1); // 古いエアコンのみ
        expect(proposals[0].assetId).toBe('asset-1');
    });

    it('大文字小文字を区別せずに資産タイプを判定', () => {
        const now = new Date();
        const oldAc = new Date(now.getFullYear() - 11, now.getMonth(), now.getDate());

        const assets: HouseAsset[] = [
            {
                id: 'asset-1',
                customer_id: 'customer-1',
                asset_type: 'AC', // 大文字
                installed_at: oldAc.toISOString(),
                metadata: {},
                created_at: now.toISOString(),
            },
        ];

        const proposals = checkAssetProposals(assets);
        expect(proposals.length).toBe(1);
    });

    it('ルールにない資産タイプは提案されない', () => {
        const now = new Date();
        const oldAsset = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());

        const assets: HouseAsset[] = [
            {
                id: 'asset-1',
                customer_id: 'customer-1',
                asset_type: 'unknown_type',
                installed_at: oldAsset.toISOString(),
                metadata: {},
                created_at: now.toISOString(),
            },
        ];

        const proposals = checkAssetProposals(assets);
        expect(proposals.length).toBe(0);
    });

    it('Dateオブジェクト形式のinstalled_atも処理できる', () => {
        const now = new Date();
        const oldAc = new Date(now.getFullYear() - 11, now.getMonth(), now.getDate());

        const assets: HouseAsset[] = [
            {
                id: 'asset-1',
                customer_id: 'customer-1',
                asset_type: 'ac',
                installed_at: oldAc, // Dateオブジェクト
                metadata: {},
                created_at: now.toISOString(),
            },
        ];

        const proposals = checkAssetProposals(assets);
        expect(proposals.length).toBe(1);
    });
});







