'use client'

import {
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts'

interface CategoryData {
    category: string
    total: number
    percentage: number
}

interface ExpensePieChartProps {
    data: CategoryData[]
}

const COLORS = [
    '#6366f1', // indigo
    '#a855f7', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#ef4444', // red
    '#84cc16', // lime
    '#f97316', // orange
]

const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value)
}

export function ExpensePieChart({ data }: ExpensePieChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                Chưa có dữ liệu
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="category"
                    animationBegin={0}
                    animationDuration={800}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="transparent"
                        />
                    ))}
                </Pie>
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                                <div className="bg-[#1a1a25] border border-[#2a2a3a] rounded-lg p-3">
                                    <p className="font-medium">{data.category}</p>
                                    <p className="text-gray-400 text-sm">{formatVND(data.total)}</p>
                                    <p className="text-xs text-indigo-400">{data.percentage.toFixed(1)}%</p>
                                </div>
                            )
                        }
                        return null
                    }}
                />
                <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    formatter={(value) => (
                        <span className="text-sm text-gray-300">{value}</span>
                    )}
                />
            </RechartsPieChart>
        </ResponsiveContainer>
    )
}
