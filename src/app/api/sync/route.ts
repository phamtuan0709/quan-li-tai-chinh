import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncGmailBIDVEmails } from '@/lib/gmail'

export async function POST() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if IMAP credentials are configured
        if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
            return NextResponse.json({
                error: 'Chưa cấu hình GMAIL_EMAIL và GMAIL_APP_PASSWORD trong .env.local',
                needConfig: true
            }, { status: 400 })
        }

        const result = await syncGmailBIDVEmails(session.user.id)

        return NextResponse.json({
            success: true,
            synced: result.synced,
            errors: result.errors,
            message: result.synced > 0
                ? `Đã đồng bộ ${result.synced} giao dịch mới từ Gmail`
                : result.errors.length > 0
                    ? result.errors[0]
                    : 'Không có giao dịch mới',
        })
    } catch (error) {
        console.error('Sync error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
