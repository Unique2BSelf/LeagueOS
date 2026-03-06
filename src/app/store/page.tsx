'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  sizes: string[];
  colors: string[];
  stock: number;
  isFeatured: boolean;
  imageUrl: string | null;
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [category, setCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [cartModalOpen, setCartModalOpen] = useState(false);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cartModalOpen) {
        setCartModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [cartModalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (cartModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [cartModalOpen]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/store/products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = category === 'ALL' 
    ? products 
    : products.filter(p => p.category === category);

  const featuredProducts = products.filter(p => p.isFeatured);

  const addToCart = (product: Product, size: string, color: string) => {
    const existing = cart.find(
      item => item.productId === product.id && item.size === size && item.color === color
    );
    if (existing) {
      setCart(cart.map(item => 
        item.productId === product.id && item.size === size && item.color === color
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { 
        productId: product.id, 
        name: product.name, 
        price: product.basePrice, 
        size, 
        color, 
        quantity: 1 
      }]);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const categories = ['ALL', 'JERSEYS', 'APPAREL', 'EQUIPMENT', 'ACCESSORIES'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading store...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">⚽ League Store</h1>
          <button 
            onClick={() => setCartModalOpen(true)}
            className="relative bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <span>🛒</span>
            <span>Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">⭐ Featured Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
              ))}
            </div>
          </section>
        )}

        {/* Category Filter */}
        <section className="mb-8">
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  category === cat 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {cat === 'ALL' ? 'All Products' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </section>

        {/* Product Grid */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">
            {category === 'ALL' ? 'All Products' : category.charAt(0) + category.slice(1).toLowerCase()}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
        </section>
      </main>

      {/* Cart Modal */}
      {cartModalOpen && (
        <>
          {/* Backdrop - click to close */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            onClick={() => setCartModalOpen(false)}
            aria-hidden="true"
          />
          
          {/* Modal */}
          <div 
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-modal-title"
          >
            <div 
              className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-white/10 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 id="cart-modal-title" className="text-xl font-bold text-white">Shopping Cart</h3>
                <button 
                  onClick={() => setCartModalOpen(false)}
                  className="text-white/70 hover:text-white transition-colors p-1"
                  aria-label="Close cart"
                >
                  ✕
                </button>
              </div>
          
          {cart.length === 0 ? (
            <p className="text-white/70 text-center py-8">Your cart is empty</p>
          ) : (
            <>
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                    <div>
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-white/50 text-sm">{item.size} / {item.color} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white">${(item.price * item.quantity).toFixed(2)}</span>
                      <button 
                        onClick={() => removeFromCart(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between text-white text-lg font-bold mb-4">
                  <span>Total:</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors">
                  Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (p: Product, s: string, c: string) => void }) {
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'One Size');
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || 'Default');

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/50 transition-colors group">
      <div className="h-48 bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center">
        <span className="text-6xl">👕</span>
      </div>
      <div className="p-4">
        <h3 className="text-white font-semibold mb-1">{product.name}</h3>
        <p className="text-white/50 text-sm mb-3 line-clamp-2">{product.description}</p>
        
        {product.sizes.length > 1 && (
          <div className="mb-3">
            <label className="text-white/70 text-xs">Size:</label>
            <div className="flex gap-1 flex-wrap mt-1">
              {product.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedSize === size 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {product.colors.length > 1 && (
          <div className="mb-3">
            <label className="text-white/70 text-xs">Color:</label>
            <div className="flex gap-1 flex-wrap mt-1">
              {product.colors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedColor === color 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mt-4">
          <span className="text-2xl font-bold text-white">${product.basePrice.toFixed(2)}</span>
          <button
            onClick={() => onAddToCart(product, selectedSize, selectedColor)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
