'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Search, Wrench, CheckCircle, Clock, AlertCircle, 
  ImageIcon, Trash2, Edit, Upload, X
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MaintenanceRecord, MaintenanceStatus } from '@/types/database'

const statusConfig: Record<MaintenanceStatus, { color: string; icon: typeof CheckCircle; label: string }> = {
  '已完成': { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: '已完成' },
  '进行中': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: '进行中' },
  '待处理': { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertCircle, label: '待处理' },
}

export default function Home() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const supabase = useMemo(() => createClient(), [])

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item: '',
    technician: '',
    status: '待处理' as MaintenanceStatus,
    image: null as File | null,
    imageUrl: '',
  })

  useEffect(() => {
    fetchRecords()
  }, [])

  async function fetchRecords() {
    setLoading(true)
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (data) setRecords(data)
    setLoading(false)
  }

  async function handleSubmit() {
    setUploading(true)
    let imageUrl = formData.imageUrl

    if (formData.image) {
      const fileName = `${Date.now()}-${formData.image.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('maintenance-images')
        .upload(fileName, formData.image)

      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('maintenance-images')
          .getPublicUrl(fileName)
        imageUrl = publicUrl
      }
    }

    if (editingRecord) {
      await supabase
        .from('maintenance_records')
        .update({
          date: formData.date,
          item: formData.item,
          technician: formData.technician,
          status: formData.status,
          image_url: imageUrl || null,
        })
        .eq('id', editingRecord.id)
    } else {
      await supabase
        .from('maintenance_records')
        .insert({
          date: formData.date,
          item: formData.item,
          technician: formData.technician,
          status: formData.status,
          image_url: imageUrl || null,
        })
    }

    setUploading(false)
    resetForm()
    setIsDialogOpen(false)
    fetchRecords()
  }

  async function handleDelete(id: string) {
    if (confirm('确定要删除这条记录吗？')) {
      await supabase.from('maintenance_records').delete().eq('id', id)
      fetchRecords()
    }
  }

  function handleEdit(record: MaintenanceRecord) {
    setEditingRecord(record)
    setFormData({
      date: record.date,
      item: record.item,
      technician: record.technician,
      status: record.status,
      image: null,
      imageUrl: record.image_url || '',
    })
    setIsDialogOpen(true)
  }

  function resetForm() {
    setEditingRecord(null)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      item: '',
      technician: '',
      status: '待处理',
      image: null,
      imageUrl: '',
    })
  }

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.technician.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: records.length,
    completed: records.filter(r => r.status === '已完成').length,
    inProgress: records.filter(r => r.status === '进行中').length,
    pending: records.filter(r => r.status === '待处理').length,
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">物业维修工单</h1>
              <p className="text-slate-500">工程部维修记录与管理</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 px-6 py-2">
                <Plus className="w-5 h-5 mr-2" />
                新增工单
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingRecord ? '编辑工单' : '新增维修工单'}</DialogTitle>
                <DialogDescription>填写维修工单的相关信息</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">日期</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item">维修事项</Label>
                  <Textarea
                    id="item"
                    placeholder="请输入维修事项"
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="technician">维修人员</Label>
                  <Input
                    id="technician"
                    placeholder="请输入维修人员姓名"
                    value={formData.technician}
                    onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">完成情况</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as MaintenanceStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="待处理">待处理</SelectItem>
                      <SelectItem value="进行中">进行中</SelectItem>
                      <SelectItem value="已完成">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>附图</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                      className="flex-1"
                    />
                  </div>
                  {(formData.imageUrl || formData.image) && (
                    <div className="relative mt-2">
                      {formData.image ? (
                        <img 
                          src={URL.createObjectURL(formData.image)} 
                          alt="Preview" 
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                      ) : formData.imageUrl ? (
                        <img 
                          src={formData.imageUrl} 
                          alt="Current" 
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                      ) : null}
                      <button
                        onClick={() => setFormData({ ...formData, image: null, imageUrl: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleSubmit} 
                  disabled={uploading || !formData.item || !formData.technician}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? '提交中...' : editingRecord ? '保存修改' : '提交工单'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">总工单</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Wrench className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">已完成</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">进行中</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.inProgress}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">待处理</p>
                  <p className="text-3xl font-bold text-gray-600">{stats.pending}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">工单列表</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="搜索维修事项或人员..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="已完成">已完成</SelectItem>
                    <SelectItem value="进行中">进行中</SelectItem>
                    <SelectItem value="待处理">待处理</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Wrench className="w-12 h-12 mb-3" />
                <p>暂无工单记录</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredRecords.map((record) => {
                  const status = statusConfig[record.status]
                  const StatusIcon = status.icon
                  return (
                    <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-slate-500">
                              {new Date(record.date).toLocaleDateString('zh-CN')}
                            </span>
                            <Badge className={`${status.color} border`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-1">{record.item}</h3>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                              {record.technician.charAt(0)}
                            </span>
                            {record.technician}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.image_url && (
                            <a 
                              href={record.image_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <ImageIcon className="w-5 h-5" />
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                            className="text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.id)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {record.image_url && (
                        <div className="mt-3">
                          <img 
                            src={record.image_url} 
                            alt="维修图片" 
                            className="w-32 h-24 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
