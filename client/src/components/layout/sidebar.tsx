import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building,
  Star,
  DoorOpen,
  CalendarCheck,
  CalendarPlus,
  Calendar,
  UserCog,
  Key,
  Tv,
  LayoutDashboard,
  Settings,
  CalendarDays,
  Shield,
  ChevronRight,
  Home,
} from "lucide-react";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    category: null,
  },
  {
    category: "Quản lý danh mục",
    items: [
      { id: "staff-management", label: "Quản lý cán bộ", icon: Users },
      { id: "department-management", label: "Quản lý phòng ban", icon: Building },
      { id: "event-management", label: "Quản lý sự kiện", icon: Star },
      { id: "room-management", label: "Quản lý phòng họp", icon: DoorOpen },
    ],
  },
  {
    category: "Quản trị lịch",
    items: [
      { id: "work-schedule", label: "Lịch công tác", icon: CalendarCheck },
      { id: "meeting-schedule", label: "Lịch phòng họp", icon: CalendarPlus },
      { id: "other-events", label: "Sự kiện khác", icon: Calendar },
      { id: "holiday-management", label: "Quản lý ngày lễ", icon: CalendarDays },
    ],
  },
  {
    category: "Hệ thống",
    items: [
      { id: "user-management", label: "Quản lý người dùng", icon: UserCog },
      { id: "permissions", label: "Phân quyền", icon: Key },
      { id: "group-permissions", label: "Quản lý nhóm quyền", icon: Shield },
      { id: "system-config", label: "Tham số hệ thống", icon: Settings },
    ],
  },
];

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const openPublicDisplay = () => {
    window.open("/display", "_blank");
  };

  // Function to get current menu item info
  const getCurrentMenuItem = () => {
    // Check dashboard first
    if (activeSection === "dashboard") {
      return { label: "Dashboard", icon: LayoutDashboard };
    }
    
    // Search in categories
    for (const category of menuItems.slice(1)) {
      const item = category.items?.find(item => item.id === activeSection);
      if (item) {
        return { label: item.label, icon: item.icon, category: category.category };
      }
    }
    return null;
  };

  const currentItem = getCurrentMenuItem();

  return (
    <div className="w-72 bg-white shadow-lg h-screen sticky top-0 flex flex-col border-r">
      {/* Header with current active section */}
      <div className="bg-gradient-to-r from-[#006b68] to-[#008a85] text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {currentItem && currentItem.icon && (
              <currentItem.icon className="w-5 h-5" />
            )}
            <div>
              <div className="text-sm font-semibold">
                {currentItem ? currentItem.label : "Dashboard"}
              </div>
              {currentItem && currentItem.category && (
                <div className="text-xs opacity-80">{currentItem.category}</div>
              )}
            </div>
          </div>
          
          {activeSection !== "dashboard" && (
            <Button
              onClick={() => onSectionChange("dashboard")}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 border border-white/30 text-xs p-2"
              data-testid="button-back-to-dashboard"
            >
              <Home className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {/* Dashboard */}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start space-x-3 rounded-lg transition-all duration-200 h-12",
              activeSection === "dashboard" 
                ? "bg-[#006b68]/15 text-[#006b68] border border-[#006b68]/30 font-medium shadow-sm" 
                : "text-gray-700 hover:text-[#006b68] hover:bg-[#006b68]/10"
            )}
            onClick={() => onSectionChange("dashboard")}
            data-testid="button-dashboard"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-medium">Dashboard</span>
            {activeSection === "dashboard" && (
              <ChevronRight className="w-4 h-4 ml-auto text-[#006b68]" />
            )}
          </Button>

          {/* Menu Categories */}
          {menuItems.slice(1).map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-2">
              <div className="px-3 py-2 bg-gray-50 rounded-lg border">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {category.category}
                </h3>
              </div>
              
              <div className="space-y-1 pl-2">
                {category.items?.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start space-x-3 rounded-lg transition-all duration-200 h-11",
                        isActive
                          ? "bg-[#006b68]/15 text-[#006b68] border border-[#006b68]/30 font-medium shadow-sm"
                          : "text-gray-600 hover:text-[#006b68] hover:bg-[#006b68]/10"
                      )}
                      onClick={() => onSectionChange(item.id)}
                      data-testid={`button-${item.id}`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate text-left flex-1">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 text-[#006b68] flex-shrink-0" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Public Display - Fixed at bottom */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <Button
          onClick={openPublicDisplay}
          className="w-full justify-start space-x-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all duration-200 shadow-md h-12"
          data-testid="button-public-display"
        >
          <Tv className="w-5 h-5" />
          <span className="text-sm font-medium">Màn hình công cộng</span>
        </Button>
      </div>
    </div>
  );
}