'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
    LayoutDashboard,
    Upload,
    List,
    BarChart3,
    MessageSquare,
    LogOut,
    Wallet,
    ChevronLeft,
    ChevronRight,
    Tags,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/upload', label: 'Upload Email', icon: Upload },
    { href: '/transactions', label: 'Giao Dịch', icon: List },
    { href: '/categories', label: 'Danh Mục', icon: Tags },
    { href: '/analytics', label: 'Phân Tích', icon: BarChart3 },
    { href: '/chat', label: 'AI Chat', icon: MessageSquare },
]

export function Sidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-[#12121a] border-r border-[#2a2a3a] transition-all duration-300 z-50 ${collapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 p-6 border-b border-[#2a2a3a]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                    <div className="animate-fade-in">
                        <h1 className="font-bold text-lg gradient-text">Chi Tiêu</h1>
                        <p className="text-xs text-gray-500">Personal Tracker</p>
                    </div>
                )}
            </div>

            {/* Toggle button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#2a2a3a] border border-[#3a3a4a] flex items-center justify-center hover:bg-[#3a3a4a] transition-colors"
            >
                {collapsed ? (
                    <ChevronRight className="w-4 h-4" />
                ) : (
                    <ChevronLeft className="w-4 h-4" />
                )}
            </button>

            {/* Navigation */}
            <nav className="p-4 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30'
                                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a25]'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'group-hover:text-indigo-400'}`} />
                            {!collapsed && (
                                <span className="font-medium animate-fade-in">{item.label}</span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#2a2a3a]">
                {session?.user && (
                    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                        {session.user.image && (
                            <img
                                src={session.user.image}
                                alt={session.user.name || 'User'}
                                className="w-10 h-10 rounded-full border-2 border-indigo-500"
                            />
                        )}
                        {!collapsed && (
                            <div className="flex-1 min-w-0 animate-fade-in">
                                <p className="font-medium text-sm truncate">{session.user.name}</p>
                                <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                            </div>
                        )}
                    </div>
                )}
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className={`mt-4 w-full flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ${collapsed ? 'justify-center' : ''
                        }`}
                >
                    <LogOut className="w-4 h-4" />
                    {!collapsed && <span className="text-sm">Đăng xuất</span>}
                </button>
            </div>
        </aside>
    )
}
