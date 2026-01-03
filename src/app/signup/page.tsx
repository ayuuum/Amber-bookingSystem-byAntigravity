'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [organizationName, setOrganizationName] = useState('')
    const [organizationSlug, setOrganizationSlug] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    // Generate slug from organization name
    const handleOrganizationNameChange = (value: string) => {
        setOrganizationName(value)
        if (!organizationSlug || organizationSlug === generateSlug(organizationName)) {
            setOrganizationSlug(generateSlug(value))
        }
    }

    const generateSlug = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    organizationName,
                    organizationSlug: organizationSlug || generateSlug(organizationName),
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || '登録に失敗しました。')
                setLoading(false)
                return
            }

            // Success: Redirect to login to ensure fresh session for onboarding
            toast({
                title: "アカウントが作成されました",
                description: "ログインしてセットアップを開始してください。",
                variant: "default",
            });
            router.push('/login')
            router.refresh()

        } catch (err: any) {
            setError(err.message || '登録に失敗しました。')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">新規登録</CardTitle>
                    <CardDescription className="text-center">
                        Amber アカウントを作成して開始しましょう
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                            <p className="text-xs text-muted-foreground">8文字以上で入力してください</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="organizationName">組織名</Label>
                            <Input
                                id="organizationName"
                                type="text"
                                placeholder="株式会社Amber"
                                value={organizationName}
                                onChange={(e) => handleOrganizationNameChange(e.target.value)}
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
                                英数字とハイフンのみ使用可能（3-50文字）。予約URLに使用されます。
                            </p>
                        </div>
                        {error && (
                            <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg">
                                {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? '登録中...' : 'アカウントを作成'}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            既にアカウントをお持ちですか？{' '}
                            <Link href="/login" className="text-foreground font-medium hover:underline">
                                ログイン
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}








