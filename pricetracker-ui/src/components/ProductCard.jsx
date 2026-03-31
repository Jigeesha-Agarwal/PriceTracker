import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

export default function ProductCard({ product }) {
  const navigate = useNavigate()
  const price = product.current_price ? parseFloat(product.current_price) : null
  const lastScraped = product.last_scraped_at
    ? formatDistanceToNow(new Date(product.last_scraped_at), { addSuffix: true })
    : 'not yet scraped'

  const sourceBg =
    {
      amazon: 'bg-orange-50 text-orange-700',
      flipkart: 'bg-blue-50 text-blue-700',
      custom: 'bg-gray-100 text-gray-600',
    }[product.source] || 'bg-gray-100 text-gray-600'

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-teal-300 hover:shadow-sm transition-all"
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 text-sm truncate">
          {product.name || product.url}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceBg}`}>
            {product.source}
          </span>
          <span className="text-xs text-gray-400">scraped {lastScraped}</span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        {price ? (
          <div className="text-lg font-semibold text-gray-900">
            ₹{price.toLocaleString('en-IN')}
          </div>
        ) : (
          <div className="text-sm text-gray-400">pending</div>
        )}
      </div>

      <div className="text-gray-300 text-lg flex-shrink-0">›</div>
    </div>
  )
}
