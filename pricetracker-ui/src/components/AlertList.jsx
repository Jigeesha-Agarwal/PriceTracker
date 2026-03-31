import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlerts, deleteAlert } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function AlertList({ productId }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: allAlerts = [], isLoading } = useQuery({
    queryKey: ['alerts', productId],
    queryFn: () => getAlerts(user?.userId),
    enabled: !!user?.userId,
  })

  const alerts = allAlerts.filter(a => String(a.product_id) === String(productId))

  const removeMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', productId] })
      toast.success('Alert removed')
    },
    onError: () => toast.error('Failed to remove alert'),
  })

  if (isLoading)
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="h-4 bg-gray-100 rounded animate-pulse w-24 mb-3" />
        <div className="h-10 bg-gray-100 rounded animate-pulse" />
      </div>
    )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-sm font-medium text-gray-700 mb-3">
        Active alerts{' '}
        {alerts.length > 0 && (
          <span className="ml-1 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-sm text-gray-400 py-2">No alerts yet for this product</div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map(alert => {
            const gap = alert.current_price
              ? parseFloat(alert.current_price) - parseFloat(alert.target_price)
              : null
            return (
              <div
                key={alert.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    ₹{parseFloat(alert.target_price).toLocaleString('en-IN')}
                  </div>
                  {gap !== null && (
                    <div className="text-xs text-amber-600 mt-0.5">
                      ₹{gap.toLocaleString('en-IN')} away
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeMutation.mutate(alert.id)}
                  disabled={removeMutation.isPending}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
