'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { MaintenanceRecord, MaintenanceStatus } from '@/types/database'

const statusConfig: Record<MaintenanceStatus, { color: string; label: string }> = {
  '已完成': { color: 'bg-green-100 text-green-700', label: '已完成' },
  '进行中': { color: 'bg-amber-100 text-amber-700', label: '进行中' },
  '待处理': { color: 'bg-gray-100 text-gray-700', label: '待处理' },
}

export default function Home() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null
    return createClient()
  }, [])

  useEffect(() => {
    if (isMounted && supabase) {
      fetchRecords()
    }
  }, [isMounted, supabase])

  async function fetchRecords() {
    if (!supabase) return
    setLoading(true)
    const { data } = await supabase
      .from('maintenance_records')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (data) setRecords(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUploading(true)
    let imageUrl = formData.imageUrl

    if (formData.image) {
      const fileName = `${Date.now()}-${formData.image.name}`
      const { data: uploadData } = await supabase.storage
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
    setShowForm(true)
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
    setShowForm(false)
  }

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item: '',
    technician: '',
    status: '待处理' as MaintenanceStatus,
    image: null as File | null,
    imageUrl: '',
  })

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

  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingRecord ? '编辑工单' : '新增维修工单'}
              </h2>
              <button 
                onClick={resetForm}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">日期</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">维修事项</label>
                <textarea
                  placeholder="请输入维修事项"
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  rows={3}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">维修人员</label>
                <input
                  type="text"
                  placeholder="请输入维修人员姓名"
                  value={formData.technician}
                  onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">完成情况</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as MaintenanceStatus })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="待处理">待处理</option>
                  <option value="进行中">进行中</option>
                  <option value="已完成">已完成</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">附图</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                  className="w-full"
                />
                {(formData.imageUrl || formData.image) && (
                  <div className="relative mt-2 inline-block">
                    {formData.image ? (
                      <img 
                        src={URL.createObjectURL(formData.image)} 
                        alt="Preview" 
                        className="w-32 h-24 object-cover rounded-lg border"
                      />
                    ) : formData.imageUrl ? (
                      <img 
                        src={formData.imageUrl} 
                        alt="Current" 
                        className="w-32 h-24 object-cover rounded-lg border"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: null, imageUrl: '' })}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="submit"
                  disabled={uploading || !formData.item || !formData.technician}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50"
                >
                  {uploading ? '提交中...' : editingRecord ? '保存修改' : '提交工单'}
                </button>
                <button 
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border py-2 px-4 rounded-md hover:bg-slate-50"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">物业维修工单</h1>
              <p className="text-slate-500">工程部维修记录与管理</p>
            </div>
          </div>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增工单
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">总工单</p>
                <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">已完成</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">进行中</p>
                <p className="text-3xl font-bold text-amber-600">{stats.inProgress}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">待处理</p>
                <p className="text-3xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">工单列表</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    placeholder="搜索维修事项或人员..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 px-3 py-2 border rounded-md"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md w-36"
                >
                  <option value="all">全部状态</option>
                  <option value="已完成">已完成</option>
                  <option value="进行中">进行中</option>
                  <option value="待处理">待处理</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                <p>暂无工单记录</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredRecords.map((record) => {
                  const status = statusConfig[record.status]
                  return (
                    <div key={record.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-slate-500">
                              {new Date(record.date).toLocaleDateString('zh-CN')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
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
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </a>
                          )}
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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
          </div>
        </div>
      </div>
    </div>
  )
}
