import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getAlerts, deleteAlert } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function Alerts() {
  const [view, setView] = useState('active')
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: activeAlerts = [], isLoading: loadingActive } = useQuery({
    queryKey: ['all-alerts', 'active'],
    queryFn: () => getAlerts(user?.userId, false),
    enabled: !!user?.userId,
  })

  const { data: allAlerts = [], isLoading: loadingAll } = useQuery({
    queryKey: ['all-alerts', 'fired'],
    queryFn: () => getAlerts(user?.userId, true),
    enabled: !!user?.userId && view === 'fired',
  })

  const firedAlerts = allAlerts.filter(a => a.fired_at)
  const isLoading = view === 'active' ? loadingActive : loadingAll
  const alerts = view === 'active' ? activeAlerts : firedAlerts

  const removeMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-alerts'] })
      toast.success('Alert removed')
    },
    onError: () => toast.error('Failed to remove alert'),
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My alerts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''} across all
            products
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView('active')}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              view === 'active'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active
            {activeAlerts.length > 0 && (
              <span className="ml-1.5 bg-teal-100 text-teal-700 text-xs px-1.5 py-0.5 rounded-full">
                {activeAlerts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('fired')}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              view === 'fired'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Fired history
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl h-16 animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && alerts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">{view === 'active' ? '🔔' : '📭'}</div>
          <div className="text-sm">
            {view === 'active'
              ? 'No active alerts. Go to a product and set a target price.'
              : 'No alerts have fired yet.'}
          </div>
        </div>
      )}

      {!isLoading && alerts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <div className="col-span-4">Product</div>
            <div className="col-span-2 text-right">Target</div>
            <div className="col-span-2 text-right">Current</div>
            <div className="col-span-2 text-right">{view === 'active' ? 'Gap' : 'Fired at'}</div>
            <div className="col-span-2 text-right"></div>
          </div>

          {alerts.map((alert, idx) => {
            const gap =
              alert.current_price && !alert.fired_at
                ? parseFloat(alert.current_price) - parseFloat(alert.target_price)
                : null

            const gapColor =
              gap !== null
                ? gap < 500
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-gray-500 bg-gray-50'
                : ''

            return (
              <div
                key={alert.id}
                className={`grid grid-cols-12 gap-4 px-4 py-3.5 items-center text-sm ${
                  idx < alerts.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="col-span-4">
                  <div
                    className="font-medium text-gray-900 truncate cursor-pointer hover:text-teal-600"
                    onClick={() => navigate(`/product/${alert.product_id}`)}
                  >
                    {alert.product_name || 'Unknown product'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{alert.product_url}</div>
                </div>
                <div className="col-span-2 text-right font-medium text-gray-900">
                  ₹{parseFloat(alert.target_price).toLocaleString('en-IN')}
                </div>
                <div className="col-span-2 text-right text-gray-600">
                  {alert.current_price
                    ? `₹${parseFloat(alert.current_price).toLocaleString('en-IN')}`
                    : '—'}
                </div>
                <div className="col-span-2 text-right">
                  {view === 'active' && gap !== null ? (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${gapColor}`}>
                      ₹{gap.toLocaleString('en-IN')}
                    </span>
                  ) : alert.fired_at ? (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                      {formatDistanceToNow(new Date(alert.fired_at), { addSuffix: true })}
                    </span>
                  ) : (
                    '—'
                  )}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    onClick={() => navigate(`/product/${alert.product_id}`)}
                    className="text-xs text-teal-600 hover:text-teal-800"
                  >
                    View
                  </button>
                  {view === 'active' && (
                    <button
                      onClick={() => removeMutation.mutate(alert.id)}
                      disabled={removeMutation.isPending}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
