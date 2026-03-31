import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProduct, getProductStats } from '../services/api'
import PriceChart from '../components/PriceChart'
import AlertForm from '../components/AlertForm'
import AlertList from '../components/AlertList'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
  })

  const { data: stats } = useQuery({
    queryKey: ['stats', id],
    queryFn: () => getProductStats(id),
    enabled: !!id,
  })

  if (loadingProduct)
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mb-8" />
        <div className="h-52 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )

  if (!product)
    return <div className="max-w-4xl mx-auto px-6 py-8 text-gray-500">Product not found</div>

  const price = product.current_price ? parseFloat(product.current_price) : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1"
      >
        ← Dashboard
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {product.name || 'Unnamed product'}
          </h1>
          <a
            href={product.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-teal-600 hover:underline mt-1 block truncate max-w-md"
          >
            {product.url}
          </a>
        </div>
        {price && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">₹{price.toLocaleString('en-IN')}</div>
            {stats?.drop_pct_from_high > 0 && (
              <div className="text-xs text-teal-600 mt-0.5">
                ▼ {stats.drop_pct_from_high}% from 30d high
              </div>
            )}
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: '30d low', value: stats.min_price, color: 'text-teal-600' },
            { label: '30d high', value: stats.max_price, color: 'text-gray-900' },
            { label: '30d avg', value: stats.avg_price, color: 'text-gray-900' },
            { label: 'data points', value: stats.data_points, color: 'text-gray-900', raw: true },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className={`text-base font-semibold ${s.color}`}>
                {s.raw
                  ? s.value
                  : s.value
                    ? `₹${parseFloat(s.value).toLocaleString('en-IN')}`
                    : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6">
        <PriceChart productId={id} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AlertForm productId={id} currentPrice={product.current_price} />
        <AlertList productId={id} />
      </div>
    </div>
  )
}
