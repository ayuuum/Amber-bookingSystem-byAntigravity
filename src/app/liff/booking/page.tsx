"use client";

import { useEffect, useState, Suspense } from "react";
import liff from "@line/liff";
import { BookingForm } from "@/components/features/booking/BookingForm";
import { getStoreSlugFromLiffState } from "@/lib/liff/utils";

interface LineProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
}

function LiffBookingContent() {
    const [isReady, setIsReady] = useState(false);
    const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);
    const [idToken, setIdToken] = useState<string | null>(null);
    const [storeSlug, setStoreSlug] = useState<string>("");
    const [orgSlug, setOrgSlug] = useState<string>("default");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeLiff = async () => {
            try {
                const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
                if (!liffId) {
                    setError("LIFF IDが設定されていません");
                    setIsReady(true);
                    return;
                }

                // 1. LIFF初期化
                await liff.init({ liffId });

                if (!liff.isLoggedIn()) {
                    liff.login();
                    return;
                }

                // 2. 店舗slug取得（共通関数を使用）
                const slug = getStoreSlugFromLiffState();
                setStoreSlug(slug);

                // 3. 組織slug取得（storeSlugから）
                try {
                    const storeRes = await fetch(`/api/stores/public/${slug}`);
                    if (storeRes.ok) {
                        const storeData = await storeRes.json();
                        if (storeData.store?.organization?.slug) {
                            setOrgSlug(storeData.store.organization.slug);
                        }
                    }
                } catch (err) {
                    console.warn("Failed to fetch organization slug:", err);
                }

                // 4. LINEプロフィール取得
                try {
                    const profile = await liff.getProfile();
                    setLineProfile({
                        userId: profile.userId,
                        displayName: profile.displayName,
                        pictureUrl: profile.pictureUrl,
                    });
                } catch (err) {
                    console.warn("Failed to get LINE profile:", err);
                }

                // 5. IDトークン取得
                try {
                    const token = await liff.getIDToken();
                    setIdToken(token);
                } catch (err) {
                    console.warn("Failed to get ID token:", err);
                    setIdToken(null);
                }

                setIsReady(true);
            } catch (err) {
                console.error("LIFF initialization error:", err);
                setError("LIFFの初期化に失敗しました");
                setIsReady(true);
            }
        };

        initializeLiff();
    }, []);

    if (!isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <p className="text-neutral-600">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!storeSlug) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <p className="text-neutral-600">店舗情報が取得できませんでした</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <BookingForm
                orgSlug={orgSlug}
                storeSlug={storeSlug}
                lineProfile={lineProfile}
                idToken={idToken}
                onComplete={(booking) => {
                    // 予約完了後はLIFF画面を閉じる
                    if (liff.isInClient()) {
                        liff.closeWindow();
                    } else {
                        // 外部ブラウザの場合はリダイレクト
                        window.location.href = "/booking/success";
                    }
                }}
            />
        </div>
    );
}

export default function LiffBookingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <p className="text-neutral-600">読み込み中...</p>
                </div>
            </div>
        }>
            <LiffBookingContent />
        </Suspense>
    );
}

