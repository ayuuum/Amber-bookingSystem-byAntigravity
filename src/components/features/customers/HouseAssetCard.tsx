import React from 'react';
import { HouseAsset } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, PenToolIcon, AlertTriangleIcon } from 'lucide-react';
import { format } from 'date-fns';
import { checkAssetProposals } from '@/lib/asset-logic';

interface HouseAssetCardProps {
    asset: HouseAsset;
    onEdit?: (asset: HouseAsset) => void;
}

export function HouseAssetCard({ asset, onEdit }: HouseAssetCardProps) {
    const proposals = checkAssetProposals([asset]);
    const hasProposal = proposals.length > 0;
    const proposalColor = hasProposal ? (proposals[0].priority === 'high' ? 'destructive' : 'default') : 'outline';

    return (
        <Card className="w-full max-w-sm hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            {asset.asset_type}
                            {hasProposal && (
                                <Badge variant={proposalColor as any} className="text-xs">
                                    <AlertTriangleIcon className="w-3 h-3 mr-1" />
                                    Alert
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>{asset.manufacturer} {asset.model_number}</CardDescription>
                    </div>
                    {asset.image_urls && asset.image_urls.length > 0 && (
                        <div className="w-16 h-16 rounded overflow-hidden">
                            <img src={asset.image_urls[0]} alt={asset.asset_type} className="object-cover w-full h-full" />
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="gap-2 grid text-sm">
                <div className="flex items-center text-muted-foreground">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>Installed: {asset.installed_at ? format(new Date(asset.installed_at), 'yyyy-MM-dd') : 'Unknown'}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                    <span className="font-medium mr-2">Location:</span> {asset.location_in_house || 'N/A'}
                </div>

                {hasProposal && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 text-xs">
                        <p className="font-semibold text-yellow-800 dark:text-yellow-200">Proposal Available:</p>
                        <p className="text-yellow-700 dark:text-yellow-300">{proposals[0].message}</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => onEdit?.(asset)}>
                    <PenToolIcon className="w-4 h-4 mr-2" />
                    Edit / View History
                </Button>
            </CardFooter>
        </Card>
    );
}
