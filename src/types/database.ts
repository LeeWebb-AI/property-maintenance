export type MaintenanceStatus = '已完成' | '进行中' | '待处理'

export interface MaintenanceRecord {
  id: string
  date: string
  item: string
  technician: string
  status: MaintenanceStatus
  image_url: string | null
  created_at: string
  updated_at: string
}

export type NewMaintenanceRecord = Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>
