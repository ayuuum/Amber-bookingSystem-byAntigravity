import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function TermsPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">利用規約</h1>

                <section className="space-y-6 text-slate-700 leading-relaxed">
                    <p>
                        この利用規約（以下、「本規約」）は、株式会社Amber（以下、「当社」）が提供するサービス（以下、「本サービス」）の利用条件を定めるものです。登録ユーザーの皆さま（以下、「ユーザー」）には、本規約に従って、本サービスをご利用いただきます。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第1条（適用）</h2>
                    <p>
                        本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されるものとします。
                        当社は本サービスに関し、本規約のほか、ご利用にあたってのルール等、各種の規定（以下、「個別規定」といいます。）をすることがあります。これら個別規定はその名称のいかんに関わらず、本規約の一部を構成するものとします。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第2条（利用登録）</h2>
                    <p>
                        本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第3条（利用料金および支払方法）</h2>
                    <p>
                        ユーザーは、本サービスの有料部分の対価として、当社が別途定め、本ウェブサイトに表示する利用料金を、当社が指定する支払方法により支払うものとします。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第4条（キャンセルポリシー）</h2>
                    <p>
                        予約のキャンセルについては、各店舗が定めるキャンセルポリシーに従うものとします。オンライン決済済みの予約の払い戻しについては、キャンセルの時期に応じて返金手数料が発生する場合があります。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第5条（禁止事項）</h2>
                    <p>
                        ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>法令または公序良俗に違反する行為</li>
                        <li>犯罪行為に関連する行為</li>
                        <li>本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
                        <li>当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                        <li>本サービスによって得られた情報を商業的に利用する行為</li>
                        <li>当社のサービスの運営を妨害するおそれのある行為</li>
                        <li>不正アクセスをし、またはこれを試みる行為</li>
                        <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                        <li>他のユーザーに成りすます行為</li>
                        <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
                        <li>その他、当社が不適切と判断する行為</li>
                    </ul>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第6条（免責事項）</h2>
                    <p>
                        当社の債務不履行責任は、当社の故意または重過失によらない場合には免責されるものとします。
                        当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第7条（規約の変更）</h2>
                    <p>
                        当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
                    </p>
                </section>
            </main>
            <Footer />
        </div>
    );
}
