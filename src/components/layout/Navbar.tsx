import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between">
                <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
                    <span>Haukuri Pro</span>
                </Link>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                    <Link href="/about" className="transition-colors hover:text-foreground/80 text-foreground/60">私たちについて</Link>
                    <Link href="/services" className="transition-colors hover:text-foreground/80 text-foreground/60">サービス</Link>
                    <Link href="/contact" className="transition-colors hover:text-foreground/80 text-foreground/60">お問い合わせ</Link>
                    <Link href="/admin" className="hidden md:block transition-colors hover:text-foreground/80 text-foreground/60">管理者</Link>
                </nav>
                <div className="flex items-center space-x-2">
                    <Button asChild size="sm">
                        <Link href="/booking">予約する</Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
