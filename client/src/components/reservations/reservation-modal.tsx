import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const reservationSchema = z.object({
  roomId: z.string().min(1, "Vui lòng chọn phòng họp"),
  startDateTime: z.string().min(1, "Vui lòng chọn thời gian bắt đầu"),
  endDateTime: z.string().min(1, "Vui lòng chọn thời gian kết thúc"),
  meetingContent: z.string()
    .min(1, "Nội dung họp không được để trống")
    .max(200, "Nội dung họp không được vượt quá 200 ký tự"),
  contactInfo: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.startDateTime);
  const end = new Date(data.endDateTime);
  return end > start;
}, {
  message: "Thời gian kết thúc phải sau thời gian bắt đầu",
  path: ["endDateTime"],
});

type FormData = z.infer<typeof reservationSchema>;

interface ReservationModalProps {
  reservation?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReservationModal({ 
  reservation, 
  onClose, 
  onSuccess 
}: ReservationModalProps) {
  const { toast } = useToast();
  const isEditing = !!reservation;

  const form = useForm<FormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      roomId: reservation?.roomId || "",
      startDateTime: reservation?.startDateTime ? 
        new Date(reservation.startDateTime).toISOString().slice(0, 16) : "",
      endDateTime: reservation?.endDateTime ? 
        new Date(reservation.endDateTime).toISOString().slice(0, 16) : "",
      meetingContent: reservation?.meetingContent || "",
      contactInfo: reservation?.contactInfo || "",
    },
  });

  // Fetch meeting rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ["/api/meeting-rooms"],
    queryFn: async () => {
      const res = await fetch("/api/meeting-rooms");
      if (!res.ok) throw new Error("Failed to fetch rooms");
      return res.json();
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditing) {
        await apiRequest("PUT", `/api/meeting-room-reservations/${reservation.id}`, data);
      } else {
        await apiRequest("POST", "/api/meeting-room-reservations", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: isEditing ? "Đã cập nhật đăng ký." : "Đã tạo đăng ký mới.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể lưu đăng ký.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  const getMinDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Chỉnh sửa đăng ký" : "Đăng ký sử dụng phòng họp"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phòng họp *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-room">
                        <SelectValue placeholder="Chọn phòng họp" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms.map((room: any) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} {room.location && `(${room.location})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời gian bắt đầu *</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        min={getMinDateTime()}
                        {...field} 
                        data-testid="input-start-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời gian kết thúc *</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        min={getMinDateTime()}
                        {...field} 
                        data-testid="input-end-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="meetingContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nội dung họp *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Nhập nội dung cuộc họp (tối đa 200 ký tự)"
                      maxLength={200}
                      rows={3}
                      {...field}
                      data-testid="input-content"
                    />
                  </FormControl>
                  <div className="text-sm text-gray-500 text-right">
                    {field.value?.length || 0}/200
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thông tin đầu mối</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Thông tin liên hệ (không bắt buộc)"
                      {...field}
                      data-testid="input-contact"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
                disabled={saveMutation.isPending}
                data-testid="button-submit"
              >
                {saveMutation.isPending ? "Đang xử lý..." : (isEditing ? "Cập nhật" : "Đăng ký")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}