'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface OnboardingStep {
    completed: boolean
    required: boolean
    link: string
}

interface OnboardingStatus {
    completed: boolean
    steps: {
        organization: OnboardingStep
        stripe: OnboardingStep
        plan: OnboardingStep
        store: OnboardingStep
        service: OnboardingStep
        staff: OnboardingStep
    }
}

const stepLabels: Record<keyof OnboardingStatus['steps'], string> = {
    organization: '組織情報の設定',
    stripe: 'Stripe Connect連携',
    plan: 'プラン選択',
    store: '店舗作成',
    service: 'サービス登録',
    staff: 'スタッフ登録',
}

export function OnboardingBanner() {
    const [status, setStatus] = useState<OnboardingStatus | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/onboarding/status')
                if (res.ok) {
                    const data = await res.json()
                    setStatus(data)
                }
            } catch (error) {
                console.error('Failed to fetch onboarding status:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStatus()
    }, [])

    if (loading || !status || status.completed) {
        return null
    }

    const incompleteSteps = Object.entries(status.steps)
        .filter(([_, step]) => !step.completed && step.required)
        .slice(0, 3) // Show max 3 incomplete steps

    if (incompleteSteps.length === 0) {
        return null
    }

    return (
        <Card className="border-amber-200 bg-amber-50/50 mb-6">
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-bold text-foreground mb-2">初期設定を完了しましょう</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            以下の設定を完了すると、予約受付を開始できます。
                        </p>
                        <div className="space-y-2">
                            {incompleteSteps.map(([key, step]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <Circle className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">{stepLabels[key as keyof typeof stepLabels]}</span>
                                    <Link href={step.link}>
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                            設定する
                                            <ArrowRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}














