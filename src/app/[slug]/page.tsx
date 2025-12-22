import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BookingWizard } from "@/components/booking/BookingWizard";

interface BookingPageProps {
    params: Promise<{ slug: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
    const { slug } = await params;

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container py-12">
                <h1 className="text-3xl font-bold mb-8 text-center">清掃の予約</h1>
                <div className="max-w-3xl mx-auto">
                    <BookingWizard slug={slug} />
                </div>
            </main>
            <Footer />
        </div>
    );
}
