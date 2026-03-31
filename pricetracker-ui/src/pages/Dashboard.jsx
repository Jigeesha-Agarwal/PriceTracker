import { useQuery } from '@tanstack/react-query'
import { getProducts } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import AddProductForm from '../components/AddProductForm'
import ProductCard from '../components/ProductCard'

export default function Dashboard() {
  const { user } = useAuth()

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    refetchInterval: parseInt(import.meta.env.VITE_POLL_INTERVAL) || 30000,
  })

  const activeCount  = products.filter(p => p.active).length
  const lastScraped  = products
    .filter(p => p.last_scraped_at)
    .sort((a, b) => new Date(b.last_scraped_at) - new Date(a.last_scraped_at))[0]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track prices and get notified the moment your target is hit</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Products tracked</div>
          <div className="text-2xl font-semibold text-gray-900">{activeCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Prices with data</div>
          <div className="text-2xl font-semibold text-gray-900">
            {products.filter(p => p.current_price).length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Last scraped</div>
          <div className="text-sm font-medium text-gray-900 mt-1">
            {lastScraped
              ? new Date(lastScraped.last_scraped_at).toLocaleTimeString()
              : '—'}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <AddProductForm />
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Tracked products
        </div>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 h-16 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl p-4">
            Failed to load products. Make sure the backend is running.
          </div>
        )}

        {!isLoading && !isError && products.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-sm">No products yet. Paste a URL above to start tracking.</div>
          </div>
        )}

        {!isLoading && products.length > 0 && (
          <div className="flex flex-col gap-3">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}