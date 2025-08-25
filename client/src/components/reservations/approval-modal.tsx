import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, X, Calendar, Clock, User, MapPin } from "lucide-react";

interface ApprovalModalProps {
  reservation: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApprovalModal({ 
  reservation, 
  onClose, 
  onSuccess 
}: ApprovalModalProps) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  // Approval/Rejection mutation
  const approvalMutation = useMutation({
    mutationFn: async (data: { status: string; rejectionReason?: string }) => {
      await apiRequest("PATCH", `/api/meeting-room-reservations/${reservation.id}/status`, data);
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: action === "approve" ? "Đã phê duyệt đăng ký." : "Đã từ chối đăng ký.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xử lý đăng ký.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    setAction("approve");
    approvalMutation.mutate({ status: "approved" });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập lý do từ chối.",
        variant: "destructive",
      });
      return;
    }
    setAction("reject");
    approvalMutation.mutate({ 
      status: "rejected", 
      rejectionReason: rejectionReason.trim() 
    });
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    // Use UTC time to avoid timezone conversion issues
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${minute}`;
  };

  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime);
    // Use UTC time to avoid timezone conversion issues
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const weekday = date.getUTCDay();
    
    const weekdays = ["Chủ Nhật", "Thế Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const months = [
      "tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6",
      "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12"
    ];
    
    return `${weekdays[weekday]}, ${day} ${months[month]}, ${year}`;
  };

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    // Use UTC time to avoid timezone conversion issues
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  };

  const getTimeDuration = () => {
    const start = new Date(reservation.startDateTime);
    const end = new Date(reservation.endDateTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Phê duyệt đăng ký phòng họp</span>
            <Badge className="bg-yellow-100 text-yellow-800">Chờ duyệt</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reservation Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Phòng họp</p>
                  <p className="font-semibold">{reservation.roomName}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Người đăng ký</p>
                  <p className="font-semibold">{reservation.requestedByUsername}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Ngày họp</p>
                  <p className="font-semibold">{formatDate(reservation.startDateTime)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Thời gian</p>
                  <p className="font-semibold">
                    {formatTime(reservation.startDateTime)} - {formatTime(reservation.endDateTime)}
                    <span className="text-gray-500 ml-2">({getTimeDuration()})</span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Nội dung họp</p>
              <p className="font-medium bg-white p-3 rounded border">
                {reservation.meetingContent}
              </p>
            </div>

            {reservation.contactInfo && (
              <div>
                <p className="text-sm text-gray-600">Thông tin đầu mối</p>
                <p className="font-medium">{reservation.contactInfo}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600">Thời gian đăng ký</p>
              <p className="text-sm">{formatDateTime(reservation.requestedAt)}</p>
            </div>
          </div>

          {/* Rejection Reason Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Lý do từ chối (chỉ cần nhập khi từ chối)
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập lý do từ chối đăng ký..."
              rows={3}
              data-testid="input-rejection-reason"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={approvalMutation.isPending}
              data-testid="button-cancel"
            >
              Hủy
            </Button>
            
            <Button
              onClick={handleReject}
              variant="destructive"
              disabled={approvalMutation.isPending}
              data-testid="button-reject"
            >
              <X className="w-4 h-4 mr-2" />
              {approvalMutation.isPending && action === "reject" ? "Đang xử lý..." : "Từ chối"}
            </Button>
            
            <Button
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={approvalMutation.isPending}
              data-testid="button-approve"
            >
              <Check className="w-4 h-4 mr-2" />
              {approvalMutation.isPending && action === "approve" ? "Đang xử lý..." : "Phê duyệt"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}