
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Get Property IDs owned by user
  const { data: properties } = await supabase
    .from('property_rentals')
    .select('id')
    .eq('owner_id', user.id)

  const propertyIds = properties?.map(p => p.id) || []

  if (propertyIds.length === 0) {
    return NextResponse.json({
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        monthlyData: [],
        categoryData: []
    })
  }

  // 2. Query Rental Ledger
  let query = supabase
    .from('rental_ledger')
    .select('*')
    .in('property_id', propertyIds)
  
  if (startDate) query = query.gte('transaction_date', startDate)
  if (endDate) query = query.lte('transaction_date', endDate)

  const { data: transactions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 3. Calculate Stats
  let totalIncome = 0
  let totalExpense = 0
  const monthlyStats: Record<string, { income: number, expense: number }> = {}
  const categoryStats: Record<string, number> = {}

  transactions.forEach(t => {
    const amount = Number(t.amount)
    const date = new Date(t.transaction_date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { income: 0, expense: 0 }

    if (t.transaction_type === 'rent_income' || t.transaction_type === 'deposit') { // Assuming deposit is income for cash flow, though technically liability. For simplicity treating as + flow.
      totalIncome += amount
      monthlyStats[monthKey].income += amount
    } else {
      totalExpense += amount
      monthlyStats[monthKey].expense += amount
    }

    // Category stats (Expense breakdown)
    if (t.transaction_type !== 'rent_income' && t.transaction_type !== 'deposit') {
        const cat = t.transaction_type
        categoryStats[cat] = (categoryStats[cat] || 0) + amount
    }
  })

  const monthlyData = Object.keys(monthlyStats).sort().map(key => ({
    month: key,
    income: monthlyStats[key].income,
    expense: monthlyStats[key].expense
  }))

  return NextResponse.json({
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    monthlyData,
    categoryStats
  })
}
