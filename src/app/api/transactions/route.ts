import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)

        // Parse filters
        const category = searchParams.get('category')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const search = searchParams.get('search')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        // Build where clause
        const where: Record<string, unknown> = {
            userId: session.user.id,
        }

        if (category) {
            where.category = category
        }

        if (startDate || endDate) {
            where.transactionTime = {}
            if (startDate) {
                (where.transactionTime as Record<string, Date>).gte = new Date(startDate)
            }
            if (endDate) {
                (where.transactionTime as Record<string, Date>).lte = new Date(endDate)
            }
        }

        if (search) {
            where.OR = [
                { beneficiaryName: { contains: search } },
                { remark: { contains: search } },
                { referenceNumber: { contains: search } },
            ]
        }

        // Get transactions with pagination
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { transactionTime: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.transaction.count({ where }),
        ])

        return NextResponse.json({
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Transactions error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
        }

        // Verify ownership
        const transaction = await prisma.transaction.findFirst({
            where: { id, userId: session.user.id },
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        await prisma.transaction.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT - Update transaction (mainly for category labeling)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, category } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
        }

        // Verify ownership
        const transaction = await prisma.transaction.findFirst({
            where: { id, userId: session.user.id },
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Update transaction with new category
        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                category,
                isUserLabeled: true, // Mark as manually labeled
            }
        })

        // Learn from this label - extract patterns and save to CategoryPattern
        if (category) {
            await learnFromLabel(session.user.id, category, transaction)
        }

        return NextResponse.json({ transaction: updated })
    } catch (error) {
        console.error('Update error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ML Learning: Extract patterns from labeled transaction
async function learnFromLabel(
    userId: string,
    categoryName: string,
    transaction: {
        beneficiaryName: string | null
        beneficiaryAccount: string | null
        remark: string | null
        amount: number
    }
) {
    try {
        // Find or create the category
        let category = await prisma.category.findUnique({
            where: { userId_name: { userId, name: categoryName } }
        })

        if (!category) {
            // Create new category if doesn't exist
            category = await prisma.category.create({
                data: {
                    userId,
                    name: categoryName,
                    icon: '📁',
                    color: '#6b7280',
                    isDefault: false,
                }
            })
        }

        // Extract keywords from transaction
        const keywords = extractKeywords(transaction)

        // Save each keyword as a pattern
        for (const keyword of keywords) {
            await prisma.categoryPattern.upsert({
                where: {
                    categoryId_keyword: {
                        categoryId: category.id,
                        keyword
                    }
                },
                update: {
                    occurrences: { increment: 1 },
                    weight: { increment: 0.1 } // Increase weight with more occurrences
                },
                create: {
                    categoryId: category.id,
                    keyword,
                    weight: 1.0,
                    occurrences: 1
                }
            })
        }
    } catch (error) {
        console.error('Error learning from label:', error)
    }
}

// Extract meaningful keywords from transaction data
function extractKeywords(transaction: {
    beneficiaryName: string | null
    beneficiaryAccount: string | null
    remark: string | null
    amount: number
}): string[] {
    const keywords: string[] = []
    
    // Normalize and extract from beneficiary name
    if (transaction.beneficiaryName) {
        const name = transaction.beneficiaryName.toLowerCase().trim()
        keywords.push(name)
        
        // Also add individual words (for partial matching)
        const words = name.split(/\s+/).filter(w => w.length > 2)
        keywords.push(...words)
    }
    
    // Extract from remark
    if (transaction.remark) {
        const remark = transaction.remark.toLowerCase().trim()
        keywords.push(remark)
        
        // Add individual meaningful words
        const words = remark.split(/\s+/).filter(w => w.length > 2)
        keywords.push(...words)
    }
    
    // Add beneficiary account as pattern (useful for recurring payments)
    if (transaction.beneficiaryAccount) {
        keywords.push(transaction.beneficiaryAccount)
    }
    
    // Add amount range pattern (e.g., "amount_5000_10000")
    const amountRange = getAmountRange(transaction.amount)
    keywords.push(amountRange)
    
    // Remove duplicates and return
    return [...new Set(keywords)].filter(k => k.length > 0)
}

function getAmountRange(amount: number): string {
    if (amount < 10000) return 'amount_under_10k'
    if (amount < 50000) return 'amount_10k_50k'
    if (amount < 100000) return 'amount_50k_100k'
    if (amount < 500000) return 'amount_100k_500k'
    if (amount < 1000000) return 'amount_500k_1m'
    return 'amount_over_1m'
}
