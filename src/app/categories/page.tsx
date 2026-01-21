'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Plus, Trash2, Edit2, Check, X, Tag, Sparkles } from 'lucide-react'

interface Category {
    id: string
    name: string
    icon: string | null
    color: string | null
    isDefault: boolean
    _count?: {
        patterns: number
    }
}

const EMOJI_OPTIONS = ['🍜', '🚗', '🛒', '💡', '🎮', '💊', '📚', '💸', '💰', '📦', '☕', '🍵', '🎬', '🏠', '👕', '✈️', '🎁', '💳', '🏥', '🎓']
const COLOR_OPTIONS = ['#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#22c55e', '#6b7280', '#f97316', '#84cc16']

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState({ name: '', icon: '', color: '' })
    const [showAddForm, setShowAddForm] = useState(false)
    const [newCategory, setNewCategory] = useState({ name: '', icon: '📁', color: '#6b7280' })

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories')
            const data = await res.json()
            setCategories(data.categories || [])
        } catch (error) {
            console.error('Error fetching categories:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!newCategory.name.trim()) return

        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCategory),
            })

            if (res.ok) {
                setNewCategory({ name: '', icon: '📁', color: '#6b7280' })
                setShowAddForm(false)
                fetchCategories()
            } else {
                const data = await res.json()
                alert(data.error || 'Lỗi tạo danh mục')
            }
        } catch (error) {
            console.error('Error creating category:', error)
        }
    }

    const handleUpdate = async (id: string) => {
        try {
            const res = await fetch('/api/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...editForm }),
            })

            if (res.ok) {
                setEditingId(null)
                fetchCategories()
            }
        } catch (error) {
            console.error('Error updating category:', error)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa danh mục "${name}"? Các giao dịch thuộc danh mục này sẽ được chuyển sang "Khác".`)) return

        try {
            const res = await fetch(`/api/categories?id=${id}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                fetchCategories()
            } else {
                const data = await res.json()
                alert(data.error || 'Lỗi xóa danh mục')
            }
        } catch (error) {
            console.error('Error deleting category:', error)
        }
    }

    const startEdit = (cat: Category) => {
        setEditingId(cat.id)
        setEditForm({
            name: cat.name,
            icon: cat.icon || '📁',
            color: cat.color || '#6b7280',
        })
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="ml-64 min-h-screen">
                <Header
                    title="Quản Lý Danh Mục"
                    subtitle="Tạo và quản lý danh mục chi tiêu của bạn"
                />

                <div className="p-8 max-w-4xl mx-auto">
                    {/* ML Info Card */}
                    <div className="card p-4 mb-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
                        <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-indigo-300">Học máy tự động</h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Mỗi khi bạn gán danh mục cho giao dịch, hệ thống sẽ học và tự động gợi ý cho các giao dịch tương tự trong tương lai.
                                    Ví dụ: Gán &quot;Trà đá&quot; cho một giao dịch, lần sau chuyển tiền cho người đó sẽ tự động được gợi ý &quot;Trà đá&quot;.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Add new category button */}
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary mb-6"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm danh mục mới
                        </button>
                    )}

                    {/* Add form */}
                    {showAddForm && (
                        <div className="card p-4 mb-6 animate-fade-in">
                            <h3 className="font-medium mb-4">Tạo danh mục mới</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Tên danh mục</label>
                                    <input
                                        type="text"
                                        value={newCategory.name}
                                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                        placeholder="Ví dụ: Trà đá, Cafe, Xăng xe..."
                                        className="input"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Icon</label>
                                    <div className="flex flex-wrap gap-2">
                                        {EMOJI_OPTIONS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => setNewCategory({ ...newCategory, icon: emoji })}
                                                className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                                                    newCategory.icon === emoji
                                                        ? 'bg-indigo-500 scale-110'
                                                        : 'bg-[#1a1a25] hover:bg-[#2a2a3a]'
                                                }`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Màu sắc</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLOR_OPTIONS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setNewCategory({ ...newCategory, color })}
                                                className={`w-8 h-8 rounded-full transition-all ${
                                                    newCategory.color === color ? 'ring-2 ring-white scale-110' : ''
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={handleCreate} className="btn btn-primary">
                                        <Check className="w-4 h-4" />
                                        Tạo
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAddForm(false)
                                            setNewCategory({ name: '', icon: '📁', color: '#6b7280' })
                                        }}
                                        className="btn bg-[#1a1a25] hover:bg-[#2a2a3a]"
                                    >
                                        <X className="w-4 h-4" />
                                        Hủy
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Categories list */}
                    <div className="space-y-2">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="card p-4">
                                    <div className="skeleton h-8 w-full" />
                                </div>
                            ))
                        ) : categories.length === 0 ? (
                            <div className="card p-8 text-center text-gray-500">
                                Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!
                            </div>
                        ) : (
                            categories.map((cat, index) => (
                                <div
                                    key={cat.id}
                                    className="card p-4 animate-fade-in"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {editingId === cat.id ? (
                                        // Edit mode
                                        <div className="space-y-4">
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="input"
                                            />
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {EMOJI_OPTIONS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => setEditForm({ ...editForm, icon: emoji })}
                                                        className={`w-8 h-8 rounded text-lg flex items-center justify-center ${
                                                            editForm.icon === emoji ? 'bg-indigo-500' : 'bg-[#1a1a25]'
                                                        }`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {COLOR_OPTIONS.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setEditForm({ ...editForm, color })}
                                                        className={`w-6 h-6 rounded-full ${
                                                            editForm.color === color ? 'ring-2 ring-white' : ''
                                                        }`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdate(cat.id)}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    <Check className="w-3 h-3" />
                                                    Lưu
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="btn bg-[#1a1a25] hover:bg-[#2a2a3a] btn-sm"
                                                >
                                                    <X className="w-3 h-3" />
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View mode
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                                    style={{ backgroundColor: `${cat.color}20` }}
                                                >
                                                    {cat.icon}
                                                </div>
                                                <div>
                                                    <div className="font-medium flex items-center gap-2">
                                                        {cat.name}
                                                        {cat.isDefault && (
                                                            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                                                                Mặc định
                                                            </span>
                                                        )}
                                                    </div>
                                                    {cat._count?.patterns ? (
                                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3" />
                                                            {cat._count.patterns} patterns đã học
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: cat.color || '#6b7280' }}
                                                />
                                                <button
                                                    onClick={() => startEdit(cat)}
                                                    className="p-2 rounded-lg hover:bg-[#1a1a25] text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {!cat.isDefault && (
                                                    <button
                                                        onClick={() => handleDelete(cat.id, cat.name)}
                                                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
