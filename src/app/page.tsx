'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ExpensePieChart } from '@/components/charts/PieChart'
import { ExpenseBarChart } from '@/components/charts/BarChart'
import { ExpenseLineChart } from '@/components/charts/LineChart'
import { ExpenseAreaChart } from '@/components/charts/AreaChart'
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    CreditCard,
    ArrowUpRight,
    Receipt,
} from 'lucide-react'

interface SummaryData {
    currentMonth: {
        total: number
        transactionCount: number
        byCategory: { category: string; total: number; percentage: number }[]
        dailySpending: { day: string; total: number }[]
    }
    comparison: {
        prevMonthTotal: number
        changePercent: number
        changeAmount: number
    }
    monthlyTrends: { monthLabel: string; total: number }[]
}

const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value)
}

export default function DashboardPage() {
    const [data, setData] = useState<SummaryData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchSummary()
    }, [])

    const fetchSummary = async () => {
        try {
            const res = await fetch('/api/analytics/summary')
            if (res.status === 401) {
                setError('Vui lòng đăng nhập để xem dashboard')
                return
            }
            if (!res.ok) {
                setError('Không thể tải dữ liệu')
                return
            }
            const json = await res.json()
            setData(json)
            setError(null)
        } catch (error) {
            console.error('Error fetching summary:', error)
            setError('Đã xảy ra lỗi khi tải dữ liệu')
        } finally {
            setLoading(false)
        }
    }

    const isPositiveChange = data?.comparison?.changePercent
        ? data.comparison.changePercent < 0
        : false

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="ml-64 min-h-screen">
                <Header
                    title="Dashboard"
                    subtitle={`Tổng quan chi tiêu tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
                />

                <div className="p-8">
                    {error && (
                        <div className="mb-6 card p-6 bg-red-500/10 border-red-500/20">
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Stats cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0ms' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                    <Wallet className="w-6 h-6 text-indigo-400" />
                                </div>
                                {!loading && data?.comparison?.changePercent !== undefined && (
                                    <span className={`flex items-center gap-1 text-sm ${isPositiveChange ? 'text-green-400' : 'text-red-400'}`}>
                                        {isPositiveChange ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                        {Math.abs(data.comparison.changePercent).toFixed(1)}%
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-400 text-sm mb-1">Tổng chi tiêu</p>
                            <p className="text-2xl font-bold">
                                {loading ? (
                                    <span className="skeleton inline-block w-32 h-8 rounded" />
                                ) : (
                                    formatVND(data?.currentMonth.total || 0)
                                )}
                            </p>
                        </div>

                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                                    <Receipt className="w-6 h-6 text-green-400" />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-1">Số giao dịch</p>
                            <p className="text-2xl font-bold">
                                {loading ? (
                                    <span className="skeleton inline-block w-16 h-8 rounded" />
                                ) : (
                                    data?.currentMonth.transactionCount || 0
                                )}
                            </p>
                        </div>

                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                                    <CreditCard className="w-6 h-6 text-orange-400" />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-1">Tháng trước</p>
                            <p className="text-2xl font-bold">
                                {loading ? (
                                    <span className="skeleton inline-block w-32 h-8 rounded" />
                                ) : (
                                    formatVND(data?.comparison.prevMonthTotal || 0)
                                )}
                            </p>
                        </div>

                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPositiveChange
                                        ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                                        : 'bg-gradient-to-br from-red-500/20 to-pink-500/20'
                                    }`}>
                                    <ArrowUpRight className={`w-6 h-6 ${isPositiveChange ? 'text-green-400 rotate-180' : 'text-red-400'}`} />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-1">Chênh lệch</p>
                            <p className={`text-2xl font-bold ${isPositiveChange ? 'text-green-400' : 'text-red-400'}`}>
                                {loading ? (
                                    <span className="skeleton inline-block w-32 h-8 rounded" />
                                ) : (
                                    formatVND(data?.comparison.changeAmount || 0)
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Pie Chart */}
                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
                            <h3 className="text-lg font-semibold mb-4">Chi tiêu theo danh mục</h3>
                            <div className="h-80">
                                {loading ? (
                                    <div className="skeleton w-full h-full rounded" />
                                ) : (
                                    <ExpensePieChart data={data?.currentMonth.byCategory || []} />
                                )}
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '500ms' }}>
                            <h3 className="text-lg font-semibold mb-4">Chi tiêu theo ngày</h3>
                            <div className="h-80">
                                {loading ? (
                                    <div className="skeleton w-full h-full rounded" />
                                ) : (
                                    <ExpenseBarChart data={data?.currentMonth.dailySpending || []} />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Line Chart */}
                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '600ms' }}>
                            <h3 className="text-lg font-semibold mb-4">Xu hướng chi tiêu theo tháng</h3>
                            <div className="h-80">
                                {loading ? (
                                    <div className="skeleton w-full h-full rounded" />
                                ) : (
                                    <ExpenseLineChart data={data?.monthlyTrends || []} />
                                )}
                            </div>
                        </div>

                        {/* Area Chart */}
                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '700ms' }}>
                            <h3 className="text-lg font-semibold mb-4">Chi tiêu tích lũy trong tháng</h3>
                            <div className="h-80">
                                {loading ? (
                                    <div className="skeleton w-full h-full rounded" />
                                ) : (
                                    <ExpenseAreaChart
                                        data={(data?.currentMonth.dailySpending || []).map(d => ({
                                            name: d.day,
                                            value: d.total,
                                        }))}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent transactions quick view */}
                    {data?.currentMonth.byCategory && data.currentMonth.byCategory.length > 0 && (
                        <div className="mt-8 card p-6 animate-fade-in" style={{ animationDelay: '800ms' }}>
                            <h3 className="text-lg font-semibold mb-4">Top danh mục chi tiêu</h3>
                            <div className="space-y-4">
                                {data.currentMonth.byCategory.slice(0, 5).map((cat, index) => (
                                    <div key={cat.category} className="flex items-center gap-4">
                                        <span className="text-sm text-gray-400 w-6">{index + 1}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium">{cat.category}</span>
                                                <span className="text-gray-400">{formatVND(cat.total)}</span>
                                            </div>
                                            <div className="h-2 bg-[#1a1a25] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${cat.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-sm text-indigo-400 w-16 text-right">
                                            {cat.percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
