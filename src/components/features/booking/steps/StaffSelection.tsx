import React, { useEffect, useState } from 'react';
import { UseFormReturn } from "react-hook-form";
import { BookingFormData } from "../schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Staff } from '@/types';

interface StaffSelectionProps {
    form: UseFormReturn<BookingFormData>;
    storeId: string; // storeSlug or storeId
    initialStaff?: Staff[];
}

export function StaffSelection({ form, storeId, initialStaff }: StaffSelectionProps) {
    const [staffList, setStaffList] = useState<Staff[]>(initialStaff || []);
    const [loading, setLoading] = useState(!initialStaff);
    const selectedStaffId = form.watch("staffId");

    useEffect(() => {
        if (initialStaff) {
            setStaffList(initialStaff);
            setLoading(false);
            return;
        }
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
    }, [storeId, initialStaff]);

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
                        className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent transition-all ${selectedStaffId === "none" || !selectedStaffId ? 'shadow-sm' : ''}`}
                        style={(selectedStaffId === "none" || !selectedStaffId) ? { borderColor: 'var(--primary-color)', boxShadow: '0 0 0 1px var(--primary-color)' } : {}}
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
                            className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent transition-all ${selectedStaffId === staff.id ? 'shadow-sm' : ''}`}
                            style={selectedStaffId === staff.id ? { borderColor: 'var(--primary-color)', boxShadow: '0 0 0 1px var(--primary-color)' } : {}}
                        >
                            <Avatar>
                                <AvatarFallback>{staff.name?.charAt(0) || 'S'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground">{staff.name}</span>
                                {staff.nomination_fee && staff.nomination_fee > 0 && (
                                    <span className="text-xs text-muted-foreground">指名料: ¥{staff.nomination_fee.toLocaleString()}</span>
                                )}
                            </div>
                        </Label>
                    </div>
                ))}
            </RadioGroup>
        </div>
    );
}
