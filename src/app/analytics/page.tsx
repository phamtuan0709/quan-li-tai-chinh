'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ExpensePieChart } from '@/components/charts/PieChart'
import { ExpenseLineChart } from '@/components/charts/LineChart'
import { Lightbulb, TrendingUp, Loader2, RefreshCw } from 'lucide-react'

interface PredictionData {
    total: number
    byCategory: Record<string, number>
    explanation: string
    month: string
}

const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value)
}

export default function AnalyticsPage() {
    const [advice, setAdvice] = useState<string>('')
    const [prediction, setPrediction] = useState<PredictionData | null>(null)
    const [loadingAdvice, setLoadingAdvice] = useState(true)
    const [loadingPrediction, setLoadingPrediction] = useState(true)
    const [summary, setSummary] = useState<{
        currentMonth: {
            byCategory: { category: string; total: number; percentage: number }[]
        }
        monthlyTrends: { monthLabel: string; total: number }[]
    } | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        await Promise.all([
            fetchAdvice(),
            fetchPrediction(),
            fetchSummary(),
        ])
    }

    const fetchAdvice = async () => {
        setLoadingAdvice(true)
        try {
            const res = await fetch('/api/ai/advice')
            const data = await res.json()
            setAdvice(data.advice || '')
        } catch (error) {
            console.error('Error fetching advice:', error)
        } finally {
            setLoadingAdvice(false)
        }
    }

    const fetchPrediction = async () => {
        setLoadingPrediction(true)
        try {
            const res = await fetch('/api/analytics/predict')
            const data = await res.json()
            setPrediction(data.prediction)
        } catch (error) {
            console.error('Error fetching prediction:', error)
        } finally {
            setLoadingPrediction(false)
        }
    }

    const fetchSummary = async () => {
        try {
            const res = await fetch('/api/analytics/summary')
            const data = await res.json()
            setSummary(data)
        } catch (error) {
            console.error('Error fetching summary:', error)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="ml-64 min-h-screen">
                <Header
                    title="Phân Tích"
                    subtitle="Phân tích chi tiêu và dự đoán AI"
                />

                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Savings Advice */}
                        <div className="card p-6 animate-fade-in">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
                                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold">Lời khuyên tiết kiệm</h3>
                                </div>
                                <button
                                    onClick={fetchAdvice}
                                    disabled={loadingAdvice}
                                    className="p-2 rounded-lg hover:bg-[#1a1a25] transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingAdvice ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="prose prose-invert prose-sm max-w-none">
                                {loadingAdvice ? (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang phân tích chi tiêu của bạn...
                                    </div>
                                ) : (
                                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {advice}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Prediction */}
                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold">Dự đoán tháng tới</h3>
                                </div>
                                <button
                                    onClick={fetchPrediction}
                                    disabled={loadingPrediction}
                                    className="p-2 rounded-lg hover:bg-[#1a1a25] transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingPrediction ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {loadingPrediction ? (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang tính toán dự đoán...
                                </div>
                            ) : prediction ? (
                                <div>
                                    <div className="mb-4">
                                        <p className="text-gray-400 text-sm">Dự đoán chi tiêu tháng {prediction.month}</p>
                                        <p className="text-3xl font-bold gradient-text mt-1">
                                            {formatVND(prediction.total)}
                                        </p>
                                    </div>

                                    {Object.keys(prediction.byCategory).length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            <p className="text-sm text-gray-400">Theo danh mục:</p>
                                            {Object.entries(prediction.byCategory).slice(0, 5).map(([cat, amount]) => (
                                                <div key={cat} className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-300">{cat}</span>
                                                    <span className="text-indigo-400">{formatVND(amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-sm text-gray-400 border-t border-[#2a2a3a] pt-4 mt-4">
                                        {prediction.explanation}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-gray-500">
                                    Cần có ít nhất 1 tháng dữ liệu để dự đoán
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart */}
                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
                            <h3 className="text-lg font-semibold mb-4">Phân bổ chi tiêu</h3>
                            <div className="h-80">
                                {summary?.currentMonth.byCategory ? (
                                    <ExpensePieChart data={summary.currentMonth.byCategory} />
                                ) : (
                                    <div className="skeleton w-full h-full" />
                                )}
                            </div>
                        </div>

                        {/* Line Chart */}
                        <div className="card p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
                            <h3 className="text-lg font-semibold mb-4">Xu hướng 6 tháng qua</h3>
                            <div className="h-80">
                                {summary?.monthlyTrends ? (
                                    <ExpenseLineChart data={summary.monthlyTrends} />
                                ) : (
                                    <div className="skeleton w-full h-full" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Category breakdown table */}
                    {summary?.currentMonth.byCategory && summary.currentMonth.byCategory.length > 0 && (
                        <div className="mt-6 card p-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
                            <h3 className="text-lg font-semibold mb-4">Chi tiết theo danh mục</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[#2a2a3a]">
                                            <th className="text-left p-3 text-sm font-medium text-gray-400">Danh mục</th>
                                            <th className="text-right p-3 text-sm font-medium text-gray-400">Số tiền</th>
                                            <th className="text-right p-3 text-sm font-medium text-gray-400">Tỷ lệ</th>
                                            <th className="text-left p-3 text-sm font-medium text-gray-400 w-1/3">Biểu đồ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.currentMonth.byCategory.map((cat, index) => (
                                            <tr
                                                key={cat.category}
                                                className="border-b border-[#2a2a3a] hover:bg-[#1a1a25] transition-colors"
                                            >
                                                <td className="p-3 font-medium">{cat.category}</td>
                                                <td className="p-3 text-right text-indigo-400">{formatVND(cat.total)}</td>
                                                <td className="p-3 text-right text-gray-400">{cat.percentage.toFixed(1)}%</td>
                                                <td className="p-3">
                                                    <div className="h-2 bg-[#1a1a25] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${cat.percentage}%`,
                                                                animationDelay: `${index * 100}ms`
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
