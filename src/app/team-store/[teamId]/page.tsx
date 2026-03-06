'use client';

import { useState, useEffect } from 'react';

interface TeamProduct {
  id: string;
  teamId: string;
  name: string;
  description: string;
  price: number;
  sizes: string[];
  colors: string[];
  royaltyPercent: number;
}

export default function TeamStorePage({ params }: { params: { teamId: string } }) {
  const [products, setProducts] = useState<TeamProduct[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({});
  const [selectedColor, setSelectedColor] = useState<Record<string, string>>({});
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
  }, [params.teamId]);

  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/team-store?teamId=${params.teamId}`);
      const data = await res.json();
      setProducts(data);
      
      // Set defaults
      const defaults: Record<string, string> = {};
      const colorDefaults: Record<string, string> = {};
      data.forEach((p: TeamProduct) => {
        defaults[p.id] = p.sizes[0] || 'One Size';
        colorDefaults[p.id] = p.colors[0] || 'Default';
      });
      setSelectedSize(defaults);
      setSelectedColor(colorDefaults);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: TeamProduct) => {
    const size = selectedSize[product.id] || 'One Size';
    const color = selectedColor[product.id] || 'Default';
    
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
        price: product.price, 
        size, 
        color, 
        royaltyPercent: product.royaltyPercent,
        quantity: 1 
      }]);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const royaltyTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity * (item.royaltyPercent / 100)), 0);

  const teamName = params.teamId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading team store...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">🏆 {teamName} Team Store</h1>
            <p className="text-white/50 text-sm">Support your team - proceeds go to club</p>
          </div>
          <button 
            onClick={() => setCartModalOpen(true)}
            className="relative bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
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
        {/* Team Info Banner */}
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl border border-white/10 p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-3xl font-bold text-white">
              {teamName.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{teamName}</h2>
              <p className="text-white/50">Official team merchandise</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-white/50 text-sm">Team Royalties</p>
              <p className="text-green-400 font-bold text-lg">+${royaltyTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center">
                <span className="text-5xl">👕</span>
              </div>
              <div className="p-4">
                <h3 className="text-white font-semibold mb-1">{product.name}</h3>
                <p className="text-white/50 text-sm mb-3">{product.description}</p>
                
                {product.sizes.length > 1 && (
                  <div className="mb-3">
                    <label className="text-white/70 text-xs">Size:</label>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {product.sizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize({ ...selectedSize, [product.id]: size })}
                          className={`px-2 py-1 text-xs rounded ${
                            selectedSize[product.id] === size 
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
                          onClick={() => setSelectedColor({ ...selectedColor, [product.id]: color })}
                          className={`px-2 py-1 text-xs rounded ${
                            selectedColor[product.id] === color 
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
                  <div>
                    <span className="text-2xl font-bold text-white">${product.price.toFixed(2)}</span>
                    <p className="text-green-400 text-xs">{product.royaltyPercent}% to team</p>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/50">No products available yet</p>
          </div>
        )}
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
              
              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-white/70">
                  <span>Subtotal:</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-400">
                  <span>Team Royalties:</span>
                  <span>+${royaltyTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white text-lg font-bold">
                  <span>Total:</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
              </div>
              
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium mt-4">
                Checkout
              </button>
            </>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
