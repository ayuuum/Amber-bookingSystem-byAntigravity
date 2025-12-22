import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t py-12 bg-slate-50">
            <div className="container flex flex-col items-center justify-between gap-6 md:flex-row">
                <div className="flex flex-col md:items-start items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 tracking-tight">Amber Platform</p>
                    <p className="text-xs leading-loose text-muted-foreground md:text-left">
                        © 2025 Amber. All rights reserved.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600">
                    <Link href="/terms" className="hover:text-amber-600 transition-colors">利用規約</Link>
                    <Link href="/privacy" className="hover:text-amber-600 transition-colors">プライバシーポリシー</Link>
                    <Link href="/law" className="hover:text-amber-600 transition-colors">特定商取引法に基づく表記</Link>
                </div>
            </div>
        </footer>
    );
}
