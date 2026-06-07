'use client';

import { useState, type FormEvent } from 'react';

interface CreateProductFormProps {
  onCreate: (name: string, description: string, price: number) => Promise<void>;
  onClose: () => void;
}

export default function CreateProductForm({ onCreate, onClose }: CreateProductFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Product name is required');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    setIsLoading(true);
    try {
      await onCreate(name.trim(), description.trim(), priceNum);
      setName('');
      setDescription('');
      setPrice('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h3 className="font-display text-lg text-white">Add New Product</h3>

      {error && (
        <p className="bg-danger/20 border border-danger text-red-200 p-3 rounded-sm text-sm font-body">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="product-name" className="font-body text-sm text-white/70">
          Product Name
        </label>
        <input
          id="product-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Men's T-shirt"
          className="p-3 rounded-sm border border-white/20 bg-white/10 text-white font-body text-base
            placeholder:text-white/40 focus:border-secondary focus:outline-none transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="product-desc" className="font-body text-sm text-white/70">
          Description (optional)
        </label>
        <textarea
          id="product-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed product description..."
          rows={3}
          className="p-3 rounded-sm border border-white/20 bg-white/10 text-white font-body text-base
            placeholder:text-white/40 focus:border-secondary focus:outline-none transition-colors resize-y"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="product-price" className="font-body text-sm text-white/70">
          Price (VND)
        </label>
        <input
          id="product-price"
          type="number"
          min="1"
          step="any"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 199000"
          className="p-3 rounded-sm border border-white/20 bg-white/10 text-white font-body text-base
            placeholder:text-white/40 focus:border-secondary focus:outline-none transition-colors
            [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>

      <div className="flex justify-end gap-3 mt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-white/20 text-white/70 rounded-sm font-body text-sm hover:bg-white/10 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-secondary text-white rounded-sm font-body text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-transform"
        >
          {isLoading ? 'Creating...' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
