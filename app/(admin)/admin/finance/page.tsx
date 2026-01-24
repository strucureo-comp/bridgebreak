'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { getInvoices, getTransactions, createTransaction, deleteTransaction, getSystemSetting, setSystemSetting } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCard } from '@/components/common/stats-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileUploader } from '@/components/common/file-uploader';
import { DollarSign, TrendingUp, TrendingDown, Users, Plus, Paperclip, Trash2, Calendar as CalendarIcon, FileText, ExternalLink, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Invoice, Transaction, TransactionType } from '@/lib/db/types';
import { cn } from '@/lib/utils';

export default function AdminFinancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBalanceEditOpen, setIsBalanceEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [startingBalance, setStartingBalance] = useState(0);
  const [newStartingBalance, setNewStartingBalance] = useState('');

  const [newTransaction, setNewTransaction] = useState<{
    amount: string;
    description: string;
    category: string;
    type: TransactionType;
    date: string;
    attachment_url: string;
  }>({
    amount: '',
    description: '',
    category: 'General',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    attachment_url: '',
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      const allowedFinanceEmails = [
        'viyasramachandran@gmail.com',
        'aathish@strucureo.works',
        'aathihacker2004@gmail.com',
      ];

      if (user.email && !allowedFinanceEmails.includes(user.email.toLowerCase())) {
        toast.error('You are not authorized to view this page.');
        router.push('/admin/dashboard');
        return;
      }

      fetchData();
    }
  }, [user, router]);

  const fetchData = async () => {
    try {
      const [invoicesData, transactionsData, balanceSetting] = await Promise.all([
        getInvoices(),
        getTransactions(),
        getSystemSetting('finance_starting_balance')
      ]);
      setInvoices(invoicesData);
      setTransactions(transactionsData);
      setStartingBalance(balanceSetting ? parseFloat(balanceSetting) : 0);
      setNewStartingBalance(balanceSetting ? balanceSetting.toString() : '0');
    } catch (error) {
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async () => {
    const balance = parseFloat(newStartingBalance);
    if (isNaN(balance)) {
      toast.error('Invalid balance amount');
      return;
    }
    setSaving(true);
    const success = await setSystemSetting('finance_starting_balance', balance);
    if (success) {
      setStartingBalance(balance);
      setIsBalanceEditOpen(false);
      toast.success('Starting balance updated');
    } else {
      toast.error('Failed to update balance');
    }
    setSaving(false);
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.description || !newTransaction.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const success = await createTransaction({
        amount: parseFloat(newTransaction.amount),
        description: newTransaction.description,
        category: newTransaction.category,
        type: newTransaction.type,
        date: newTransaction.date,
        attachment_url: newTransaction.attachment_url || undefined,
        created_by: user!.id,
      });

      if (success) {
        toast.success('Transaction added successfully');
        setIsAddOpen(false);
        setNewTransaction({
          amount: '',
          description: '',
          category: 'General',
          type: 'expense',
          date: new Date().toISOString().split('T')[0],
          attachment_url: '',
        });
        fetchData();
      } else {
        toast.error('Failed to add transaction');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      const success = await deleteTransaction(id);
      if (success) {
        toast.success('Transaction deleted');
        fetchData();
      } else {
        toast.error('Failed to delete transaction');
      }
    }
  };

  const totalInvoiceRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const manualIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRevenue = totalInvoiceRevenue + manualIncome;
  const currentBalance = startingBalance + totalRevenue - totalExpenses;
  const pendingRevenue = invoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
            <p className="text-muted-foreground">Manage company cash flow and records</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isBalanceEditOpen} onOpenChange={setIsBalanceEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Pencil className="h-4 w-4 mr-2" />
                  Set Balance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Starting Account Balance</DialogTitle>
                  <DialogDescription>
                    This amount will be added to your calculated revenue to determine the current balance.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startingBalance">Starting Balance ($)</Label>
                    <Input
                      id="startingBalance"
                      type="number"
                      step="0.01"
                      value={newStartingBalance}
                      onChange={(e) => setNewStartingBalance(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBalanceEditOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateBalance} disabled={saving}>Save Balance</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                  <DialogDescription>
                    Record a new income or expense entry.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Transaction Type</Label>
                    <Select
                      value={newTransaction.type}
                      onValueChange={(val: TransactionType) => setNewTransaction({ ...newTransaction, type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income (+)</SelectItem>
                        <SelectItem value="expense">Expense (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="e.g., Server Costs, Project Payment"
                      value={newTransaction.category}
                      onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Details about this transaction"
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Attachment (Receipt/Invoice)</Label>
                    <FileUploader
                      bucket="finance"
                      path={`transactions/${user?.id}`}
                      onUploadComplete={(url) => setNewTransaction({ ...newTransaction, attachment_url: url })}
                    />
                    {newTransaction.attachment_url && (
                      <p className="text-xs text-green-600 flex items-center">
                        <Paperclip className="h-3 w-3 mr-1" />
                        Attached Successfully
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddTransaction} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Transaction'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Current Balance"
            value={`$${currentBalance.toFixed(2)}`}
            description="Net Cash on Hand"
            icon={DollarSign}
            className={currentBalance >= 0 ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"}
          />
          <StatsCard
            title="Total Revenue"
            value={`$${totalRevenue.toFixed(2)}`}
            description="Invoices + Manual Income"
            icon={TrendingUp}
          />
          <StatsCard
            title="Total Expenses"
            value={`$${totalExpenses.toFixed(2)}`}
            description="Operational Costs"
            icon={TrendingDown}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Transactions</CardTitle>
                <CardDescription>
                  Manual income and expense records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No transactions yet</p>
                    <p className="mb-4 text-sm">Add your first income or expense to get started.</p>
                    <Button variant="outline" onClick={() => setIsAddOpen(true)}>
                      Schedule Transaction
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="hidden md:table-cell">Category</TableHead>
                            <TableHead className="hidden sm:table-cell">Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((t) => (
                            <TableRow key={t.id}>
                              <TableCell className="whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="font-medium">{t.description}</div>
                                <div className="text-xs text-muted-foreground md:hidden">{t.category}</div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{t.category}</TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-xs font-medium uppercase",
                                  t.type === 'income' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>
                                  {t.type}
                                </span>
                              </TableCell>
                              <TableCell className={cn(
                                "text-right font-bold whitespace-nowrap",
                                t.type === 'income' ? "text-green-600" : "text-red-600"
                              )}>
                                {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {t.attachment_url && (
                                    <Button variant="ghost" size="icon" asChild title="View Attachment">
                                      <a href={t.attachment_url} target="_blank" rel="noopener noreferrer">
                                        <Paperclip className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(t.id)} title="Delete">
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
