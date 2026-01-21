'use client'

import { Bell, Search } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
    title: string
    subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
    const [searchOpen, setSearchOpen] = useState(false)

    return (
        <header className="sticky top-0 z-40 glass px-8 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{title}</h1>
                    {subtitle && (
                        <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className={`relative transition-all duration-300 ${searchOpen ? 'w-64' : 'w-10'}`}>
                        <button
                            onClick={() => setSearchOpen(!searchOpen)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className={`input pl-10 ${searchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        />
                    </div>

                    {/* Notifications */}
                    <button className="relative p-2 rounded-lg hover:bg-[#1a1a25] transition-colors">
                        <Bell className="w-5 h-5 text-gray-400" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
                    </button>
                </div>
            </div>
        </header>
    )
}
