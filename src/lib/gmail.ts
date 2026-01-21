import Imap from 'imap'
import { simpleParser } from 'mailparser'
import { prisma } from './prisma'
import { categorizeTransaction } from './gemini'
import { categorizeWithML } from './ml-categorizer'

interface BIDVTransaction {
    transactionType: string
    transactionTime: Date
    referenceNumber: string
    debitAccount: string
    amount: number
    transactionFee: number
    beneficiaryName: string | null
    beneficiaryAccount: string | null
    beneficiaryBank: string | null
    remark: string | null
    channel: string | null
}

// Parse Vietnamese number format
function parseVietnamNumber(str: string): number {
    if (!str) return 0
    let cleaned = str.replace(/VND/gi, '').trim()
    if (cleaned.includes('.') && !cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '')
    } else if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/,/g, '')
    } else {
        cleaned = cleaned.replace(/,/g, '')
    }
    return parseFloat(cleaned) || 0
}

// Parse date from BIDV format: 20/01/2026 13:22:06
function parseVietnamDate(dateStr: string): Date {
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
    if (match) {
        const [, day, month, year, hour, minute, second] = match
        return new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second)
        )
    }
    return new Date()
}

// Extract field value from HTML content
function extractField(html: string, fieldNames: string[]): string | null {
    for (const fieldName of fieldNames) {
        const patterns = [
            // Pattern for BIDV format: <td>Field:<br><span>...</span></td><td>Value<br><span>...</span></td>
            new RegExp(`<td[^>]*>[\\s\\S]*?${fieldName}[:\\s]*[\\s\\S]*?<\\/td>\\s*<td[^>]*>([^<]+)`, 'i'),
            // Pattern: Two cells in a row without br
            new RegExp(`<td[^>]*>[^<]*${fieldName}[^<]*<\\/td>\\s*<td[^>]*>([^<]+)<\\/td>`, 'i'),
            // Pattern: Colon separated in same content
            new RegExp(`${fieldName}[:\\s]*([^<\\n]+)`, 'i'),
            // Pattern: Bold value after field
            new RegExp(`${fieldName}[^<]*<[^>]*>([^<]+)<`, 'i'),
        ]

        for (const pattern of patterns) {
            const match = html.match(pattern)
            if (match && match[1]) {
                const value = match[1].trim()
                if (value && value !== '' && !value.includes('<') && value.length > 0) {
                    return value
                }
            }
        }
    }
    return null
}

// Parse BIDV email HTML content
function parseBIDVEmailContent(html: string): BIDVTransaction | null {
    try {
        const transactionType = extractField(html, [
            'Loại giao dịch',
            'Transaction type',
        ]) || 'Unknown'

        const transactionTimeStr = extractField(html, [
            'Thời gian giao dịch',
            'Transaction time',
        ])
        const transactionTime = transactionTimeStr
            ? parseVietnamDate(transactionTimeStr)
            : new Date()

        const referenceNumber = extractField(html, [
            'Số tham chiếu',
            'Reference number',
        ]) || `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const debitAccount = extractField(html, [
            'Tài khoản nguồn',
            'Debit account',
        ]) || ''

        const amountStr = extractField(html, [
            'Số tiền giao dịch',
            'Transaction amount',
        ])
        const amount = amountStr ? parseVietnamNumber(amountStr) : 0

        const feeStr = extractField(html, [
            'Phí giao dịch',
            'Transaction fee',
        ])
        const transactionFee = feeStr?.toLowerCase().includes('miễn phí')
            ? 0
            : parseVietnamNumber(feeStr || '0')

        const beneficiaryName = extractField(html, [
            'Tên người thụ hưởng',
            'Beneficiary name',
        ])

        const beneficiaryAccount = extractField(html, [
            'Số tài khoản/Số thẻ thụ hưởng',
            'Số tài khoản thụ hưởng', 
            'Beneficiary account',
            'Card number',
        ])

        const beneficiaryBank = extractField(html, [
            'Tên ngân hàng thụ hưởng',
            'Beneficiary bank',
        ])

        const remark = extractField(html, [
            'Nội dung giao dịch',
            'Transaction remark',
        ])

        const channel = extractField(html, [
            'Kênh thực hiện giao dịch',
            'Channel',
        ])

        if (!amount && !referenceNumber) {
            return null
        }

        return {
            transactionType,
            transactionTime,
            referenceNumber,
            debitAccount,
            amount,
            transactionFee,
            beneficiaryName,
            beneficiaryAccount,
            beneficiaryBank,
            remark,
            channel,
        }
    } catch (error) {
        console.error('Error parsing BIDV email content:', error)
        return null
    }
}

// Fetch emails using IMAP
function fetchEmailsWithIMAP(
    email: string,
    appPassword: string,
    maxEmails: number = 50
): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const imap = new Imap({
            user: email,
            password: appPassword,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
        })

        const emailBodies: string[] = []

        imap.once('ready', () => {
            imap.openBox('INBOX', true, (err) => {
                if (err) {
                    imap.end()
                    return reject(err)
                }

                // Search for BIDV emails
                imap.search([['FROM', 'bidv']], (searchErr, results) => {
                    if (searchErr) {
                        imap.end()
                        return reject(searchErr)
                    }

                    if (!results || results.length === 0) {
                        imap.end()
                        return resolve([])
                    }

                    // Get last N emails
                    const emailIds = results.slice(-maxEmails)

                    const fetch = imap.fetch(emailIds, { bodies: '' })

                    fetch.on('message', (msg) => {
                        msg.on('body', (stream) => {
                            let buffer = ''
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8')
                            })
                            stream.once('end', () => {
                                emailBodies.push(buffer)
                            })
                        })
                    })

                    fetch.once('error', (fetchErr) => {
                        imap.end()
                        reject(fetchErr)
                    })

                    fetch.once('end', () => {
                        imap.end()
                    })
                })
            })
        })

        imap.once('error', (err: Error) => {
            reject(err)
        })

        imap.once('end', () => {
            resolve(emailBodies)
        })

        imap.connect()
    })
}

// Sync BIDV emails from Gmail using IMAP
export async function syncGmailBIDVEmails(
    userId: string
): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = []
    let synced = 0

    const email = process.env.GMAIL_EMAIL
    const appPassword = process.env.GMAIL_APP_PASSWORD

    if (!email || !appPassword) {
        return {
            synced: 0,
            errors: ['Chưa cấu hình GMAIL_EMAIL và GMAIL_APP_PASSWORD trong .env.local']
        }
    }

    try {
        console.log('Fetching emails from Gmail via IMAP...')
        const emailBodies = await fetchEmailsWithIMAP(email, appPassword)

        console.log(`Found ${emailBodies.length} emails from BIDV`)

        if (emailBodies.length === 0) {
            return { synced: 0, errors: ['Không tìm thấy email từ BIDV'] }
        }

        // Process each email
        let emailIndex = 0
        let savedDebugHtml = false
        for (const rawEmail of emailBodies) {
            emailIndex++
            try {
                // Parse email
                const parsed = await simpleParser(rawEmail)
                const html = parsed.html || parsed.textAsHtml || ''
                const subject = parsed.subject || ''

                console.log(`[${emailIndex}/${emailBodies.length}] Processing email: "${subject}"`)

                if (!html) {
                    console.log(`  -> Skipped: No HTML content`)
                    continue
                }

                // Check if BIDV transaction email
                const hasBIDV = html.toLowerCase().includes('bidv')
                const hasTransaction = html.includes('giao dịch') || html.includes('transaction')

                if (!hasBIDV || !hasTransaction) {
                    console.log(`  -> Skipped: hasBIDV=${hasBIDV}, hasTransaction=${hasTransaction}`)
                    continue
                }

                // DEBUG: Save first transaction email HTML to file for analysis
                if (!savedDebugHtml && subject.includes('Biên lai')) {
                    const fs = require('fs')
                    const debugPath = '/tmp/bidv-email-debug.html'
                    fs.writeFileSync(debugPath, html)
                    console.log(`  -> DEBUG: Saved email HTML to ${debugPath}`)
                    savedDebugHtml = true
                }

                // Parse transaction
                const transaction = parseBIDVEmailContent(html)

                if (!transaction) {
                    console.log(`  -> Skipped: parseBIDVEmailContent returned null`)
                    // Debug: show first 500 chars of HTML
                    console.log(`  -> HTML preview: ${html.substring(0, 500)}...`)
                    continue
                }

                if (!transaction.amount) {
                    console.log(`  -> Skipped: No amount extracted. Ref: ${transaction.referenceNumber}`)
                    console.log(`  -> HTML preview: ${html.substring(0, 500)}...`)

                    // DEBUG: Try to find what fields ARE available
                    console.log(`  -> DEBUG: Looking for field patterns in HTML...`)
                    const amountMatch = html.match(/(?:số\s*tiền|amount|tiền\s*giao\s*dịch)[:\s]*([0-9.,\s]+\s*VND)/i)
                    console.log(`  -> DEBUG: Amount pattern search: ${amountMatch ? amountMatch[0] : 'NOT FOUND'}`)
                    continue
                }

                console.log(`  -> Parsed: Amount=${transaction.amount}, Ref=${transaction.referenceNumber}`)

                // Try ML categorization first (learned from user labels)
                const mlResult = await categorizeWithML(userId, {
                    beneficiaryName: transaction.beneficiaryName,
                    beneficiaryAccount: transaction.beneficiaryAccount,
                    remark: transaction.remark,
                    amount: transaction.amount
                })

                let category: string
                if (mlResult.isMLPrediction && mlResult.confidence > 0.5) {
                    category = mlResult.category
                    console.log(`  -> ML Category: ${category} (confidence: ${(mlResult.confidence * 100).toFixed(1)}%)`)
                } else {
                    // Fallback to rule-based + AI categorization
                    category = await categorizeTransaction(
                        transaction.beneficiaryName,
                        transaction.remark,
                        transaction.amount
                    )
                    console.log(`  -> Rule/AI Category: ${category}`)
                }

                // Save to database using upsert to handle duplicates gracefully
                const result = await prisma.transaction.upsert({
                    where: { referenceNumber: transaction.referenceNumber },
                    update: {}, // Don't update existing records
                    create: {
                        userId,
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

                // Only count as synced if this was a new record
                if (result.createdAt.getTime() > Date.now() - 5000) {
                    synced++
                }
            } catch (err) {
                console.error('Error processing email:', err)
                errors.push(`Lỗi xử lý email: ${err instanceof Error ? err.message : 'Unknown'}`)
            }
        }

        return { synced, errors }
    } catch (error) {
        console.error('IMAP sync error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown'

        if (errorMessage.includes('Invalid credentials')) {
            return {
                synced: 0,
                errors: ['Sai email hoặc App Password. Hãy kiểm tra lại trong .env.local']
            }
        }

        return {
            synced: 0,
            errors: [`Lỗi kết nối Gmail: ${errorMessage}`]
        }
    }
}
