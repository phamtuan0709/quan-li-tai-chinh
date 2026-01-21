import OpenAI from 'openai'

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: 'https://api.groq.com/openai/v1'
})

// Categories for expense classification
export const EXPENSE_CATEGORIES = [
    'Ăn uống',
    'Di chuyển',
    'Mua sắm',
    'Hóa đơn & Tiện ích',
    'Giải trí',
    'Sức khỏe',
    'Giáo dục',
    'Chuyển tiền',
    'Thu nhập',
    'Khác',
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

// Fallback categorization using keywords (no AI needed)
function categorizeByKeywords(beneficiaryName: string | null, remark: string | null): string {
    const text = `${beneficiaryName || ''} ${remark || ''}`.toLowerCase()
    
    // Ăn uống
    if (/grab\s*food|shopee\s*food|now|baemin|gojek|circle\s*k|ministop|family\s*mart|7-?eleven|highland|starbucks|phuc\s*long|the\s*coffee|trà\s*sữa|cà\s*phê|coffee|nhà\s*hàng|quán\s*ăn|com|bun|pho|banh|mi|pizza|burger|kfc|lotteria|jollibee|mcdon/i.test(text)) {
        return 'Ăn uống'
    }
    
    // Di chuyển
    if (/grab|be\s|gojek|taxi|uber|xăng|petrolimex|pvoil|shell|esso|caltex|vé\s*xe|vexere|vietjet|vietnam\s*airlines|bamboo|pacific/i.test(text)) {
        return 'Di chuyển'
    }
    
    // Mua sắm
    if (/shopee|lazada|tiki|sendo|amazon|thegioididong|dienmay|fpt\s*shop|cellphone|nguyen\s*kim|big\s*c|aeon|lotte|vinmart|coopmart|bach\s*hoa|winmart/i.test(text)) {
        return 'Mua sắm'
    }
    
    // Hóa đơn & Tiện ích
    if (/điện|dien|evn|nước|nuoc|internet|viettel|vinaphone|mobifone|fpt|vnpt|sctv|vtv|truyền\s*hình|netflix|spotify|youtube|icloud|apple|google\s*one/i.test(text)) {
        return 'Hóa đơn & Tiện ích'
    }
    
    // Giải trí
    if (/cgv|lotte\s*cinema|galaxy|bhd|beta|game|steam|playstation|xbox|netflix|spotify|youtube|tiktok|karaoke|massage|spa/i.test(text)) {
        return 'Giải trí'
    }
    
    // Sức khỏe
    if (/bệnh\s*viện|phòng\s*khám|nha\s*khoa|thuốc|pharmacy|pharmacity|long\s*chau|an\s*khang|medicare|bảo\s*hiểm|gym|fitness|yoga/i.test(text)) {
        return 'Sức khỏe'
    }
    
    // Giáo dục
    if (/học\s*phí|trường|school|university|đại\s*học|cao\s*đẳng|khóa\s*học|course|udemy|coursera|english|ielts|toeic|sách|book/i.test(text)) {
        return 'Giáo dục'
    }
    
    // Thu nhập (nhận tiền)
    if (/lương|salary|thưởng|bonus|hoàn\s*tiền|cashback|nhận\s*tiền|receive/i.test(text)) {
        return 'Thu nhập'
    }
    
    // Default: Chuyển tiền
    if (/chuyển\s*tiền|transfer|chuyen\s*tien/i.test(text)) {
        return 'Chuyển tiền'
    }
    
    return 'Khác'
}

// Categorize a transaction using AI with fallback
export async function categorizeTransaction(
    beneficiaryName: string | null,
    remark: string | null,
    amount: number
): Promise<string> {
    // First, try keyword-based categorization (fast & free)
    const keywordCategory = categorizeByKeywords(beneficiaryName, remark)
    
    // If we got a specific category (not 'Khác'), use it without calling AI
    if (keywordCategory !== 'Khác') {
        return keywordCategory
    }
    
    // Only call AI for uncategorized transactions
    const prompt = `Bạn là chuyên gia phân loại chi tiêu cá nhân. Hãy phân loại giao dịch sau vào MỘT trong các danh mục:
${EXPENSE_CATEGORIES.map(c => `- ${c}`).join('\n')}

Thông tin giao dịch:
- Người nhận: ${beneficiaryName || 'Không rõ'}
- Nội dung: ${remark || 'Không có'}
- Số tiền: ${amount.toLocaleString('vi-VN')} VND

CHỈ TRẢ LỜI TÊN DANH MỤC, KHÔNG GIẢI THÍCH.`

    try {
        const response = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
        })

        const result = response.choices[0]?.message?.content?.trim() || ''

        // Validate the response is a valid category
        const category = EXPENSE_CATEGORIES.find(c =>
            result.toLowerCase().includes(c.toLowerCase())
        )

        return category || 'Chuyển tiền' // Default to 'Chuyển tiền' for bank transfers
    } catch (error: unknown) {
        console.error('Error categorizing transaction:', error)
        return 'Chuyển tiền'
    }
}

// Generate savings advice based on spending data
export async function generateSavingsAdvice(
    monthlyData: { category: string; total: number }[],
    totalSpending: number
): Promise<string> {
    const dataStr = monthlyData
        .map(d => `- ${d.category}: ${d.total.toLocaleString('vi-VN')} VND`)
        .join('\n')

    const prompt = `Bạn là chuyên gia tài chính cá nhân. Dựa trên dữ liệu chi tiêu tháng này, hãy đưa ra 3-5 lời khuyên tiết kiệm CỤ THỂ và THỰC TẾ.

Tổng chi tiêu: ${totalSpending.toLocaleString('vi-VN')} VND

Chi tiết theo danh mục:
${dataStr}

Hãy trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu. Sử dụng markdown với bullet points.`

    try {
        const response = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        })
        
        return response.choices[0]?.message?.content || 'Không thể tạo lời khuyên lúc này.'
    } catch (error) {
        console.error('Error generating savings advice:', error)
        return 'Không thể tạo lời khuyên lúc này. Vui lòng thử lại sau.'
    }
}

// Predict next month's spending
export async function predictNextMonth(
    historicalData: { month: string; total: number; byCategory: Record<string, number> }[]
): Promise<{ total: number; byCategory: Record<string, number>; explanation: string }> {
    const dataStr = historicalData
        .map(d => `${d.month}: ${d.total.toLocaleString('vi-VN')} VND (${Object.entries(d.byCategory).map(([k, v]) => `${k}: ${v.toLocaleString('vi-VN')}`).join(', ')})`)
        .join('\n')

    const prompt = `Bạn là chuyên gia phân tích tài chính. Dựa trên lịch sử chi tiêu sau, hãy DỰ ĐOÁN chi tiêu tháng tới.

Lịch sử chi tiêu:
${dataStr}

Trả lời dưới dạng JSON với format:
{
  "total": <số tiền dự đoán>,
  "byCategory": { "<tên danh mục>": <số tiền> },
  "explanation": "<giải thích ngắn gọn bằng tiếng Việt>"
}

CHỈ TRẢ LỜI JSON, KHÔNG CÓ MARKDOWN CODE BLOCK.`

    try {
        const response = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5
        })
        
        const text = response.choices[0]?.message?.content || '{}'
        return JSON.parse(text)
    } catch (error) {
        console.error('Error predicting next month:', error)
        const avgTotal = historicalData.reduce((sum, d) => sum + d.total, 0) / historicalData.length
        return {
            total: Math.round(avgTotal),
            byCategory: {},
            explanation: 'Dự đoán dựa trên trung bình các tháng trước.',
        }
    }
}

// Chat with AI about expenses
export async function chatWithAI(
    message: string,
    context: {
        totalSpending: number
        monthlyBreakdown: { category: string; total: number }[]
        recentTransactions: { amount: number; category: string; remark: string; date: string }[]
    },
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
    const contextStr = `
THÔNG TIN CHI TIÊU CỦA NGƯỜI DÙNG:
- Tổng chi tiêu tháng này: ${context.totalSpending.toLocaleString('vi-VN')} VND
- Phân loại: ${context.monthlyBreakdown.map(c => `${c.category}: ${c.total.toLocaleString('vi-VN')} VND`).join(', ')}
- 5 giao dịch gần nhất: ${context.recentTransactions.slice(0, 5).map(t => `${t.date}: ${t.amount.toLocaleString('vi-VN')} VND (${t.category}) - ${t.remark}`).join('; ')}
`

    const systemPrompt = `Bạn là trợ lý tài chính cá nhân thông minh. Nhiệm vụ của bạn là giúp người dùng hiểu và quản lý chi tiêu của họ.

${contextStr}

Hãy trả lời các câu hỏi về chi tiêu một cách ngắn gọn, hữu ích và thân thiện. Sử dụng tiếng Việt.`

    try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: message }
        ]

        const response = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
        })

        return response.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.'
    } catch (error) {
        console.error('Error chatting with AI:', error)
        return 'Xin lỗi, tôi không thể trả lời lúc này. Vui lòng thử lại sau.'
    }
}
