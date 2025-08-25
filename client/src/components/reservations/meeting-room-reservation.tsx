import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Check, X, Calendar, Clock, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import ReservationModal from "./reservation-modal";
import ApprovalModal from "./approval-modal";

export default function MeetingRoomReservation() {
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingReservation, setPendingReservation] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user group name for permission checking
  const userGroupName = (user as any)?.userGroup?.name?.toLowerCase() || "";
  const isSecretary = userGroupName.includes("thư ký cấp phòng");
  const isBranchSecretary = userGroupName.includes("thư ký cấp chi nhánh");

  // Fetch reservations with filters
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["/api/meeting-room-reservations", statusFilter, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (sortBy) params.append("sortBy", sortBy);
      
      const res = await fetch(`/api/meeting-room-reservations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch reservations");
      return res.json();
    },
  });

  // Delete reservation mutation
  const deleteReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/meeting-room-reservations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-room-reservations"] });
      toast({
        title: "Thành công",
        description: "Đã xóa đăng ký phòng họp.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa đăng ký.",
        variant: "destructive",
      });
    },
  });

  // Revoke approval mutation
  const revokeApprovalMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/meeting-room-reservations/${id}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-room-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-schedules"] });
      toast({
        title: "Thành công",
        description: "Đã hủy duyệt đăng ký phòng họp.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể hủy duyệt đăng ký.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (reservation: any) => {
    setEditingReservation(reservation);
    setShowReservationModal(true);
  };

  const handleDelete = (reservation: any) => {
    const isApproved = reservation.status === "approved";
    const confirmMessage = isApproved 
      ? "Bạn có chắc chắn muốn xóa đăng ký đã được phê duyệt này? Lịch họp tương ứng cũng sẽ bị xóa."
      : "Bạn có chắc chắn muốn xóa đăng ký này?";
      
    if (window.confirm(confirmMessage)) {
      deleteReservationMutation.mutate(reservation.id);
    }
  };

  const handleRevokeApproval = (reservation: any) => {
    if (window.confirm("Bạn có chắc chắn muốn hủy duyệt đăng ký này? Lịch họp tương ứng sẽ bị xóa và trạng thái sẽ về 'Chờ duyệt'.")) {
      revokeApprovalMutation.mutate(reservation.id);
    }
  };

  const handleApproval = (reservation: any) => {
    setPendingReservation(reservation);
    setShowApprovalModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Đã duyệt</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Từ chối</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Chờ duyệt</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Đăng ký sử dụng phòng họp
        </h2>
        {isSecretary && (
          <Button
            onClick={() => setShowReservationModal(true)}
            className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
            data-testid="button-add-reservation"
          >
            <Plus className="w-4 h-4 mr-2" />
            Đăng ký phòng họp
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc và sắp xếp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lọc theo trạng thái
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ duyệt</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="rejected">Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sắp xếp theo
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort-by">
                  <SelectValue placeholder="Chọn cách sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Đăng ký mới nhất</SelectItem>
                  <SelectItem value="oldest">Đăng ký muộn nhất</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8" data-testid="loading-reservations">
              Đang tải danh sách đăng ký...
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-reservations">
              Chưa có đăng ký nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phòng họp</TableHead>
                    <TableHead>Nội dung họp</TableHead>
                    <TableHead>Người đăng ký</TableHead>
                    <TableHead>Thời gian bắt đầu</TableHead>
                    <TableHead>Thời gian kết thúc</TableHead>
                    <TableHead>Thông tin đầu mối</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày duyệt</TableHead>
                    <TableHead>Người duyệt</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation: any) => (
                    <TableRow key={reservation.id} data-testid={`reservation-row-${reservation.id}`}>
                      <TableCell className="font-medium">
                        {reservation.roomName}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {reservation.meetingContent}
                      </TableCell>
                      <TableCell>{reservation.requestedByUsername}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {formatDateTime(reservation.startDateTime)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {formatDateTime(reservation.endDateTime)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{reservation.contactInfo || "Không có"}</TableCell>
                      <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                      <TableCell>
                        {reservation.approvedAt ? formatDateTime(reservation.approvedAt) : "-"}
                      </TableCell>
                      <TableCell>{reservation.approvedByUsername || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {/* Approve/Reject for Branch Secretary */}
                          {isBranchSecretary && reservation.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproval(reservation)}
                              className="text-green-600 hover:text-green-700"
                              data-testid={`button-approve-${reservation.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Edit for requester on pending items */}
                          {isSecretary && 
                           reservation.requestedBy === (user as any)?.id && 
                           reservation.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(reservation)}
                              data-testid={`button-edit-${reservation.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Revoke approval for Branch Secretary on approved items */}
                          {isBranchSecretary && reservation.status === "approved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeApproval(reservation)}
                              className="text-orange-600 hover:text-orange-700"
                              title="Hủy duyệt"
                              data-testid={`button-revoke-${reservation.id}`}
                            >
                              <Undo2 className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Delete for requester on pending items OR Branch Secretary on any items */}
                          {((isSecretary && 
                            reservation.requestedBy === (user as any)?.id && 
                            reservation.status === "pending") ||
                           (isBranchSecretary)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(reservation)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-${reservation.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showReservationModal && (
        <ReservationModal
          reservation={editingReservation}
          onClose={() => {
            setShowReservationModal(false);
            setEditingReservation(null);
          }}
          onSuccess={() => {
            setShowReservationModal(false);
            setEditingReservation(null);
            queryClient.invalidateQueries({ queryKey: ["/api/meeting-room-reservations"] });
          }}
        />
      )}

      {showApprovalModal && pendingReservation && (
        <ApprovalModal
          reservation={pendingReservation}
          onClose={() => {
            setShowApprovalModal(false);
            setPendingReservation(null);
          }}
          onSuccess={() => {
            setShowApprovalModal(false);
            setPendingReservation(null);
            queryClient.invalidateQueries({ queryKey: ["/api/meeting-room-reservations"] });
          }}
        />
      )}
    </div>
  );
}