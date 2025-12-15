"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function LineLoginButton() {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            provider: 'line' as any,
            options: {
                redirectTo: `${window.location.origin}/booking`,
            },
        });

        if (error) {
            console.error("LINE Login Error:", error);
            setLoading(false);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            className="w-full bg-[#00B900] text-white hover:bg-[#009900] hover:text-white border-none"
            onClick={handleLogin}
            disabled={loading}
        >
            {loading ? "接続中..." : "LINEでログインして入力を省略"}
        </Button>
    );
}
