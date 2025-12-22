import React, { useEffect, useState } from 'react';
import { UseFormReturn } from "react-hook-form";
import { BookingFormData } from "../schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Profile } from '@/types';

interface StaffSelectionProps {
    form: UseFormReturn<BookingFormData>;
    storeId: string; // To fetch staff for this store
}

export function StaffSelection({ form, storeId }: StaffSelectionProps) {
    const [staffList, setStaffList] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const selectedStaffId = form.watch("staffId");

    useEffect(() => {
        // Fetch staff for the store
        // This assumes an API endpoint exists, e.g., /api/stores/[id]/staff
        // For now, we'll mock or assume we can fetch them. 
        // Ideally we should have a prop or fetch here.
        const fetchStaff = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/stores/${storeId}/staff`);
                if (res.ok) {
                    const data = await res.json();
                    setStaffList(data);
                }
            } catch (e) {
                console.error("Failed to fetch staff", e);
            } finally {
                setLoading(false);
            }
        };

        if (storeId) fetchStaff();
    }, [storeId]);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">スタッフ指名 (任意)</h2>
            <RadioGroup
                onValueChange={(val) => form.setValue("staffId", val === "none" ? undefined : val)}
                defaultValue={selectedStaffId || "none"}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
                <div className="relative">
                    <RadioGroupItem value="none" id="staff-none" className="peer sr-only" />
                    <Label
                        htmlFor="staff-none"
                        className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary"
                    >
                        <Avatar>
                            <AvatarFallback>なし</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">指名なし (最短で予約)</span>
                    </Label>
                </div>

                {staffList.map((staff) => (
                    <div key={staff.id} className="relative">
                        <RadioGroupItem value={staff.id} id={`staff-${staff.id}`} className="peer sr-only" />
                        <Label
                            htmlFor={`staff-${staff.id}`}
                            className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary"
                        >
                            <Avatar>
                                <AvatarImage src={staff.avatar_url || ""} />
                                <AvatarFallback>{staff.full_name?.charAt(0) || 'S'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-medium">{staff.full_name}</span>
                                {/* <span className="text-xs text-muted-foreground">Expert</span> */}
                            </div>
                        </Label>
                    </div>
                ))}
            </RadioGroup>
        </div>
    );
}
