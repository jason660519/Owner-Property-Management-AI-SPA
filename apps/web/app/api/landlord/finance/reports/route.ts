
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const reportType = searchParams.get('type') || 'income_statement'
  const year = searchParams.get('year') || new Date().getFullYear().toString()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get Property IDs
  const { data: properties } = await supabase
    .from('property_rentals')
    .select('id, title')
    .eq('owner_id', user.id)

  const propertyIds = properties?.map(p => p.id) || []
  
  if (propertyIds.length === 0) return NextResponse.json([])

  // Fetch transactions for the year
  const startOfYear = `${year}-01-01`
  const endOfYear = `${year}-12-31`

  const { data: transactions } = await supabase
    .from('rental_ledger')
    .select('*')
    .in('property_id', propertyIds)
    .gte('transaction_date', startOfYear)
    .lte('transaction_date', endOfYear)
    .order('transaction_date')

  if (!transactions) return NextResponse.json([])

  if (reportType === 'income_statement') {
      // Group by month and category
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
          const month = i + 1
          return {
              month,
              rent_income: 0,
              maintenance: 0,
              utility: 0,
              other: 0,
              total_income: 0,
              total_expense: 0,
              net_income: 0
          }
      })

      transactions.forEach(t => {
          const month = new Date(t.transaction_date).getMonth()
          const amount = Number(t.amount)
          
          if (t.transaction_type === 'rent_income') {
              monthlyData[month].rent_income += amount
              monthlyData[month].total_income += amount
          } else {
              monthlyData[month].total_expense += amount
              if (t.transaction_type === 'maintenance') monthlyData[month].maintenance += amount
              else if (t.transaction_type === 'utility') monthlyData[month].utility += amount
              else monthlyData[month].other += amount
          }
          monthlyData[month].net_income = monthlyData[month].total_income - monthlyData[month].total_expense
      })

      return NextResponse.json(monthlyData)
  }

  // Tax Report (simplified)
  if (reportType === 'tax') {
      let totalIncome = 0
      let deductibleExpenses = 0
      const expenseBreakdown: Record<string, number> = {}

      transactions.forEach(t => {
          const amount = Number(t.amount)
          if (t.transaction_type === 'rent_income') {
              totalIncome += amount
          } else {
              // Assuming all non-income are deductible for simplicity in this MVP
              deductibleExpenses += amount
              expenseBreakdown[t.transaction_type] = (expenseBreakdown[t.transaction_type] || 0) + amount
          }
      })

      return NextResponse.json({
          year,
          totalIncome,
          deductibleExpenses,
          taxableIncome: Math.max(0, totalIncome - deductibleExpenses),
          expenseBreakdown
      })
  }

  return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
}
