import { prisma } from './prisma'

interface TransactionData {
    beneficiaryName: string | null
    beneficiaryAccount: string | null
    remark: string | null
    amount: number
}

interface CategoryScore {
    categoryName: string
    score: number
    matchedPatterns: string[]
}

/**
 * ML-based categorizer that learns from user-labeled transactions
 * Uses pattern matching with weighted scoring
 */
export async function categorizeWithML(
    userId: string,
    transaction: TransactionData
): Promise<{ category: string; confidence: number; isMLPrediction: boolean }> {
    try {
        // Get all categories with their patterns for this user
        const categories = await prisma.category.findMany({
            where: { userId },
            include: {
                patterns: {
                    orderBy: { weight: 'desc' }
                }
            }
        })

        if (categories.length === 0) {
            return { category: 'Khác', confidence: 0, isMLPrediction: false }
        }

        // Extract keywords from the transaction
        const transactionKeywords = extractTransactionKeywords(transaction)
        
        // Calculate score for each category
        const scores: CategoryScore[] = []

        for (const category of categories) {
            if (category.patterns.length === 0) continue

            let totalScore = 0
            const matchedPatterns: string[] = []

            for (const pattern of category.patterns) {
                const matchScore = calculateMatchScore(transactionKeywords, pattern.keyword, pattern.weight)
                if (matchScore > 0) {
                    totalScore += matchScore
                    matchedPatterns.push(pattern.keyword)
                }
            }

            if (totalScore > 0) {
                scores.push({
                    categoryName: category.name,
                    score: totalScore,
                    matchedPatterns
                })
            }
        }

        // Sort by score and get the best match
        scores.sort((a, b) => b.score - a.score)

        if (scores.length > 0 && scores[0].score > 0.5) {
            // Calculate confidence as relative score
            const totalScores = scores.reduce((sum, s) => sum + s.score, 0)
            const confidence = Math.min(scores[0].score / Math.max(totalScores, 1), 1)

            return {
                category: scores[0].categoryName,
                confidence,
                isMLPrediction: true
            }
        }

        // No good match found
        return { category: 'Khác', confidence: 0, isMLPrediction: false }
    } catch (error) {
        console.error('ML categorization error:', error)
        return { category: 'Khác', confidence: 0, isMLPrediction: false }
    }
}

/**
 * Extract keywords from transaction for matching
 */
function extractTransactionKeywords(transaction: TransactionData): string[] {
    const keywords: string[] = []
    
    if (transaction.beneficiaryName) {
        const name = transaction.beneficiaryName.toLowerCase().trim()
        keywords.push(name)
        keywords.push(...name.split(/\s+/).filter(w => w.length > 2))
    }
    
    if (transaction.remark) {
        const remark = transaction.remark.toLowerCase().trim()
        keywords.push(remark)
        keywords.push(...remark.split(/\s+/).filter(w => w.length > 2))
    }
    
    if (transaction.beneficiaryAccount) {
        keywords.push(transaction.beneficiaryAccount)
    }
    
    // Add amount range
    keywords.push(getAmountRange(transaction.amount))
    
    return [...new Set(keywords)]
}

/**
 * Calculate match score between transaction keywords and a pattern
 */
function calculateMatchScore(transactionKeywords: string[], patternKeyword: string, weight: number): number {
    const normalizedPattern = patternKeyword.toLowerCase()
    
    for (const keyword of transactionKeywords) {
        // Exact match
        if (keyword === normalizedPattern) {
            return weight * 1.0
        }
        
        // Contains match (partial)
        if (keyword.includes(normalizedPattern) || normalizedPattern.includes(keyword)) {
            return weight * 0.7
        }
        
        // Fuzzy match using Levenshtein-like similarity
        const similarity = calculateSimilarity(keyword, normalizedPattern)
        if (similarity > 0.8) {
            return weight * similarity * 0.5
        }
    }
    
    return 0
}

/**
 * Simple string similarity calculation (Jaccard-like)
 */
function calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1
    if (str1.length < 3 || str2.length < 3) return 0
    
    // Create character n-grams (bigrams)
    const getBigrams = (str: string): Set<string> => {
        const bigrams = new Set<string>()
        for (let i = 0; i < str.length - 1; i++) {
            bigrams.add(str.substring(i, i + 2))
        }
        return bigrams
    }
    
    const bigrams1 = getBigrams(str1)
    const bigrams2 = getBigrams(str2)
    
    // Calculate intersection
    let intersection = 0
    for (const bigram of bigrams1) {
        if (bigrams2.has(bigram)) {
            intersection++
        }
    }
    
    // Jaccard similarity
    const union = bigrams1.size + bigrams2.size - intersection
    return union > 0 ? intersection / union : 0
}

function getAmountRange(amount: number): string {
    if (amount < 10000) return 'amount_under_10k'
    if (amount < 50000) return 'amount_10k_50k'
    if (amount < 100000) return 'amount_50k_100k'
    if (amount < 500000) return 'amount_100k_500k'
    if (amount < 1000000) return 'amount_500k_1m'
    return 'amount_over_1m'
}

/**
 * Get category suggestions for a transaction
 * Returns top 3 most likely categories
 */
export async function getCategorySuggestions(
    userId: string,
    transaction: TransactionData
): Promise<CategoryScore[]> {
    try {
        const categories = await prisma.category.findMany({
            where: { userId },
            include: {
                patterns: {
                    orderBy: { weight: 'desc' }
                }
            }
        })

        const transactionKeywords = extractTransactionKeywords(transaction)
        const scores: CategoryScore[] = []

        for (const category of categories) {
            let totalScore = 0
            const matchedPatterns: string[] = []

            for (const pattern of category.patterns) {
                const matchScore = calculateMatchScore(transactionKeywords, pattern.keyword, pattern.weight)
                if (matchScore > 0) {
                    totalScore += matchScore
                    matchedPatterns.push(pattern.keyword)
                }
            }

            scores.push({
                categoryName: category.name,
                score: totalScore,
                matchedPatterns
            })
        }

        // Sort by score and return top 3
        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
    } catch (error) {
        console.error('Error getting suggestions:', error)
        return []
    }
}
