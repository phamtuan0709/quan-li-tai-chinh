'use client'

import { useEffect, useState, useRef } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Search, Filter, Trash2, ChevronLeft, ChevronRight, Tag, Check, X, Plus, Download } from 'lucide-react'

interface Transaction {
    id: string
    transactionType: string
    transactionTime: string
    referenceNumber: string
    debitAccount: string
    amount: number
    transactionFee: number
    beneficiaryName: string | null
    beneficiaryAccount: string | null
    beneficiaryBank: string | null
    remark: string | null
    channel: string | null
    category: string | null
    isUserLabeled?: boolean
}

interface Category {
    id: string
    name: string
    icon: string | null
    color: string | null
    isDefault: boolean
}

interface PaginationInfo {
    page: number
    limit: number
    total: number
    totalPages: number
}

const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value)
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [pagination, setPagination] = useState<PaginationInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Tất cả')
    const [page, setPage] = useState(1)
    
    // Category editing state
    const [editingTxId, setEditingTxId] = useState<string | null>(null)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchCategories()
    }, [])

    useEffect(() => {
        fetchTransactions()
    }, [page, selectedCategory])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setEditingTxId(null)
                setShowNewCategoryInput(false)
                setNewCategoryName('')
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories')
            const data = await res.json()
            setCategories(data.categories || [])
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }

    const fetchTransactions = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
            })

            if (selectedCategory !== 'Tất cả') {
                params.append('category', selectedCategory)
            }

            if (search) {
                params.append('search', search)
            }

            const res = await fetch(`/api/transactions?${params}`)
            const data = await res.json()
            setTransactions(data.transactions || [])
            setPagination(data.pagination)
        } catch (error) {
            console.error('Error fetching transactions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        fetchTransactions()
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa giao dịch này?')) return

        try {
            await fetch('/api/transactions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            })
            fetchTransactions()
        } catch (error) {
            console.error('Error deleting transaction:', error)
        }
    }

    // Update transaction category
    const handleUpdateCategory = async (txId: string, categoryName: string) => {
        try {
            const res = await fetch('/api/transactions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: txId, category: categoryName }),
            })
            
            if (res.ok) {
                // Update local state
                setTransactions(prev => prev.map(tx => 
                    tx.id === txId ? { ...tx, category: categoryName, isUserLabeled: true } : tx
                ))
                setEditingTxId(null)
                // Refresh categories in case new one was created
                fetchCategories()
            }
        } catch (error) {
            console.error('Error updating category:', error)
        }
    }

    // Create new category and assign to transaction
    const handleCreateCategory = async (txId: string) => {
        if (!newCategoryName.trim()) return
        
        try {
            // Create the category first
            await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategoryName.trim() }),
            })
            
            // Then assign it to the transaction
            await handleUpdateCategory(txId, newCategoryName.trim())
            setNewCategoryName('')
            setShowNewCategoryInput(false)
        } catch (error) {
            console.error('Error creating category:', error)
        }
    }

    // Get category color
    const getCategoryStyle = (categoryName: string | null) => {
        const cat = categories.find(c => c.name === categoryName)
        if (cat?.color) {
            return { backgroundColor: `${cat.color}20`, color: cat.color }
        }
        return { backgroundColor: 'rgba(99, 102, 241, 0.2)', color: 'rgb(165, 180, 252)' }
    }

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ['Thời gian', 'Số tiền', 'Người nhận', 'Nội dung', 'Danh mục', 'Tài khoản', 'Số tham chiếu']
        const csvData = transactions.map(tx => [
            new Date(tx.transactionTime).toLocaleString('vi-VN'),
            tx.amount,
            tx.beneficiaryName || '',
            tx.remark || '',
            tx.category || '',
            tx.debitAccount,
            tx.referenceNumber
        ])

        const csv = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `giao-dich-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="ml-64 min-h-screen">
                <Header
                    title="Giao Dịch"
                    subtitle="Danh sách tất cả giao dịch của bạn"
                />

                <div className="p-8">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 mb-6">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo nội dung, người nhận..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="input pl-11"
                                />
                            </div>
                        </form>

                        {/* Category filter */}
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value)
                                    setPage(1)
                                }}
                                className="input pl-11 pr-8 appearance-none cursor-pointer min-w-[200px]"
                            >
                                <option value="Tất cả">Tất cả</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>
                                        {cat.icon} {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Export CSV button */}
                        <button
                            onClick={handleExportCSV}
                            disabled={transactions.length === 0}
                            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            Xuất CSV
                        </button>
                    </div>

                    {/* Table */}
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#2a2a3a]">
                                        <th className="text-left p-4 text-sm font-medium text-gray-400">Thời gian</th>
                                        <th className="text-left p-4 text-sm font-medium text-gray-400">Số tiền</th>
                                        <th className="text-left p-4 text-sm font-medium text-gray-400">Người nhận</th>
                                        <th className="text-left p-4 text-sm font-medium text-gray-400">Nội dung</th>
                                        <th className="text-left p-4 text-sm font-medium text-gray-400">Danh mục</th>
                                        <th className="text-right p-4 text-sm font-medium text-gray-400">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="border-b border-[#2a2a3a]">
                                                {Array.from({ length: 6 }).map((_, j) => (
                                                    <td key={j} className="p-4">
                                                        <div className="skeleton h-6 w-full" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-500">
                                                Chưa có giao dịch nào. Hãy upload email để bắt đầu!
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx, index) => (
                                            <tr
                                                key={tx.id}
                                                className="border-b border-[#2a2a3a] hover:bg-[#1a1a25] transition-colors animate-fade-in"
                                                style={{ animationDelay: `${index * 50}ms` }}
                                            >
                                                <td className="p-4">
                                                    <div className="text-sm">
                                                        {new Date(tx.transactionTime).toLocaleDateString('vi-VN')}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(tx.transactionTime).toLocaleTimeString('vi-VN')}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-medium text-indigo-400">
                                                        {formatVND(tx.amount)}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm">{tx.beneficiaryName || '-'}</div>
                                                    <div className="text-xs text-gray-500">{tx.beneficiaryBank || ''}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm max-w-[200px] truncate" title={tx.remark || ''}>
                                                        {tx.remark || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-4 relative">
                                                    {/* Clickable category badge */}
                                                    <button
                                                        onClick={() => setEditingTxId(editingTxId === tx.id ? null : tx.id)}
                                                        className="text-xs px-2 py-1 rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                                                        style={getCategoryStyle(tx.category)}
                                                    >
                                                        <Tag className="w-3 h-3" />
                                                        {tx.category || 'Chưa phân loại'}
                                                        {tx.isUserLabeled && <span className="ml-1">✓</span>}
                                                    </button>
                                                    
                                                    {/* Category dropdown */}
                                                    {editingTxId === tx.id && (
                                                        <div 
                                                            ref={dropdownRef}
                                                            className="absolute z-50 top-full left-0 mt-1 w-56 bg-[#1a1a25] border border-[#2a2a3a] rounded-lg shadow-xl overflow-hidden"
                                                        >
                                                            <div className="p-2 border-b border-[#2a2a3a]">
                                                                <p className="text-xs text-gray-400 mb-1">Chọn danh mục:</p>
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto">
                                                                {categories.map(cat => (
                                                                    <button
                                                                        key={cat.id}
                                                                        onClick={() => handleUpdateCategory(tx.id, cat.name)}
                                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-[#2a2a3a] transition-colors flex items-center gap-2 ${
                                                                            tx.category === cat.name ? 'bg-indigo-500/20 text-indigo-300' : ''
                                                                        }`}
                                                                    >
                                                                        <span>{cat.icon}</span>
                                                                        <span>{cat.name}</span>
                                                                        {tx.category === cat.name && <Check className="w-3 h-3 ml-auto" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            
                                                            {/* Add new category */}
                                                            <div className="p-2 border-t border-[#2a2a3a]">
                                                                {showNewCategoryInput ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="text"
                                                                            value={newCategoryName}
                                                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                                                            placeholder="Tên danh mục..."
                                                                            className="flex-1 bg-[#0a0a0f] border border-[#2a2a3a] rounded px-2 py-1 text-xs focus:border-indigo-500 outline-none"
                                                                            autoFocus
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleCreateCategory(tx.id)
                                                                                if (e.key === 'Escape') {
                                                                                    setShowNewCategoryInput(false)
                                                                                    setNewCategoryName('')
                                                                                }
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={() => handleCreateCategory(tx.id)}
                                                                            className="p-1 rounded bg-indigo-500 hover:bg-indigo-600 transition-colors"
                                                                        >
                                                                            <Check className="w-3 h-3" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setShowNewCategoryInput(false)
                                                                                setNewCategoryName('')
                                                                            }}
                                                                            className="p-1 rounded hover:bg-[#2a2a3a] transition-colors"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setShowNewCategoryInput(true)}
                                                                        className="w-full text-left px-2 py-1 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                        Tạo danh mục mới
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleDelete(tx.id)}
                                                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-[#2a2a3a]">
                                <div className="text-sm text-gray-400">
                                    Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} giao dịch
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-lg hover:bg-[#1a1a25] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum
                                        if (pagination.totalPages <= 5) {
                                            pageNum = i + 1
                                        } else if (page <= 3) {
                                            pageNum = i + 1
                                        } else if (page >= pagination.totalPages - 2) {
                                            pageNum = pagination.totalPages - 4 + i
                                        } else {
                                            pageNum = page - 2 + i
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`w-8 h-8 rounded-lg transition-colors ${page === pageNum
                                                        ? 'bg-indigo-500 text-white'
                                                        : 'hover:bg-[#1a1a25]'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        )
                                    })}

                                    <button
                                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                        disabled={page === pagination.totalPages}
                                        className="p-2 rounded-lg hover:bg-[#1a1a25] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
