import Link from "next/link";
import { LayoutDashboard, Calendar, Users, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-background dark:bg-background">
            {/* Sidebar */}
            <aside className="w-64 bg-card dark:bg-card border-r hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold">Haukuri Admin</h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/admin">
                        <Button variant="ghost" className="w-full justify-start gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                        </Button>
                    </Link>
                    <Link href="/admin/calendar">
                        <Button variant="ghost" className="w-full justify-start gap-2">
                            <Calendar className="h-4 w-4" />
                            Calendar
                        </Button>
                    </Link>
                    <Link href="/admin/bookings">
                        <Button variant="ghost" className="w-full justify-start gap-2">
                            <Users className="h-4 w-4" />
                            Bookings
                        </Button>
                    </Link>
                    <Link href="/admin/settings">
                        <Button variant="ghost" className="w-full justify-start gap-2">
                            <Settings className="h-4 w-4" />
                            Settings
                        </Button>
                    </Link>
                </nav>
                <div className="p-4 border-t">
                    <Button variant="ghost" className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
