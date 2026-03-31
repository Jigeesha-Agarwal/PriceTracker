import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { getPriceHistory } from '../services/api'
import { format } from 'date-fns'

const DAYS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]

export default function PriceChart({ productId, targetPrice }) {
  const [days, setDays] = useState(30)

  const { data, isLoading } = useQuery({
    queryKey: ['price-history', productId, days],
    queryFn: () => getPriceHistory(productId, days),
    enabled: !!productId,
  })

  const chartData = (data?.history || []).map(h => ({
    date: format(new Date(h.recorded_at), days <= 7 ? 'MMM d HH:mm' : 'MMM d'),
    price: parseFloat(h.price),
  }))

  const prices = chartData.map(d => d.price)
  const minPrice = prices.length ? Math.min(...prices) : 0
  const maxPrice = prices.length ? Math.max(...prices) : 0
  const padding = (maxPrice - minPrice) * 0.05 || 100

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">Price history</span>
        <div className="flex gap-1">
          {DAYS.map(d => (
            <button
              key={d.value}
              onClick={() => setDays(d.value)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                days === d.value ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-52 bg-gray-50 rounded-lg animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-gray-400">
          No price data yet — check back after the next scrape
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
              width={52}
            />
            <Tooltip
              formatter={v => [`₹${parseFloat(v).toLocaleString('en-IN')}`, 'Price']}
              contentStyle={{ fontSize: 12, borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#0d9488"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#0d9488' }}
            />
            {targetPrice && (
              <ReferenceLine
                y={targetPrice}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `Target ₹${targetPrice}`, fill: '#b45309', fontSize: 11 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
