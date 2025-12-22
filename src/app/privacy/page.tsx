import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyPolicyPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

                <section className="space-y-6 text-slate-700 leading-relaxed">
                    <p>
                        株式会社Amber（以下、「当社」）は、本ウェブサイト上で提供するサービス（以下、「本サービス」）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」）を定めます。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第1条（個人情報）</h2>
                    <p>
                        「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報、および容貌、指紋、声紋にかかるデータ、および健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別符号）を指します。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第2条（個人情報の収集方法）</h2>
                    <p>
                        当社は、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレスなどの個人情報をお尋ねすることがあります。また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、当社の提携先（情報提供元、広告主、広告配信先などを含みます。以下、｢提携先｣といいます。）などから収集することがあります。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第3条（個人情報を収集・利用する目的）</h2>
                    <p>
                        当社が個人情報を収集・利用する目的は、以下のとおりです。
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>当社サービスの提供・運営のため</li>
                        <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
                        <li>ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等および当社が提供する他のサービスの案内のメールを送付するため</li>
                        <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
                        <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
                        <li>ユーザーにご自身の登録情報の閲覧や変更、削除、ご利用状況の閲覧を行っていただくため</li>
                        <li>有料サービスにおいて、ユーザーに利用料金を請求するため</li>
                        <li>上記の利用目的に付随する目的</li>
                    </ul>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第4条（利用目的の変更）</h2>
                    <p>
                        当社は、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、個人情報の利用目的を変更するものとします。
                        利用目的の変更を行った場合には、変更後の目的について、当社所定の方法により、ユーザーに通知し、または本ウェブサイト上に公表するものとします。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第5条（個人情報の第三者提供）</h2>
                    <p>
                        当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">第6条（お問い合わせ窓口）</h2>
                    <p>
                        本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。
                    </p>
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <p>住所：東京都渋谷区...</p>
                        <p>社名：株式会社Amber</p>
                        <p>Eメールアドレス：support@amber-house.jp</p>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
