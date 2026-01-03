import { BookingForm } from "@/components/features/booking/BookingForm";
import { createClient } from "@/lib/supabase/server";
import { HeroImage } from "@/components/layout/HeroImage";

export default async function Home() {
    const supabase = await createClient();

    // ストア情報を取得（settingsも含める）
    const { data: store, error } = await supabase
        .from('stores')
        .select('slug, organization_id, settings')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

    // エラーハンドリング: ストアが見つからない場合はシードAPIへのリンクを表示
    if (error || !store) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-6 px-4 max-w-md">
                    <h1 className="text-2xl font-bold text-foreground">ストアが見つかりません</h1>
                    <p className="text-muted-foreground">
                        予約可能なストアが設定されていません。
                    </p>
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            デモデータを作成するには、以下のリンクにアクセスしてください：
                        </p>
                        <a
                            href="/api/test/seed"
                            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                        >
                            デモデータを作成
                        </a>
                        <p className="text-xs text-muted-foreground mt-4">
                            データ作成後、このページをリロードしてください。
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // organizationのslugを取得するクエリを準備
    const orgQuery = store.organization_id
        ? supabase
            .from('organizations')
            .select('slug')
            .eq('id', store.organization_id)
            .single()
        : Promise.resolve({ data: null });

    // 並列実行
    const [orgRes] = await Promise.all([orgQuery]);

    let orgSlug = 'default';
    if (orgRes.data?.slug) {
        orgSlug = orgRes.data.slug;
    } else if (store.organization_id) {
        orgSlug = store.organization_id;
    }

    const storeSlug = store.slug;

    // ヒーローセクションの設定を取得（デフォルト値付き）
    const theme = store.settings?.theme || {};
    const heroTitle = theme.hero_title || "究極の「おもてなし」を、\nあなたの住まいに。";
    const heroDescription = theme.hero_description || "Amberは、技術とホスピタリティを極めた掃除代行サービスです。";
    const heroBackgroundImage = theme.hero_background_image || "/hero.png";

    return (
        <div className="min-h-screen bg-background">
            {/* Optimized Hero Section */}
            <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
                <HeroImage
                    src={heroBackgroundImage}
                    alt="Amber House Cleaning"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                    <div className="max-w-4xl space-y-6">
                        <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-2xl">
                            {heroTitle.split('\n').map((line, i) => (
                                <span key={i}>
                                    {line}
                                    {i < heroTitle.split('\n').length - 1 && <br />}
                                </span>
                            ))}
                        </h1>
                        <p className="text-xl text-white/90 font-medium drop-shadow-md">
                            {heroDescription}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
                <BookingForm
                    orgSlug={orgSlug}
                    storeSlug={storeSlug}
                />
            </div>
        </div>
    );
}
