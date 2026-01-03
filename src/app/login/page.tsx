'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // Sync metadata after login to ensure JWT has correct app_metadata
            try {
                await fetch('/api/auth/sync-metadata', { method: 'POST' });
            } catch (syncError) {
                // Don't block login if sync fails - it will be retried on next request
                console.error('[Login] Failed to sync metadata:', syncError);
            }
            router.push('/admin')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Haukuri Admin</CardTitle>
                    <CardDescription className="text-center">
                        管理者ログイン
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
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
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <div className="text-sm text-red-500 font-medium">
                                {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'ログイン中...' : 'ログイン'}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            アカウントをお持ちでない方は{' '}
                            <Link href="/signup" className="text-foreground font-medium hover:underline">
                                新規登録
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
