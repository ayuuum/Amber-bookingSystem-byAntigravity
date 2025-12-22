import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Calendar, CheckCircle, Clock, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-slate-50 dark:bg-slate-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  あなたの家のための<br />プロフェッショナルなクリーニング
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Haukuri Proの違いを体験してください。信頼性が高く、効率的で、ニーズに合わせた完璧な清掃を提供します。
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                <Button asChild size="lg" className="h-14 px-10 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                  <Link href="/booking" className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    今すぐ無料で予約する
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-14 px-10 text-lg">
                  詳しく見る
                </Button>
              </div>
              {/* 信頼の証 */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground mt-4">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-green-500" /> 身元確認済みスタッフ
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-blue-500" /> 満足保証
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-500" /> 最短翌日対応
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 sm:px-10 md:gap-16 md:grid-cols-2">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-sm dark:bg-blue-800 text-blue-800 dark:text-blue-100">
                  選ばれる理由
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  すべての訪問で最高のクリーニングを
                </h2>
                <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  私たちは品質、信頼性、顧客満足度を重視しています。プロのスタッフがあなたのすべての清掃ニーズに対応します。
                </p>
              </div>
              <div className="grid gap-4 md:gap-8">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-blue-600" />
                    <h3 className="text-xl font-bold">簡単なオンライン予約</h3>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">シンプルなオンライン予約システムで、数分で清掃を予約できます。</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-6 w-6 text-blue-600" />
                    <h3 className="text-xl font-bold">信頼と実績</h3>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">すべての清掃スタッフは身元確認済みで、厳しいトレーニングを受けています。</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                    <h3 className="text-xl font-bold">満足保証</h3>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">もしご満足いただけない場合は、誠意を持って対応いたします。あなたの満足が私たちの優先事項です。</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Showcase */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-slate-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">人気のサービス</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  幅広い清掃ソリューションからお選びください。
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>エアコンクリーニング</CardTitle>
                  <CardDescription>空気の質を改善する徹底的な洗浄。</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">¥12,000 から</p>
                  <Button className="w-full" asChild>
                    <Link href="/booking?service=ac">予約する</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>キッチン・レンジフード</CardTitle>
                  <CardDescription>油汚れの除去と除菌。</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">¥15,000 から</p>
                  <Button className="w-full" asChild>
                    <Link href="/booking?service=kitchen">予約する</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>浴室クリーニング</CardTitle>
                  <CardDescription>カビの除去と徹底的な磨き上げ。</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">¥10,000 から</p>
                  <Button className="w-full" asChild>
                    <Link href="/booking?service=bathroom">予約する</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
