import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProduct } from '../services/api'
import toast from 'react-hot-toast'

export default function AddProductForm() {
  const [url, setUrl] = useState('')
  const [source, setSource] = useState('amazon')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product added! It will be scraped shortly.')
      setUrl('')
    },
    onError: err => toast.error(err.response?.data?.error || 'Failed to add product'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return
    mutation.mutate({ url: url.trim(), source })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-xl p-4 flex gap-3 items-center"
    >
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Paste Amazon or Flipkart product URL..."
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
        required
      />
      <select
        value={source}
        onChange={e => setSource(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
      >
        <option value="amazon">Amazon</option>
        <option value="flipkart">Flipkart</option>
        <option value="custom">Custom</option>
      </select>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50 whitespace-nowrap"
      >
        {mutation.isPending ? 'Adding...' : 'Track product'}
      </button>
    </form>
  )
}
