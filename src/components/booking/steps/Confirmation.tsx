import { UseFormReturn } from "react-hook-form";
import { BookingFormData } from "../schema";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

interface ConfirmationProps {
    form: UseFormReturn<BookingFormData>;
}

export function Confirmation({ form }: ConfirmationProps) {
    const values = form.getValues();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">予約内容の確認</h2>
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 font-medium">サービス</p>
                            <p>{values.serviceId}</p> {/* Todo: Transform ID to name */}
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium">日時</p>
                            <p>{values.date ? format(values.date, "yyyy-MM-dd") : ""} {values.timeSlot}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium">お名前</p>
                            <p>{values.customerName}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium">メールアドレス</p>
                            <p>{values.customerEmail}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium">電話番号</p>
                            <p>{values.customerPhone}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium">住所</p>
                            <p>{values.customerAddress}</p>
                        </div>
                    </div>
                    {values.notes && (
                        <div>
                            <p className="text-gray-500 font-medium text-sm">備考</p>
                            <p className="text-sm">{values.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            <p className="text-sm text-gray-500 text-center">
                上記の内容をご確認ください。「予約を確定する」をクリックして完了します。
            </p>
        </div>
    );
}
