import { BookingForm } from "@/components/features/booking/BookingForm";

interface PageProps {
    params: Promise<{
        org_slug: string;
        store_slug: string;
    }>;
}

export default async function BookingPage({ params }: PageProps) {
    const resolvedParams = await params;

    return (
        <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
            <BookingForm
                orgSlug={resolvedParams.org_slug}
                storeSlug={resolvedParams.store_slug}
            />
        </div>
    );
}
