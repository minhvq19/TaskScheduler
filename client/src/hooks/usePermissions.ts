import { useAuth } from "./useAuth";

export type PermissionAction = "VIEW" | "EDIT" | "NONE";

export type PermissionKey = 
  | "rooms" 
  | "staff" 
  | "users" 
  | "holidays" 
  | "categories" 
  | "departments" 
  | "otherEvents" 
  | "permissions" 
  | "systemConfig" 
  | "workSchedules" 
  | "meetingSchedules";

export function usePermissions() {
  const { user } = useAuth();
  
  const hasPermission = (key: PermissionKey, requiredAction: PermissionAction): boolean => {
    if (!user || !(user as any)?.userGroup?.permissions) {
      return false;
    }
    
    const userPermissions = (user as any).userGroup.permissions;
    const userAction = userPermissions[key] as PermissionAction;
    
    // If user has EDIT permission, they also have VIEW permission
    if (requiredAction === "VIEW") {
      return userAction === "VIEW" || userAction === "EDIT";
    }
    
    // For EDIT, user must have exactly EDIT permission
    if (requiredAction === "EDIT") {
      return userAction === "EDIT";
    }
    
    return false;
  };

  const canView = (key: PermissionKey): boolean => hasPermission(key, "VIEW");
  const canEdit = (key: PermissionKey): boolean => hasPermission(key, "EDIT");
  
  // Permission mapping for menu sections
  const getMenuPermissions = () => {
    return {
      // Dashboard always accessible
      "dashboard": true,
      
      // Staff management
      "staff-management": canView("staff"),
      
      // Department management  
      "department-management": canView("departments"),
      
      // Event management (categories)
      "event-management": canView("categories"),
      
      // Room management
      "room-management": canView("rooms"),
      
      // Work schedule
      "work-schedule": canView("workSchedules"),
      
      // Meeting schedule
      "meeting-schedule": canView("meetingSchedules"),
      
      // Other events
      "other-events": canView("otherEvents"),
      
      // Holiday management
      "holiday-management": canView("holidays"),
      
      // System sections
      "user-management": canView("users"),
      "permissions": canView("permissions"),
      "user-groups": canView("permissions"), // Same as permissions
      "system-config": canView("systemConfig"),
    };
  };

  return {
    hasPermission,
    canView,
    canEdit,
    getMenuPermissions,
    user,
    userPermissions: (user as any)?.userGroup?.permissions || {}
  };
}