import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAlert } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function AlertForm({ productId, currentPrice, onSuccess }) {
  const [targetPrice, setTargetPrice] = useState('')
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const gap =
    targetPrice && currentPrice ? parseFloat(currentPrice) - parseFloat(targetPrice) : null

  const mutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', productId] })
      toast.success('Alert created! You will be notified when the price drops.')
      setTargetPrice('')
      onSuccess?.()
    },
    onError: err => toast.error(err.response?.data?.error || 'Failed to create alert'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!targetPrice || !user) return
    mutation.mutate({
      user_id: user.userId,
      product_id: parseInt(productId),
      target_price: parseFloat(targetPrice),
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-sm font-medium text-gray-700 mb-4">Set a price alert</div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Alert me when price drops to</label>
          <input
            type="number"
            value={targetPrice}
            onChange={e => setTargetPrice(e.target.value)}
            placeholder="₹ target price"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
            min="1"
            step="0.01"
            required
          />
        </div>

        {gap !== null && (
          <div
            className={`text-xs px-3 py-2 rounded-lg ${
              gap > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {gap > 0
              ? `₹${gap.toLocaleString('en-IN')} away from current price`
              : 'Target is above current price — alert will fire immediately!'}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-teal-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Creating...' : 'Create alert'}
        </button>
      </form>
    </div>
  )
}
