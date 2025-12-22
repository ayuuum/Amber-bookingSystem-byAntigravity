"use client";

import { cn } from "@/lib/utils";
import { Sparkles, Calendar, User, Check } from "lucide-react";

interface BookingProgressProps {
    currentStep: number;
}

const steps = [
    { label: "サービス選択", icon: Sparkles },
    { label: "日時選択", icon: Calendar },
    { label: "お客様情報", icon: User },
];

export function BookingProgress({ currentStep }: BookingProgressProps) {
    return (
        <div className="w-full max-w-md mx-auto mb-8">
            <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
                    <div
                        className="h-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                    />
                </div>

                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const StepIcon = isCompleted ? Check : step.icon;

                    return (
                        <div key={step.label} className="flex flex-col items-center relative z-10">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                    isCompleted && "bg-amber-500 border-amber-500 text-white",
                                    isCurrent && "bg-white border-amber-500 text-amber-500 shadow-md",
                                    !isCompleted && !isCurrent && "bg-white border-gray-200 text-gray-400"
                                )}
                            >
                                <StepIcon className="h-5 w-5" />
                            </div>
                            <span
                                className={cn(
                                    "text-xs mt-2 font-medium transition-colors",
                                    (isCompleted || isCurrent) ? "text-amber-600" : "text-gray-400"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
