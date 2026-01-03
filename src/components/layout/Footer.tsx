"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Footer() {
    const footerLinks = {
        services: [
            { href: "/services#ac", label: "エアコンクリーニング" },
            { href: "/services#kitchen", label: "キッチン・換気扇" },
            { href: "/services#bathroom", label: "浴室クリーニング" },
            { href: "/services#all", label: "すべてのメニュー" }
        ],
        company: [
            { href: "/about", label: "私たちについて" },
            { href: "/contact", label: "お問い合わせ" },
            { href: "/terms", label: "利用規約" },
            { href: "/privacy", label: "プライバシーポリシー" }
        ],
        legal: [
            { href: "/law", label: "特定商取引法に基づく表記" },
            { href: "/admin", label: "管理者ログイン" }
        ]
    };

    return (
        <footer className="relative bg-secondary border-t border-border">
            <div className="container px-4 md:px-6 py-16">
                <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="space-y-4"
                    >
                        <h3 className="text-xl font-bold text-primary">Amber Platform</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            プロフェッショナルな清掃サービスを通じて、あなたの生活に豊かな時間と輝く空間を。
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="space-y-4"
                    >
                        <h4 className="font-semibold text-foreground">サービス</h4>
                        <ul className="space-y-3 text-sm">
                            {footerLinks.services.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-muted-foreground hover:text-primary transition-colors duration-200 inline-block hover:translate-x-1 transform"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="space-y-4"
                    >
                        <h4 className="font-semibold text-foreground">会社情報</h4>
                        <ul className="space-y-3 text-sm">
                            {footerLinks.company.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-muted-foreground hover:text-primary transition-colors duration-200 inline-block hover:translate-x-1 transform"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                        className="space-y-4"
                    >
                        <h4 className="font-semibold text-foreground">関連情報</h4>
                        <ul className="space-y-3 text-sm">
                            {footerLinks.legal.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-muted-foreground hover:text-primary transition-colors duration-200 inline-block hover:translate-x-1 transform"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4"
                >
                    <p className="text-xs text-muted-foreground">
                        © 2025 Amber Platform. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        {/* Social icons or trust badges can be added here */}
                    </div>
                </motion.div>
            </div>
        </footer>
    );
}
