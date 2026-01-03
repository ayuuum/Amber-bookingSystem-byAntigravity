"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/ui/loading'

interface PlanInfo {
    name: string
    price: string
    description: string
    features: string[]
    limits: {
        stores: number | string
        staff: number | string
        houseAssets: number | string
    }
    popular?: boolean
}

const plans: Record<'starter' | 'growth' | 'enterprise', PlanInfo> = {
    starter: {
        name: 'Starter',
        price: '¥0',
        description: '個人事業主・テスト導入向け',
        features: [
            'オンライン予約・決済',
            'カレンダー管理',
            'Stripe決済連携（基本）',
        ],
        limits: {
            stores: 1,
            staff: 3,
            houseAssets: 50,
        },
    },
    growth: {
        name: 'Growth',
        price: '¥9,800',
        description: '成長中の店舗・複数展開店向け',
        features: [
            'Starterの全機能',
            'LINE通知・自動リマインド',
            '詳細分析ダッシュボード',
            'Google カレンダー同期',
        ],
        limits: {
            stores: 3,
            staff: '無制限',
            houseAssets: 500,
        },
        popular: true,
    },
    enterprise: {
        name: 'Enterprise',
        price: '個別見積もり',
        description: '大手FC・ホールディングス向け',
        features: [
            'Growthの全機能',
            '本部一括管理・分析',
            'AI 予約代行 (Phase 2)',
            '優先サポート',
            'データ一括出力',
        ],
        limits: {
            stores: '無制限',
            staff: '無制限',
            houseAssets: '無制限',
        },
    },
}

export default function PlanSelectionPage() {
    const [currentPlan, setCurrentPlan] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [changing, setChanging] = useState<string | null>(null)
    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        let isMounted = true;
        let hasFetched = false; // Prevent multiple simultaneous fetches

        const fetchCurrentPlan = async () => {
            // Prevent multiple simultaneous fetches
            if (hasFetched) return;
            hasFetched = true;

            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser()
                
                // Network errors should not trigger state updates
                if (userError) {
                    if (userError.message?.includes('Failed to fetch') || 
                        userError.message?.includes('NetworkError') ||
                        userError.name === 'NetworkError') {
                        console.error('[PlanPage] Network error during auth check:', userError.message);
                        if (isMounted) {
                            setLoading(false);
                        }
                        return;
                    }
                }

                if (!user) {
                    if (isMounted) {
                        setLoading(false);
                    }
                    return;
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single()

                // Network errors on profile fetch should not trigger state updates
                if (profileError) {
                    if (profileError.message?.includes('Failed to fetch') || 
                        profileError.message?.includes('NetworkError')) {
                        console.error('[PlanPage] Network error during profile check:', profileError.message);
                        if (isMounted) {
                            setLoading(false);
                        }
                        return;
                    }
                }

                if (!profile?.organization_id) {
                    if (isMounted) {
                        setLoading(false);
                    }
                    return;
                }

                const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .select('plan_type')
                    .eq('id', profile.organization_id)
                    .single()

                // Network errors on org fetch should not trigger state updates
                if (orgError) {
                    if (orgError.message?.includes('Failed to fetch') || 
                        orgError.message?.includes('NetworkError')) {
                        console.error('[PlanPage] Network error during org check:', orgError.message);
                        if (isMounted) {
                            setLoading(false);
                        }
                        return;
                    }
                }

                if (org && isMounted) {
                    setCurrentPlan(org.plan_type || 'starter')
                }
            } catch (error: any) {
                // Catch network errors and other unexpected errors
                if (error?.message?.includes('Failed to fetch') || 
                    error?.name === 'TypeError' ||
                    error?.message?.includes('network')) {
                    console.error('[PlanPage] Network error during plan fetch:', error.message);
                    if (isMounted) {
                        setLoading(false);
                    }
                    return;
                }
                console.error('Failed to fetch current plan:', error)
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchCurrentPlan();

        return () => {
            isMounted = false;
        };
    }, [supabase])

    const handlePlanChange = async (planType: string) => {
        if (planType === currentPlan) return

        setChanging(planType)
        try {
            const res = await fetch('/api/admin/plan/change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planType }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast({
                    title: "プラン変更に失敗しました",
                    description: data.error || "エラーが発生しました",
                    variant: "destructive",
                })
                setChanging(null)
                return
            }

            setCurrentPlan(planType)
            toast({
                title: "プランが正常に変更されました",
                description: `${plans[planType as keyof typeof plans]?.name}プランに変更しました。`,
                variant: "default",
            })
        } catch (error: any) {
            toast({
                title: "プラン変更に失敗しました",
                description: error.message || "エラーが発生しました",
                variant: "destructive",
            })
        } finally {
            setChanging(null)
        }
    }

    if (loading) {
        return <LoadingState message="読み込み中..." />
    }

    return (
        <div className="container mx-auto p-8 max-w-6xl space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">料金プラン</h1>
                <p className="text-muted-foreground">
                    事業規模に応じたプランをお選びください。全てのプランで決済手数料7%が適用されます。
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(plans).map(([key, plan]) => {
                    const isCurrent = currentPlan === key
                    const isChanging = changing === key

                    return (
                        <Card
                            key={key}
                            className={`relative ${plan.popular ? 'border-2 border-foreground' : ''} ${isCurrent ? 'bg-secondary/50' : ''}`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                                    人気
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                                <div className="mt-4">
                                    <span className="text-3xl font-bold">{plan.price}</span>
                                    {plan.price !== '個別見積もり' && <span className="text-muted-foreground">/月</span>}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="text-sm font-semibold">制限:</div>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <div>店舗数: {plan.limits.stores}</div>
                                        <div>スタッフ: {plan.limits.staff}</div>
                                        <div>家カルテ: {plan.limits.houseAssets}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-sm font-semibold">機能:</div>
                                    <ul className="space-y-2">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm">
                                                <Check className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <Button
                                    className="w-full"
                                    variant={isCurrent ? 'outline' : 'default'}
                                    disabled={isCurrent || isChanging}
                                    onClick={() => handlePlanChange(key)}
                                >
                                    {isCurrent ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            現在のプラン
                                        </>
                                    ) : isChanging ? (
                                        '変更中...'
                                    ) : (
                                        'このプランを選択'
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <Card className="bg-muted/50">
                <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground">
                        <strong>注意:</strong> プラン変更は即座に反映されます。ダウングレードの場合、既存データは保持されますが、新規作成は制限されます。
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}








