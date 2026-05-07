
'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  Trash2,
  X,
  ChevronLeft
} from 'lucide-react'
import { addMonths, format, subMonths } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { DashboardLayout } from '@/components/dashboard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { AppointmentCalendar } from '@/components/landlord/AppointmentCalendar'
import AvailabilitySettingsPanel from './AvailabilitySettingsPanel'

// --- Types ---

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

type Appointment = {
  id: string
  visitor_name: string
  visitor_phone: string
  visitor_email: string
  preferred_date: string
  preferred_time: string
  status: AppointmentStatus
  feedback?: string
  property: {
    id: string
    title: string
    address: string
  }
  created_at: string
}

// --- Components ---

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const styles = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  }
  
  const labels = {
    pending: '待確認',
    confirmed: '已確認',
    completed: '已完成',
    cancelled: '已取消',
  }

  const icons = {
    pending: <AlertCircle className="w-3 h-3 mr-1" />,
    confirmed: <CheckCircle className="w-3 h-3 mr-1" />,
    completed: <CheckCircle className="w-3 h-3 mr-1" />,
    cancelled: <XCircle className="w-3 h-3 mr-1" />,
  }

  return (
    <span className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  )
}

function AppointmentDetailModal({ 
  appointment, 
  isOpen, 
  onClose,
  onStatusUpdate
}: { 
  appointment: Appointment | null
  isOpen: boolean
  onClose: () => void
  onStatusUpdate: (id: string, status: AppointmentStatus) => Promise<void>
}) {
  if (!isOpen || !appointment) return null

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (confirm(`確定要將狀態更改為「${getStatusLabel(newStatus)}」嗎？`)) {
      await onStatusUpdate(appointment.id, newStatus)
      onClose()
    }
  }

  const getStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: '待確認',
      confirmed: '已確認',
      completed: '已完成',
      cancelled: '已取消'
    }
    return map[s] || s
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <h2 className="text-xl font-bold text-white">預約詳情</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="flex items-center justify-between p-4 bg-[#262626] rounded-lg border border-[#333333]">
            <span className="text-[#999999] text-sm">目前狀態</span>
            <StatusBadge status={appointment.status} />
          </div>

          {/* Visitor Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#999999] uppercase tracking-wider">訪客資訊</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-white font-medium">{appointment.visitor_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-2">
                <Phone className="w-4 h-4 text-[#999999]" />
                <span className="text-[#cccccc]">{appointment.visitor_phone}</span>
              </div>
              <div className="flex items-center gap-3 pl-2">
                <Mail className="w-4 h-4 text-[#999999]" />
                <span className="text-[#cccccc]">{appointment.visitor_email || '無 Email'}</span>
              </div>
            </div>
          </div>

          {/* Property Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#999999] uppercase tracking-wider">預約房源</h3>
            <div className="p-3 bg-[#262626] rounded-lg border border-[#333333]">
              <p className="text-white font-medium mb-1">{appointment.property.title}</p>
              <div className="flex items-center text-sm text-[#999999]">
                <MapPin className="w-3 h-3 mr-1" />
                {appointment.property.address}
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#999999] uppercase tracking-wider">預約時間</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-[#7C3AED]" />
                {format(new Date(appointment.preferred_date), 'yyyy/MM/dd (eee)', { locale: zhTW })}
              </div>
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-[#7C3AED]" />
                {appointment.preferred_time}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#333333] flex gap-3 justify-end">
            {appointment.status === 'pending' && (
              <>
                <Button 
                  variant="outline" 
                  className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => handleStatusChange('cancelled')}
                >
                  取消預約
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleStatusChange('confirmed')}
                >
                  確認預約
                </Button>
              </>
            )}
            {appointment.status === 'confirmed' && (
              <>
                 <Button 
                  variant="outline" 
                  className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => handleStatusChange('cancelled')}
                >
                  取消
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleStatusChange('completed')}
                >
                  標記為已完成
                </Button>
              </>
            )}
            {['completed', 'cancelled'].includes(appointment.status) && (
               <Button variant="outline" onClick={onClose}>關閉</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main Page ---

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  
  const { showToast } = useToast()

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchAppointments = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('query', searchQuery)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (dateFilter) params.append('startDate', dateFilter) // Simple filter for now
      
      const res = await fetch(`/api/landlord/appointments?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      
      const data = await res.json()
      setAppointments(data)
      setCurrentPage(1)
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '載入失敗', description: '無法載入預約資料' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [searchQuery, statusFilter, dateFilter])

  const handleStatusUpdate = async (id: string, newStatus: AppointmentStatus, feedback?: string) => {
    try {
      const res = await fetch(`/api/landlord/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, feedback })
      })
      
      if (!res.ok) throw new Error('Update failed')
      
      // Optimistic update
      setAppointments(prev => prev.map(app => 
        app.id === id ? { ...app, status: newStatus } : app
      ))
      
      // Update selected appointment if open
      if (selectedAppointment && selectedAppointment.id === id) {
        setSelectedAppointment(prev => prev ? { ...prev, status: newStatus } : null)
      }

      showToast({
        type: 'success',
        message: '狀態已更新',
        description: newStatus === 'confirmed' ? '系統已發送 Email 通知給訪客' : undefined
      })
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '更新失敗', description: '請稍後再試' })
    }
  }

  const handleDelete = async (id: string) => {
      if (!confirm('確定要刪除此預約記錄嗎？')) return
      
      try {
          const res = await fetch(`/api/landlord/appointments/${id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Delete failed')
          
          setAppointments(prev => prev.filter(a => a.id !== id))
          showToast({ type: 'success', message: '刪除成功' })
      } catch (error) {
          showToast({ type: 'error', message: '刪除失敗' })
      }
  }

  // Pagination Logic
  const totalPages = Math.ceil(appointments.length / itemsPerPage)
  const paginatedAppointments = appointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <DashboardLayout
      currentRole="landlord"
      pageTitle="預約管理"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '房東專區', href: '/landlord' },
        { label: '預約管理' },
      ]}
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input 
              placeholder="搜尋訪客姓名或電話..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1A1A1A] border-[#333333]"
            />
          </div>
          <div className="w-full md:w-48">
             <Input 
               type="date"
               value={dateFilter}
               onChange={(e) => setDateFilter(e.target.value)}
               className="bg-[#1A1A1A] border-[#333333]"
             />
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white ring-offset-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              <option value="all">所有狀態</option>
              <option value="pending">待確認</option>
              <option value="confirmed">已確認</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <Card className="bg-[#1A1A1A] border-[#333333]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#999999] uppercase bg-[#262626] border-b border-[#333333]">
                <tr>
                  <th className="px-6 py-4 font-medium">預約 ID</th>
                  <th className="px-6 py-4 font-medium">訪客資訊</th>
                  <th className="px-6 py-4 font-medium">房源</th>
                  <th className="px-6 py-4 font-medium">預約時間</th>
                  <th className="px-6 py-4 font-medium">狀態</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#999999]">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        載入中...
                      </div>
                    </td>
                  </tr>
                ) : paginatedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#999999]">
                      尚無預約記錄
                    </td>
                  </tr>
                ) : (
                  paginatedAppointments.map((app) => (
                    <tr key={app.id} className="hover:bg-[#262626]/50 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-[#666666]">
                        {app.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{app.visitor_name}</span>
                          <span className="text-xs text-[#999999]">{app.visitor_phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[200px] truncate text-white" title={app.property.title}>
                          {app.property.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-white">
                            {format(new Date(app.preferred_date), 'yyyy/MM/dd', { locale: zhTW })}
                          </span>
                          <span className="text-xs text-[#999999]">{app.preferred_time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedAppointment(app)
                              setIsDetailOpen(true)
                            }}
                          >
                            <Eye className="w-4 h-4 text-blue-400" />
                          </Button>
                          {app.status === 'pending' && (
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleStatusUpdate(app.id, 'confirmed')}
                                title="確認預約"
                             >
                                <CheckCircle className="w-4 h-4 text-green-400" />
                             </Button>
                          )}
                           <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleDelete(app.id)}
                              title="刪除"
                           >
                              <Trash2 className="w-4 h-4 text-red-400" />
                           </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!isLoading && appointments.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-[#333333]">
              <span className="text-sm text-[#999999]">
                顯示 {Math.min((currentPage - 1) * itemsPerPage + 1, appointments.length)} 到 {Math.min(currentPage * itemsPerPage, appointments.length)} 筆，共 {appointments.length} 筆
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>下一頁</Button>
              </div>
            </div>
          )}
        </Card>

        <AppointmentCalendar
          appointments={appointments}
          monthDate={calendarMonth}
          onPrevMonth={() => setCalendarMonth((current) => subMonths(current, 1))}
          onNextMonth={() => setCalendarMonth((current) => addMonths(current, 1))}
        />

        <AvailabilitySettingsPanel />
      </div>

      <AppointmentDetailModal 
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        appointment={selectedAppointment}
        onStatusUpdate={async (id, status) => {
          let feedback: string | undefined
          if (status === 'cancelled') {
            const reason = prompt('請輸入取消原因（可留空）')
            feedback = reason?.trim() || undefined
          }
          await handleStatusUpdate(id, status, feedback)
        }}
      />
    </DashboardLayout>
  )
}
