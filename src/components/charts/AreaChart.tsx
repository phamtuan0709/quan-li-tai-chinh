'use client'

import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

interface AreaChartData {
    name: string
    value: number
}

interface ExpenseAreaChartProps {
    data: AreaChartData[]
}

const formatVND = (value: number) => {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
}

const formatFullVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value)
}

export function ExpenseAreaChart({ data }: ExpenseAreaChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                Chưa có dữ liệu
            </div>
        )
    }

    // Calculate cumulative values
    let cumulative = 0
    const cumulativeData = data.map(item => {
        cumulative += item.value
        return {
            name: item.name,
            value: item.value,
            cumulative,
        }
    })

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsAreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={formatVND}
                />
                <Tooltip
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="bg-[#1a1a25] border border-[#2a2a3a] rounded-lg p-3">
                                    <p className="font-medium">{label}</p>
                                    <p className="text-gray-400 text-sm">Hôm nay: {formatFullVND(payload[0].payload.value)}</p>
                                    <p className="text-indigo-400">Tích lũy: {formatFullVND(payload[0].value as number)}</p>
                                </div>
                            )
                        }
                        return null
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                    animationDuration={800}
                />
            </RechartsAreaChart>
        </ResponsiveContainer>
    )
}
