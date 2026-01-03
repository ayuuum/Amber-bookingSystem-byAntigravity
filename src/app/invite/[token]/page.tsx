'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function InviteAcceptPage() {
    const params = useParams()
    const router = useRouter()
    const token = params.token as string
    const [loading, setLoading] = useState(true)
    const [validating, setValidating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [invitation, setInvitation] = useState<any>(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const supabase = createClient()

    useEffect(() => {
        const validateToken = async () => {
            try {
                const res = await fetch(`/api/invite/validate?token=${token}`)
                const data = await res.json()

                if (!res.ok) {
                    setError(data.error || '招待リンクが無効です。')
                    setLoading(false)
                    return
                }

                setInvitation(data.invitation)
            } catch (err: any) {
                setError('招待リンクの検証に失敗しました。')
            } finally {
                setLoading(false)
            }
        }

        if (token) {
            validateToken()
        }
    }, [token])

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault()
        setValidating(true)
        setError(null)

        if (password !== confirmPassword) {
            setError('パスワードが一致しません。')
            setValidating(false)
            return
        }

        if (password.length < 8) {
            setError('パスワードは8文字以上である必要があります。')
            setValidating(false)
            return
        }

        try {
            const res = await fetch('/api/invite/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || '招待の承認に失敗しました。')
                setValidating(false)
                return
            }

            // Sign in the user
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: invitation.email,
                password,
            })

            if (signInError) {
                setError('アカウントは作成されましたが、ログインに失敗しました。ログインページから再度ログインしてください。')
                setValidating(false)
                router.push('/login')
                return
            }

            // Redirect to admin dashboard
            router.push('/admin')
            router.refresh()

        } catch (err: any) {
            setError(err.message || '招待の承認に失敗しました。')
            setValidating(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                    <p className="text-muted-foreground">招待リンクを確認中...</p>
                </div>
            </div>
        )
    }

    if (error && !invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-5 h-5" />
                            <CardTitle>招待リンクが無効です</CardTitle>
                        </div>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/login')} className="w-full">
                            ログインページに戻る
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">招待を承認</CardTitle>
                    <CardDescription className="text-center">
                        {invitation?.email} への招待
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAccept} className="space-y-4">
                        <div className="p-4 bg-secondary rounded-lg space-y-2">
                            <div className="text-sm font-semibold">招待情報</div>
                            <div className="text-sm text-muted-foreground">
                                <div>メールアドレス: {invitation?.email}</div>
                                <div>役割: {invitation?.role === 'store_admin' ? '店舗管理者' : invitation?.role === 'hq_admin' ? '本部管理者' : '現場スタッフ'}</div>
                            </div>
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
                            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        {error && (
                            <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg">
                                {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={validating}>
                            {validating ? '処理中...' : '招待を承認してアカウントを作成'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}



