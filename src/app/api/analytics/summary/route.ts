import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const monthsBack = parseInt(searchParams.get('months') || '6')

        const now = new Date()
        const currentMonthStart = startOfMonth(now)
        const currentMonthEnd = endOfMonth(now)

        // Get current month summary
        const currentMonthTransactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                transactionTime: {
                    gte: currentMonthStart,
                    lte: currentMonthEnd,
                },
            },
        })

        const currentMonthTotal = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0)

        // Group by category
        const byCategory: Record<string, number> = {}
        currentMonthTransactions.forEach(t => {
            const cat = t.category || 'Khác'
            byCategory[cat] = (byCategory[cat] || 0) + t.amount
        })

        // Get monthly totals for the past N months
        const monthlyTotals = []
        for (let i = 0; i < monthsBack; i++) {
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
            const catBreakdown: Record<string, number> = {}
            transactions.forEach(t => {
                const cat = t.category || 'Khác'
                catBreakdown[cat] = (catBreakdown[cat] || 0) + t.amount
            })

            monthlyTotals.unshift({
                month: format(monthStart, 'MM/yyyy'),
                monthLabel: format(monthStart, 'MMM yyyy'),
                total,
                byCategory: catBreakdown,
                transactionCount: transactions.length,
            })
        }

        // Get daily spending for current month
        const dailySpending: Record<string, number> = {}
        currentMonthTransactions.forEach(t => {
            const day = format(t.transactionTime, 'dd/MM')
            dailySpending[day] = (dailySpending[day] || 0) + t.amount
        })

        // Previous month comparison
        const prevMonthStart = startOfMonth(subMonths(now, 1))
        const prevMonthEnd = endOfMonth(subMonths(now, 1))
        const prevMonthTransactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                transactionTime: {
                    gte: prevMonthStart,
                    lte: prevMonthEnd,
                },
            },
        })
        const prevMonthTotal = prevMonthTransactions.reduce((sum, t) => sum + t.amount, 0)

        // Calculate change percentage
        const changePercent = prevMonthTotal > 0
            ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
            : 0

        return NextResponse.json({
            currentMonth: {
                total: currentMonthTotal,
                transactionCount: currentMonthTransactions.length,
                byCategory: Object.entries(byCategory).map(([category, total]) => ({
                    category,
                    total,
                    percentage: currentMonthTotal > 0 ? (total / currentMonthTotal) * 100 : 0,
                })),
                dailySpending: Object.entries(dailySpending).map(([day, total]) => ({
                    day,
                    total,
                })),
            },
            comparison: {
                prevMonthTotal,
                changePercent,
                changeAmount: currentMonthTotal - prevMonthTotal,
            },
            monthlyTrends: monthlyTotals,
        })
    } catch (error) {
        console.error('Summary error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
