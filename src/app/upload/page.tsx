'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Upload, FileText, Check, X, Loader2, AlertCircle, Mail, RefreshCw } from 'lucide-react'

interface UploadResult {
    success: boolean
    imported: number
    transactions: {
        id: string
        transactionTime: string
        amount: number
        beneficiaryName: string | null
        remark: string | null
        category: string | null
        fileName?: string
    }[]
    errors: string[]
}

interface SyncResult {
    success: boolean
    synced: number
    message: string
    errors: string[]
    needReauth?: boolean
}

const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value)
}

export default function UploadPage() {
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [result, setResult] = useState<UploadResult | null>(null)
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Auto sync function
    const performAutoSync = useCallback(async () => {
        if (syncing) return // Prevent concurrent syncs
        
        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
            })
            
            // Handle 401 silently - user not logged in
            if (response.status === 401) {
                setAutoSyncEnabled(false) // Disable auto-sync if not logged in
                return
            }
            
            const data: SyncResult = await response.json()
            
            if (data.success && data.synced > 0) {
                setSyncResult(data)
            }
            setLastSyncTime(new Date())
        } catch (error) {
            console.error('Auto sync error:', error)
        }
    }, [syncing])

    // Setup auto-sync every hour
    useEffect(() => {
        if (autoSyncEnabled) {
            // Initial sync on page load
            performAutoSync()
            
            // Set up interval for every 5 minutes (300000 ms)
            syncIntervalRef.current = setInterval(() => {
                performAutoSync()
            }, 300000) // 5 phút
        }

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current)
            }
        }
    }, [autoSyncEnabled, performAutoSync])

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.name.endsWith('.eml')
        )
        setFiles(prev => [...prev, ...droppedFiles])
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(
                file => file.name.endsWith('.eml')
            )
            setFiles(prev => [...prev, ...selectedFiles])
        }
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    // Gmail Sync
    const handleGmailSync = async () => {
        setSyncing(true)
        setSyncResult(null)
        setResult(null)

        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
            })

            if (response.status === 401) {
                setSyncResult({
                    success: false,
                    synced: 0,
                    message: 'Vui lòng đăng nhập để đồng bộ email',
                    errors: ['Unauthorized'],
                    needReauth: true,
                })
                return
            }

            const data: SyncResult = await response.json()
            setSyncResult(data)

            if (data.needReauth) {
                // Redirect to re-authenticate
                window.location.href = '/api/auth/signin'
            }
        } catch (error) {
            console.error('Sync error:', error)
            setSyncResult({
                success: false,
                synced: 0,
                message: 'Đã xảy ra lỗi khi đồng bộ. Vui lòng thử lại.',
                errors: ['Lỗi kết nối'],
            })
        } finally {
            setSyncing(false)
        }
    }

    // Manual upload
    const handleUpload = async () => {
        if (files.length === 0) return

        setUploading(true)
        setResult(null)
        setSyncResult(null)

        try {
            const formData = new FormData()
            files.forEach(file => formData.append('files', file))

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()
            setResult(data)

            if (data.success) {
                setFiles([])
            }
        } catch (error) {
            console.error('Upload error:', error)
            setResult({
                success: false,
                imported: 0,
                transactions: [],
                errors: ['Đã xảy ra lỗi khi upload. Vui lòng thử lại.'],
            })
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="ml-64 min-h-screen">
                <Header
                    title="Đồng Bộ Email"
                    subtitle="Tự động lấy email giao dịch từ Gmail hoặc upload thủ công"
                />

                <div className="p-8 max-w-3xl mx-auto">
                    {/* Gmail Sync - Primary option */}
                    <div className="card p-6 mb-6 animate-fade-in">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                                <Mail className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Đồng bộ từ Gmail</h3>
                                <p className="text-sm text-gray-400">Tự động lấy email BIDV từ hộp thư của bạn</p>
                            </div>
                        </div>

                        <button
                            onClick={handleGmailSync}
                            disabled={syncing}
                            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {syncing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang đồng bộ...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Đồng bộ Email BIDV từ Gmail
                                </>
                            )}
                        </button>

                        <p className="text-xs text-gray-500 mt-3 text-center">
                            Ứng dụng sẽ tìm email từ BIDV và tự động trích xuất giao dịch
                        </p>

                        {/* Auto-sync status */}
                        <div className="mt-4 flex items-center justify-between text-xs text-gray-400 border-t border-gray-800 pt-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                                <span>Tự động đồng bộ mỗi 5 phút: {autoSyncEnabled ? 'Bật' : 'Tắt'}</span>
                            </div>
                            <button
                                onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                                className="text-purple-400 hover:text-purple-300 transition-colors"
                            >
                                {autoSyncEnabled ? 'Tắt' : 'Bật'}
                            </button>
                        </div>
                        {lastSyncTime && (
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                Đồng bộ lần cuối: {lastSyncTime.toLocaleString('vi-VN')}
                            </p>
                        )}
                    </div>

                    {/* Sync Result */}
                    {syncResult && (
                        <div className="mb-6 animate-fade-in">
                            <div className={`p-4 rounded-xl ${syncResult.success && syncResult.synced > 0
                                    ? 'bg-green-500/10 border border-green-500/30'
                                    : syncResult.errors.length > 0
                                        ? 'bg-yellow-500/10 border border-yellow-500/30'
                                        : 'bg-blue-500/10 border border-blue-500/30'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {syncResult.success && syncResult.synced > 0 ? (
                                        <Check className="w-5 h-5 text-green-400" />
                                    ) : syncResult.errors.length > 0 ? (
                                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                                    ) : (
                                        <Mail className="w-5 h-5 text-blue-400" />
                                    )}
                                    <span>{syncResult.message}</span>
                                </div>
                                {syncResult.errors.length > 0 && (
                                    <ul className="mt-3 space-y-1 text-sm text-gray-400">
                                        {syncResult.errors.map((error, i) => (
                                            <li key={i}>• {error}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#2a2a3a]" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-[#0a0a0f] text-gray-500">hoặc upload thủ công</span>
                        </div>
                    </div>

                    {/* Dropzone - Secondary option */}
                    <div
                        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${dragActive
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : 'border-[#2a2a3a] hover:border-[#3a3a4a]'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            multiple
                            accept=".eml"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                <Upload className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h3 className="text-base font-semibold mb-1">
                                Kéo thả file .eml vào đây
                            </h3>
                            <p className="text-gray-400 text-sm">
                                hoặc click để chọn file từ máy tính
                            </p>
                        </div>
                    </div>

                    {/* File list */}
                    {files.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <h4 className="font-medium text-gray-300">
                                {files.length} file đã chọn
                            </h4>
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-4 rounded-xl bg-[#12121a] border border-[#2a2a3a]"
                                >
                                    <FileText className="w-5 h-5 text-indigo-400" />
                                    <span className="flex-1 truncate">{file.name}</span>
                                    <span className="text-sm text-gray-500">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="w-full btn btn-secondary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Upload {files.length} file
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Upload Results */}
                    {result && (
                        <div className="mt-6 animate-fade-in">
                            <div className={`p-4 rounded-xl mb-4 ${result.success && result.imported > 0
                                    ? 'bg-green-500/10 border border-green-500/30'
                                    : result.errors.length > 0
                                        ? 'bg-yellow-500/10 border border-yellow-500/30'
                                        : 'bg-red-500/10 border border-red-500/30'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {result.success && result.imported > 0 ? (
                                        <Check className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                                    )}
                                    <span>
                                        Đã import {result.imported} giao dịch
                                        {result.errors.length > 0 && `, ${result.errors.length} lỗi`}
                                    </span>
                                </div>
                            </div>

                            {result.transactions.length > 0 && (
                                <div className="space-y-3">
                                    {result.transactions.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="p-4 rounded-xl bg-[#12121a] border border-[#2a2a3a]"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-indigo-400 font-medium">
                                                    {formatVND(tx.amount)}
                                                </span>
                                                <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300">
                                                    {tx.category || 'Chưa phân loại'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-300">
                                                {tx.beneficiaryName || 'Không rõ người nhận'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {tx.remark || 'Không có nội dung'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

