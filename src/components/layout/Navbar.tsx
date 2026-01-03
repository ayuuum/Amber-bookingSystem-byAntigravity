"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 pt-4">
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="container mx-auto glass-effect rounded-2xl border shadow-soft flex h-16 items-center justify-between px-6"
            >
                <Link href="/" className="flex items-center space-x-2 group">
                    <span className="font-bold text-xl tracking-tight text-primary group-hover:scale-105 transition-transform duration-300">
                        Amber Platform
                    </span>
                </Link>

                <nav className="hidden md:flex items-center space-x-1" aria-label="メインナビゲーション">
                    {[
                        { href: "/about", label: "私たちについて" },
                        { href: "/services", label: "サービス" },
                        { href: "/contact", label: "お問い合わせ" },
                        { href: "/admin", label: "管理者" }
                    ].map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/50 transition-all duration-200"
                            aria-label={item.label}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center space-x-3">
                    <Button asChild className="hidden md:flex pill-button px-6 font-semibold shadow-sm" aria-label="予約ページへ移動">
                        <Link href="/booking">予約する</Link>
                    </Button>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-accent/50 transition-colors"
                        aria-label="メニュー"
                    >
                        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-20 left-4 right-4 md:hidden glass-effect rounded-2xl border shadow-premium p-6 z-40"
                    >
                        <nav className="flex flex-col space-y-2" aria-label="モバイルメニュー">
                            {[
                                { href: "/about", label: "私たちについて" },
                                { href: "/services", label: "サービス" },
                                { href: "/contact", label: "お問い合わせ" },
                                { href: "/admin", label: "管理者" }
                            ].map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="px-4 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-accent/50 transition-colors"
                                    aria-label={item.label}
                                >
                                    {item.label}
                                </Link>
                            ))}
                            <Button asChild className="mt-4 pill-button w-full font-semibold" aria-label="予約ページへ移動">
                                <Link href="/booking">予約する</Link>
                            </Button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
