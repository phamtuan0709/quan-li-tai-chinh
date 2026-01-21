import { simpleParser, ParsedMail } from 'mailparser'

export interface BIDVTransaction {
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

// Parse Vietnamese number format (1.000.000 or 1,000,000 or 5,000)
function parseVietnamNumber(str: string): number {
    if (!str) return 0
    // Remove "VND" and whitespace
    let cleaned = str.replace(/VND/gi, '').trim()
    // Handle dots as thousand separators (Vietnamese format)
    if (cleaned.includes('.') && !cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '')
    } else if (cleaned.includes(',') && cleaned.includes('.')) {
        // Format: 1,000.50 (international)
        cleaned = cleaned.replace(/,/g, '')
    } else {
        // Format: 1,000 (could be thousand separator)
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
        // Try to find table cell pattern: <td>Field name</td><td>Value</td>
        const patterns = [
            // Pattern for BIDV format: <td>Field:<br><span>...</span></td><td>Value<br><span>...</span></td>
            new RegExp(`<td[^>]*>[\\s\\S]*?${fieldName}[:\\s]*[\\s\\S]*?<\\/td>\\s*<td[^>]*>([^<]+)`, 'i'),
            // Pattern 1: Two cells in a row
            new RegExp(`<td[^>]*>[^<]*${fieldName}[^<]*<\\/td>\\s*<td[^>]*>([^<]+)<\\/td>`, 'i'),
            // Pattern 2: Colon separated in same content
            new RegExp(`${fieldName}[:\\s]*([^<\\n]+)`, 'i'),
            // Pattern 3: Bold value after field
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

export async function parseBIDVEmail(emlContent: string | Buffer): Promise<BIDVTransaction | null> {
    try {
        const parsed: ParsedMail = await simpleParser(emlContent)

        // Check if this is a BIDV transaction email
        const subject = parsed.subject || ''
        const from = parsed.from?.text || ''

        if (!from.toLowerCase().includes('bidv') && !subject.toLowerCase().includes('bidv')) {
            console.log('Not a BIDV email')
            return null
        }

        const html = parsed.html || parsed.textAsHtml || ''
        const text = parsed.text || ''

        // Extract transaction details
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
            : parsed.date || new Date()

        const referenceNumber = extractField(html, [
            'Số tham chiếu',
            'Reference number',
        ]) || `REF-${Date.now()}`

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
        console.error('Error parsing BIDV email:', error)
        return null
    }
}

// Parse multiple .eml files
export async function parseBIDVEmails(emlContents: (string | Buffer)[]): Promise<BIDVTransaction[]> {
    const results: BIDVTransaction[] = []

    for (const content of emlContents) {
        const transaction = await parseBIDVEmail(content)
        if (transaction) {
            results.push(transaction)
        }
    }

    return results
}
