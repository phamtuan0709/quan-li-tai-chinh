import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chatWithAI } from '@/lib/gemini'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { message, conversationId } = await request.json()

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 })
        }

        // Get or create conversation
        let conversation
        if (conversationId) {
            conversation = await prisma.conversation.findFirst({
                where: { id: conversationId, userId: session.user.id },
                include: { messages: { orderBy: { createdAt: 'asc' } } },
            })
        }

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    userId: session.user.id,
                    title: message.slice(0, 50),
                },
                include: { messages: true },
            })
        }

        // Save user message
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'user',
                content: message,
            },
        })

        // Get spending context
        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                transactionTime: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
            orderBy: { transactionTime: 'desc' },
        })

        const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0)

        const byCategory: Record<string, number> = {}
        transactions.forEach(t => {
            const cat = t.category || 'Khác'
            byCategory[cat] = (byCategory[cat] || 0) + t.amount
        })

        const context = {
            totalSpending,
            monthlyBreakdown: Object.entries(byCategory).map(([category, total]) => ({
                category,
                total,
            })),
            recentTransactions: transactions.slice(0, 10).map(t => ({
                amount: t.amount,
                category: t.category || 'Khác',
                remark: t.remark || '',
                date: format(t.transactionTime, 'dd/MM/yyyy'),
            })),
        }

        // Build conversation history for AI
        const history = conversation.messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
            content: m.content,
        }))

        // Get AI response
        const aiResponse = await chatWithAI(message, context, history)

        // Save AI response
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'assistant',
                content: aiResponse,
            },
        })

        return NextResponse.json({
            response: aiResponse,
            conversationId: conversation.id,
        })
    } catch (error) {
        console.error('Chat error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const conversations = await prisma.conversation.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
            take: 20,
        })

        return NextResponse.json({ conversations })
    } catch (error) {
        console.error('Get conversations error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
