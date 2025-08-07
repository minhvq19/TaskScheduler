import { storage } from './storage';

// Default system configurations
const defaultConfigs = [
  // Display timing configurations
  {
    key: 'display.screen_rotation_interval',
    value: '15',
    type: 'number',
    description: 'Thời gian hiển thị từng màn hình tại màn hình công cộng (giây)',
    category: 'timing'
  },
  {
    key: 'display.refresh_interval',
    value: '30',
    type: 'number', 
    description: 'Thời gian cập nhật dữ liệu tự động (giây)',
    category: 'timing'
  },

  // Branding configurations
  {
    key: 'organization.name',
    value: 'Chi nhánh Sở giao dịch 1',
    type: 'string',
    description: 'Tên đơn vị hiển thị trên màn hình công cộng',
    category: 'branding'
  },
  {
    key: 'organization.full_name',
    value: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở giao dịch 1',
    type: 'string',
    description: 'Tên đầy đủ của đơn vị',
    category: 'branding'
  },
  {
    key: 'organization.logo_url',
    value: '/logo-bidv.png',
    type: 'string',
    description: 'Đường dẫn logo đơn vị',
    category: 'branding'
  },

  // Work type color configurations
  {
    key: 'colors.work_at_branch',
    value: '#4a90a4',
    type: 'color',
    description: 'Màu cho loại "Làm việc tại CN"',
    category: 'colors'
  },
  {
    key: 'colors.leave',
    value: '#f59e0b',
    type: 'color',
    description: 'Màu cho loại "Nghỉ phép"',
    category: 'colors'
  },
  {
    key: 'colors.leadership_duty',
    value: '#ef4444',
    type: 'color',
    description: 'Màu cho loại "Trực lãnh đạo"',
    category: 'colors'
  },
  {
    key: 'colors.domestic_business_trip',
    value: '#10b981',
    type: 'color',
    description: 'Màu cho loại "Đi công tác trong nước"',
    category: 'colors'
  },
  {
    key: 'colors.international_business_trip',
    value: '#8b5cf6',
    type: 'color',
    description: 'Màu cho loại "Đi công tác nước ngoài"',
    category: 'colors'
  },
  {
    key: 'colors.other',
    value: '#6b7280',
    type: 'color',
    description: 'Màu cho loại "Khác"',
    category: 'colors'
  },

  // Display configuration
  {
    key: 'display.max_schedules_per_cell',
    value: '8',
    type: 'number',
    description: 'Số lượng lịch tối đa hiển thị trong mỗi ô',
    category: 'display'
  },
  {
    key: 'display.show_color_legend',
    value: 'true',
    type: 'boolean',
    description: 'Hiển thị ghi chú màu sắc',
    category: 'display'
  },

  // Work hours configuration
  {
    key: 'work_hours.start_time',
    value: '08:00',
    type: 'string',
    description: 'Giờ bắt đầu làm việc hàng ngày',
    category: 'timing'
  },
  {
    key: 'work_hours.end_time',
    value: '17:30',
    type: 'string',
    description: 'Giờ kết thúc làm việc hàng ngày',
    category: 'timing'
  }
];

export async function initializeSystemConfig() {
  console.log('Initializing system configuration...');
  
  try {
    // Check if configs already exist
    const existingConfigs = await storage.getSystemConfigs();
    
    for (const config of defaultConfigs) {
      const existing = existingConfigs.find(c => c.key === config.key);
      
      if (!existing) {
        await storage.createSystemConfig(config);
        console.log(`Created config: ${config.key}`);
      } else {
        console.log(`Config already exists: ${config.key}`);
      }
    }
    
    console.log('System configuration initialization completed');
  } catch (error) {
    console.error('Error initializing system config:', error);
  }
}

// Helper function to get configuration value with fallback
export async function getConfigValue(key: string, fallback: string = ''): Promise<string> {
  try {
    const config = await storage.getSystemConfig(key);
    return config?.value || fallback;
  } catch (error) {
    console.error(`Error fetching config ${key}:`, error);
    return fallback;
  }
}

// Helper function to get configuration as number
export async function getConfigNumber(key: string, fallback: number = 0): Promise<number> {
  const value = await getConfigValue(key, fallback.toString());
  return parseInt(value, 10) || fallback;
}

// Helper function to get configuration as boolean
export async function getConfigBoolean(key: string, fallback: boolean = false): Promise<boolean> {
  const value = await getConfigValue(key, fallback.toString());
  return value.toLowerCase() === 'true';
}