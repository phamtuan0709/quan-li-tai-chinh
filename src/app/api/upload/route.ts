import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseBIDVEmail } from '@/lib/email-parser'
import { categorizeTransaction } from '@/lib/gemini'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const files = formData.getAll('files') as File[]

        if (files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 })
        }

        const results = []
        const errors: string[] = []

        for (const file of files) {
            try {
                const content = await file.text()
                const transaction = await parseBIDVEmail(content)

                if (!transaction) {
                    errors.push(`${file.name}: Không thể parse email`)
                    continue
                }

                // Check if transaction already exists
                const existing = await prisma.transaction.findUnique({
                    where: { referenceNumber: transaction.referenceNumber }
                })

                if (existing) {
                    errors.push(`${file.name}: Giao dịch đã tồn tại (${transaction.referenceNumber})`)
                    continue
                }

                // Categorize using AI
                const category = await categorizeTransaction(
                    transaction.beneficiaryName,
                    transaction.remark,
                    transaction.amount
                )

                // Save to database
                const saved = await prisma.transaction.create({
                    data: {
                        userId: session.user.id,
                        transactionType: transaction.transactionType,
                        transactionTime: transaction.transactionTime,
                        referenceNumber: transaction.referenceNumber,
                        debitAccount: transaction.debitAccount,
                        amount: transaction.amount,
                        transactionFee: transaction.transactionFee,
                        beneficiaryName: transaction.beneficiaryName,
                        beneficiaryAccount: transaction.beneficiaryAccount,
                        beneficiaryBank: transaction.beneficiaryBank,
                        remark: transaction.remark,
                        channel: transaction.channel,
                        category,
                    }
                })

                results.push({
                    ...saved,
                    fileName: file.name,
                })
            } catch (err) {
                console.error(`Error processing ${file.name}:`, err)
                errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`)
            }
        }

        return NextResponse.json({
            success: true,
            imported: results.length,
            transactions: results,
            errors,
        })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
