'use client'

import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts'

interface DailyData {
    day: string
    total: number
}

interface ExpenseBarChartProps {
    data: DailyData[]
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

export function ExpenseBarChart({ data }: ExpenseBarChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                Chưa có dữ liệu
            </div>
        )
    }

    const maxValue = Math.max(...data.map(d => d.total))

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
                <XAxis
                    dataKey="day"
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
                                    <p className="text-indigo-400">{formatFullVND(payload[0].value as number)}</p>
                                </div>
                            )
                        }
                        return null
                    }}
                />
                <Bar
                    dataKey="total"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.total === maxValue ? '#6366f1' : '#3f3f5a'}
                        />
                    ))}
                </Bar>
            </RechartsBarChart>
        </ResponsiveContainer>
    )
}
