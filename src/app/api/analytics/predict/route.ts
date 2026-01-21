import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { predictNextMonth } from '@/lib/gemini'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()

        // Get last 3 months of data for prediction
        const historicalData = []

        for (let i = 1; i <= 3; i++) {
            const monthStart = startOfMonth(subMonths(now, i))
            const monthEnd = endOfMonth(subMonths(now, i))

            const transactions = await prisma.transaction.findMany({
                where: {
                    userId: session.user.id,
                    transactionTime: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                },
            })

            const total = transactions.reduce((sum, t) => sum + t.amount, 0)
            const byCategory: Record<string, number> = {}

            transactions.forEach(t => {
                const cat = t.category || 'Khác'
                byCategory[cat] = (byCategory[cat] || 0) + t.amount
            })

            historicalData.unshift({
                month: format(monthStart, 'MM/yyyy'),
                total,
                byCategory,
            })
        }

        if (historicalData.length === 0) {
            return NextResponse.json({
                prediction: null,
                message: 'Cần có ít nhất 1 tháng dữ liệu để dự đoán',
            })
        }

        const prediction = await predictNextMonth(historicalData)

        return NextResponse.json({
            prediction: {
                ...prediction,
                month: format(new Date(), 'MM/yyyy'),
            },
            historicalData,
        })
    } catch (error) {
        console.error('Predict error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
