'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { PlusCircle, Calendar, User, DollarSign, Tag, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

type Expense = {
  id: number
  date: string
  player: string
  amount: number
  category: string
}

type Settlement = {
  from: string
  to: string
  amount: number
}

type MonthlyAnalysis = {
  period: string
  total_amount: number
  category_totals: { [key: string]: number }
  player_totals: { [key: string]: number }
}

export default function HouseholdBudgetApp() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [date, setDate] = useState('')
  const [player, setPlayer] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [settlementDay, setSettlementDay] = useState(20)
  const [useCustomSettlement, setUseCustomSettlement] = useState(false)
  const { toast } = useToast()

  const members = ['のり', 'ばん', 'きお']
  const categories = ['食費', '日用品', '洗濯', '光熱費', '家賃', 'WiFi', 'その他']

  useEffect(() => {
    setIsClient(true)
    setDate(new Date().toISOString().split('T')[0])
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
      setSupabase(supabaseClient)
    } else {
      console.error('Supabase URL or Anon Key is missing')
      toast({
        title: "エラー",
        description: "Supabaseの設定が不完全です。",
        variant: "destructive",
      })
    }
  }, [toast])

  const fetchExpenses = useCallback(async () => {
    if (!supabase) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('支出の取得に失敗しました:', error)
      toast({
        title: "エラー",
        description: "支出の取得に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    if (supabase) {
      fetchExpenses()
    }
  }, [supabase, fetchExpenses])

  const calculateSettlementPeriod = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()

    let startDate, endDate

    if (useCustomSettlement) {
      if (day <= settlementDay) {
        startDate = new Date(year, month - 1, settlementDay + 1)
        endDate = new Date(year, month, settlementDay)
      } else {
        startDate = new Date(year, month, settlementDay + 1)
        endDate = new Date(year, month + 1, settlementDay)
      }
    } else {
      startDate = new Date(year, month, 1)
      endDate = new Date(year, month + 1, 0)
    }

    return { startDate, endDate }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setDate(expense.date)
    setPlayer(expense.player)
    setAmount(expense.amount.toString())
    setCategory(expense.category)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditingExpense(null)
    setDate(new Date().toISOString().split('T')[0])
    setPlayer('')
    setAmount('')
    setCategory('')
    setIsEditing(false)
  }

  const handleUpdate = async () => {
    if (!supabase || !editingExpense) return

    try {
      setIsLoading(true)
      
      const updatedExpense = {
        date,
        player,
        amount: Number(amount),
        category
      }

      const { error } = await supabase
        .from('expenses')
        .update(updatedExpense)
        .eq('id', editingExpense.id)

      if (error) throw error

      await fetchExpenses()
      handleCancelEdit()
      toast({
        title: "更新成功",
        description: "支出が正常に更新されました。",
      })
    } catch (error) {
      console.error('支出の更新に失敗しました:', error)
      toast({
        title: "エラー",
        description: "支出の更新に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!supabase) return

    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchExpenses()
      toast({
        title: "削除成功",
        description: "支出が正常に削除されました。",
      })
    } catch (error) {
      console.error('支出の削除に失敗しました:', error)
      toast({
        title: "エラー",
        description: "支出の削除に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setIsLoading(true)
    try {
      if (isEditing) {
        await handleUpdate()
      } else {
        const newExpense = {
          date,
          player,
          amount: Number(amount),
          category
        }

        const { error } = await supabase
          .from('expenses')
          .insert([newExpense])

        if (error) throw error

        await fetchExpenses()
        setDate(new Date().toISOString().split('T')[0])
        setPlayer('')
        setAmount('')
        setCategory('')
        toast({
          title: "追加成功",
          description: "新しい支出が正常に追加されました。",
        })
      }
    } catch (error) {
      console.error('支出の追加に失敗しました:', error)
      toast({
        title: "エラー",
        description: "支出の追加に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateSettlements = () => {
    const currentDate = new Date()
    const { startDate, endDate } = calculateSettlementPeriod(currentDate)

    const periodExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= startDate && expenseDate <= endDate
    })

    const totalExpense = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const equalShare = totalExpense / members.length
    const balances: {[key: string]: number} = {}

    members.forEach(member => {
      balances[member] = periodExpenses
        .filter(expense => expense.player === member)
        .reduce((sum, expense) => sum + expense.amount, 0) - equalShare
    })

    const settlements: Settlement[] = []
    members.forEach(from => {
      members.forEach(to => {
        if (from !== to && balances[from] < 0 && balances[to] > 0) {
          const amount = Math.min(-balances[from], balances[to])
          if (amount > 0) {
            settlements.push({ from, to, amount })
            balances[from] += amount
            balances[to] -= amount
          }
        }
      })
    })

    return settlements
  }

  const calculateMonthlyAnalysis = () => {
    const analysisData: { [key: string]: MonthlyAnalysis } = {}

    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date)
      const { startDate, endDate } = calculateSettlementPeriod(expenseDate)
      const periodKey = `${startDate.toISOString().slice(0, 10)} ~ ${endDate.toISOString().slice(0, 10)}`

      if (!analysisData[periodKey]) {
        analysisData[periodKey] = {
          period: periodKey,
          total_amount: 0,
          category_totals: {},
          player_totals: {}
        }
      }

      analysisData[periodKey].total_amount += expense.amount
      analysisData[periodKey].category_totals[expense.category] = (analysisData[periodKey].category_totals[expense.category] || 0) + expense.amount
      analysisData[periodKey].player_totals[expense.player] = (analysisData[periodKey].player_totals[expense.player] || 0) + expense.amount
    })

    return Object.values(analysisData).sort((a, b) => b.period.localeCompare(a.period))
  }

  if (!isClient) {
    return <div>読み込み中...</div>
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">家計簿アプリ</CardTitle>
          <CardDescription>支出を記録し、メンバー間で精算を行います</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="input" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="input">入力</TabsTrigger>
              <TabsTrigger value="history">履歴</TabsTrigger>
              <TabsTrigger value="analysis">分析</TabsTrigger>
              <TabsTrigger value="settlements">精算</TabsTrigger>
              <TabsTrigger value="settings">設定</TabsTrigger>
            </TabsList>
            <TabsContent value="input">
              <Card>
                <CardHeader>
                  <CardTitle>{isEditing ? '支出編集' : '支出入力'}</CardTitle>
                  <CardDescription>
                    {isEditing ? '既存の支出を編集します' : '新しい支出を記録します'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">日付</Label>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="pl-8"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="player">支払者</Label>
                      <Select value={player} onValueChange={setPlayer} required>
                        <SelectTrigger id="player" className="w-full">
                          <User className="mr-2 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="支払者を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map(member => (
                            <SelectItem key={member} value={member}>{member}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="amount">金額</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          type="number"
                          placeholder="金額"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pl-8"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">カテゴリ</Label>
                      <Select value={category} onValueChange={setCategory} required>
                        <SelectTrigger id="category" className="w-full">
                          <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="カテゴリを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex space-x-2">
                      {isEditing ? (
                        <>
                          <Button 
                            type="submit" 
                            className="flex-1"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                更新中...
                              </>
                            ) : (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                更新する
                              </>
                            )}
                          </Button>
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isLoading}
                          >
                            <X className="mr-2 h-4 w-4" />
                            キャンセル
                          </Button>
                        </>
                      ) : (
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              追加中...
                            </>
                          ) : (
                            <>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              支出を追加
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>支出履歴</CardTitle>
                  <CardDescription>記録された支出の一覧です</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日付</TableHead>
                          <TableHead>支払者</TableHead>
                          <TableHead>金額</TableHead>
                          <TableHead>カテゴリ</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{expense.date}</TableCell>
                            <TableCell>{expense.player}</TableCell>
                            <TableCell>{expense.amount.toLocaleString()}円</TableCell>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEdit(expense)}
                                  disabled={isLoading}
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">編集</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDelete(expense.id)}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">削除</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analysis">
              <Card>
                <CardHeader>
                  <CardTitle>期間別分析</CardTitle>
                  <CardDescription>精算期間ごとの支出分析を表示します</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-md border">
                    {calculateMonthlyAnalysis().map((analysis) => (
                      <Card key={analysis.period} className="mb-4">
                        <CardHeader>
                          <CardTitle>{analysis.period}</CardTitle>
                          <CardDescription>合計支出: {analysis.total_amount.toLocaleString()}円</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">カテゴリ別支出</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>カテゴリ</TableHead>
                                    <TableHead>金額</TableHead>
                                    <TableHead>割合</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(analysis.category_totals).map(([category, amount]) => (
                                    <TableRow key={category}>
                                      <TableCell>{category}</TableCell>
                                      <TableCell>{amount.toLocaleString()}円</TableCell>
                                      <TableCell>{((amount / analysis.total_amount) * 100).toFixed(1)}%</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">メンバー別支出</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>メンバー</TableHead>
                                    <TableHead>金額</TableHead>
                                    <TableHead>割合</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(analysis.player_totals).map(([player, amount]) => (
                                    <TableRow key={player}>
                                      <TableCell>{player}</TableCell>
                                      <TableCell>{amount.toLocaleString()}円</TableCell>
                                      <TableCell>{((amount / analysis.total_amount) * 100).toFixed(1)}%</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settlements">
              <Card>
                <CardHeader>
                  <CardTitle>精算情報</CardTitle>
                  <CardDescription>メンバー間の精算情報を表示します</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>支払元</TableHead>
                        <TableHead>支払先</TableHead>
                        <TableHead>金額</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculateSettlements().map((settlement, index) => (
                        <TableRow key={index}>
                          <TableCell>{settlement.from}</TableCell>
                          <TableCell>{settlement.to}</TableCell>
                          <TableCell>{settlement.amount.toFixed(2)}円</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {calculateSettlements().length === 0 && (
                    <p className="text-center text-muted-foreground mt-4">現在、精算が必要な取引はありません。</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>精算設定</CardTitle>
                  <CardDescription>精算期間の設定を行います</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="custom-settlement"
                        checked={useCustomSettlement}
                        onCheckedChange={setUseCustomSettlement}
                      />
                      <Label htmlFor="custom-settlement">カスタム精算期間を使用</Label>
                    </div>
                    {useCustomSettlement && (
                      <div className="grid gap-2">
                        <Label htmlFor="settlement-day">締め日</Label>
                        <Input
                          id="settlement-day"
                          type="number"
                          min="1"
                          max="28"
                          value={settlementDay}
                          onChange={(e) => setSettlementDay(Number(e.target.value))}
                        />
                        <p className="text-sm text-muted-foreground">
                          毎月{settlementDay}日に締め、翌日から次の精算期間が始まります。
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}