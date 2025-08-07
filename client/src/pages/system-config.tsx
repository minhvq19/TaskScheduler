import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SystemConfig, InsertSystemConfig } from "@shared/schema";

interface ConfigFormData {
  key: string;
  value: string;
  type: string;
  description: string;
  category: string;
}

export default function SystemConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>({
    key: "",
    value: "",
    type: "string",
    description: "",
    category: "display",
  });

  // Fetch all system configurations
  const { data: configs, isLoading } = useQuery<SystemConfig[]>({
    queryKey: ["/api/system-config"],
  });

  // Create configuration mutation
  const createConfigMutation = useMutation({
    mutationFn: async (data: InsertSystemConfig) => {
      return await apiRequest("POST", "/api/system-config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-config"] });
      setIsDialogOpen(false);
      setEditingConfig(null);
      resetForm();
      toast({
        title: "Thành công",
        description: "Đã thêm tham số hệ thống mới",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: `Không thể thêm tham số: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, data }: { key: string; data: Partial<InsertSystemConfig> }) => {
      return await apiRequest("PUT", `/api/system-config/${key}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-config"] });
      setIsDialogOpen(false);
      setEditingConfig(null);
      resetForm();
      toast({
        title: "Thành công",
        description: "Đã cập nhật tham số hệ thống",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: `Không thể cập nhật tham số: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (key: string) => {
      return await apiRequest("DELETE", `/api/system-config/${key}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-config"] });
      toast({
        title: "Thành công",
        description: "Đã xóa tham số hệ thống",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: `Không thể xóa tham số: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      key: "",
      value: "",
      type: "string",
      description: "",
      category: "display",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingConfig) {
      // Update existing config
      await updateConfigMutation.mutateAsync({
        key: editingConfig.key,
        data: {
          value: formData.value,
          type: formData.type,
          description: formData.description,
          category: formData.category,
        },
      });
    } else {
      // Create new config
      await createConfigMutation.mutateAsync(formData);
    }
  };

  const startEdit = (config: SystemConfig) => {
    setEditingConfig(config);
    setFormData({
      key: config.key,
      value: config.value,
      type: config.type,
      description: config.description || "",
      category: config.category,
    });
    setIsDialogOpen(true);
  };

  const startAdd = () => {
    setEditingConfig(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const cancelEdit = () => {
    setEditingConfig(null);
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (key: string) => {
    if (confirm("Bạn có chắc muốn xóa tham số này?")) {
      await deleteConfigMutation.mutateAsync(key);
    }
  };

  const groupedConfigs = configs?.reduce((acc, config) => {
    const category = config.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(config);
    return acc;
  }, {} as Record<string, SystemConfig[]>) || {};

  const categoryNames = {
    display: "Hiển thị",
    branding: "Thương hiệu",
    colors: "Màu sắc",
    timing: "Thời gian",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6 text-bidv-teal" />
          <h1 className="text-2xl font-bold text-gray-900">Quản trị tham số hệ thống</h1>
        </div>
        <Button
          onClick={startAdd}
          className="flex items-center space-x-2 bg-bidv-teal hover:bg-bidv-teal/90 text-white"
          data-testid="button-add-config"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm tham số</span>
        </Button>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Chỉnh sửa tham số" : "Thêm tham số mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="key">Khóa tham số</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value })
                  }
                  disabled={!!editingConfig}
                  required
                  data-testid="input-config-key"
                />
              </div>
              <div>
                <Label htmlFor="value">Giá trị</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  required
                  data-testid="input-config-value"
                />
              </div>
              <div>
                <Label htmlFor="type">Loại dữ liệu</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger data-testid="select-config-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">Chuỗi</SelectItem>
                    <SelectItem value="number">Số</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="color">Màu sắc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Danh mục</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger data-testid="select-config-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="display">Hiển thị</SelectItem>
                    <SelectItem value="branding">Thương hiệu</SelectItem>
                    <SelectItem value="colors">Màu sắc</SelectItem>
                    <SelectItem value="timing">Thời gian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  data-testid="textarea-config-description"
                />
              </div>
              <div className="col-span-2 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                  data-testid="button-cancel-config"
                >
                  <X className="h-4 w-4 mr-2" />
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createConfigMutation.isPending || updateConfigMutation.isPending
                  }
                  data-testid="button-save-config"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingConfig ? "Cập nhật" : "Thêm"}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Configuration List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bidv-teal"></div>
          <span className="ml-2 text-gray-600">Đang tải...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedConfigs).map(([category, configs]) => (
            <Card key={category} className="shadow-sm border border-gray-200">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-lg font-semibold text-gray-800">
                  {categoryNames[category as keyof typeof categoryNames] || category}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {configs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`config-item-${config.key}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 mb-1">{config.key}</div>
                        <div className="text-sm text-gray-600 mb-2">
                          {config.description || 'Không có mô tả'}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-mono bg-blue-50 text-blue-800 px-3 py-1 rounded-md border">
                            {config.value}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {config.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(config)}
                          className="hover:bg-blue-50 hover:border-blue-300"
                          data-testid={`button-edit-${config.key}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(config.key)}
                          className="hover:bg-red-50 hover:border-red-300 text-red-600"
                          data-testid={`button-delete-${config.key}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}