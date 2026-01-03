'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingPage() {
    const [organizationName, setOrganizationName] = useState('')
    const [organizationSlug, setOrganizationSlug] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const generateSlug = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
    }

    const handleNameChange = (value: string) => {
        setOrganizationName(value)
        if (!organizationSlug || organizationSlug === generateSlug(organizationName)) {
            setOrganizationSlug(generateSlug(value))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/onboarding/create-organization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationName,
                    organizationSlug,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'セットアップに失敗しました。')
                setLoading(false)
                return
            }

            // Success: Wait a moment for DB state to propagate, then redirect
            setTimeout(() => {
                router.replace('/admin')
                router.refresh()
            }, 300)
        } catch (err: any) {
            setError(err.message || '予期せぬエラーが発生しました。')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">セットアップ</CardTitle>
                    <CardDescription className="text-center">
                        組織情報を入力して開始しましょう
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="organizationName">組織名</Label>
                            <Input
                                id="organizationName"
                                type="text"
                                placeholder="株式会社Amber"
                                value={organizationName}
                                onChange={(e) => handleNameChange(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="organizationSlug">組織スラッグ（URL用）</Label>
                            <Input
                                id="organizationSlug"
                                type="text"
                                placeholder="amber-company"
                                value={organizationSlug}
                                onChange={(e) => setOrganizationSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                required
                                pattern="[a-z0-9\-]+"
                                minLength={3}
                                maxLength={50}
                            />
                            <p className="text-xs text-muted-foreground">
                                英数字とハイフンのみ使用可能（3-50文字）。
                            </p>
                        </div>
                        {error && (
                            <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg">
                                {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? '保存中...' : 'セットアップを完了する'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
