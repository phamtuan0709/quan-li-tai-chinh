'use client'

import { signIn } from 'next-auth/react'
import { Wallet } from 'lucide-react'

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-pink-900/20" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

            {/* Login card */}
            <div className="relative z-10 w-full max-w-md p-8 mx-4">
                <div className="glass rounded-2xl p-8 animate-fade-in">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                            <Wallet className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold gradient-text">Quản Lý Chi Tiêu</h1>
                        <p className="text-gray-400 mt-2 text-center">
                            Ứng dụng quản lý chi tiêu cá nhân với AI thông minh
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-4 mb-8">
                        {[
                            'Tự động parse email giao dịch BIDV',
                            'AI phân loại chi tiêu thông minh',
                            'Biểu đồ phân tích chi tiết',
                            'Chat với AI về chi tiêu của bạn',
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span className="text-sm text-gray-300">{feature}</span>
                            </div>
                        ))}
                    </div>

                    {/* Login button */}
                    <button
                        onClick={() => signIn('google', { callbackUrl: '/' })}
                        className="w-full btn btn-primary text-lg py-4"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Đăng nhập với Google
                    </button>

                    {/* Warning */}
                    <p className="text-xs text-center text-gray-500 mt-6">
                        Chỉ email được phép mới có thể đăng nhập
                    </p>
                </div>
            </div>
        </div>
    )
}
