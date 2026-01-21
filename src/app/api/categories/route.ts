import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Default categories to create for new users
const DEFAULT_CATEGORIES = [
    { name: 'Ăn uống', icon: '🍜', color: '#f59e0b' },
    { name: 'Di chuyển', icon: '🚗', color: '#3b82f6' },
    { name: 'Mua sắm', icon: '🛒', color: '#ec4899' },
    { name: 'Hóa đơn & Tiện ích', icon: '💡', color: '#8b5cf6' },
    { name: 'Giải trí', icon: '🎮', color: '#10b981' },
    { name: 'Sức khỏe', icon: '💊', color: '#ef4444' },
    { name: 'Giáo dục', icon: '📚', color: '#6366f1' },
    { name: 'Chuyển tiền', icon: '💸', color: '#14b8a6' },
    { name: 'Thu nhập', icon: '💰', color: '#22c55e' },
    { name: 'Khác', icon: '📦', color: '#6b7280' },
]

// GET - Fetch all categories for user
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's categories
        let categories = await prisma.category.findMany({
            where: { userId: session.user.id },
            orderBy: [
                { isDefault: 'desc' },
                { name: 'asc' }
            ],
            include: {
                _count: {
                    select: { patterns: true }
                }
            }
        })

        // If no categories, create defaults
        if (categories.length === 0) {
            await prisma.category.createMany({
                data: DEFAULT_CATEGORIES.map(cat => ({
                    userId: session.user.id!,
                    name: cat.name,
                    icon: cat.icon,
                    color: cat.color,
                    isDefault: true,
                }))
            })
            
            categories = await prisma.category.findMany({
                where: { userId: session.user.id },
                orderBy: [
                    { isDefault: 'desc' },
                    { name: 'asc' }
                ],
                include: {
                    _count: {
                        select: { patterns: true }
                    }
                }
            })
        }

        return NextResponse.json({ categories })
    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST - Create new category
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, icon, color } = await request.json()

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
        }

        // Check if category already exists
        const existing = await prisma.category.findUnique({
            where: {
                userId_name: {
                    userId: session.user.id,
                    name: name.trim()
                }
            }
        })

        if (existing) {
            return NextResponse.json({ error: 'Category already exists' }, { status: 400 })
        }

        const category = await prisma.category.create({
            data: {
                userId: session.user.id,
                name: name.trim(),
                icon: icon || '📁',
                color: color || '#6b7280',
                isDefault: false,
            }
        })

        return NextResponse.json({ category })
    } catch (error) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT - Update category
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, name, icon, color } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
        }

        // Verify ownership
        const existing = await prisma.category.findFirst({
            where: { id, userId: session.user.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }

        const category = await prisma.category.update({
            where: { id },
            data: {
                name: name?.trim() || existing.name,
                icon: icon || existing.icon,
                color: color || existing.color,
            }
        })

        // If name changed, update all transactions with old category name
        if (name && name.trim() !== existing.name) {
            await prisma.transaction.updateMany({
                where: {
                    userId: session.user.id,
                    category: existing.name
                },
                data: {
                    category: name.trim()
                }
            })
        }

        return NextResponse.json({ category })
    } catch (error) {
        console.error('Error updating category:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE - Delete category
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
        }

        // Verify ownership
        const existing = await prisma.category.findFirst({
            where: { id, userId: session.user.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }

        // Don't allow deleting default categories
        if (existing.isDefault) {
            return NextResponse.json({ error: 'Cannot delete default categories' }, { status: 400 })
        }

        // Set transactions with this category to "Khác"
        await prisma.transaction.updateMany({
            where: {
                userId: session.user.id,
                category: existing.name
            },
            data: {
                category: 'Khác'
            }
        })

        await prisma.category.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting category:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
