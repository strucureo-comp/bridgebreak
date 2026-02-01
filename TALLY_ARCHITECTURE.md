# Tally Brain Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TALLY BRAIN SYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

                              USER
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Finance Page      │
                    │   (React Component) │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Firebase Database  │
                    │  - Transactions     │
                    │  - Invoices         │
                    │  - Settings         │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │                             │
                ▼                             ▼
        ┌───────────────┐        ┌──────────────────┐
        │ initializeT.. │        │ getTransactions  │
        │ allyEngine()  │        │ getInvoices()    │
        └───────┬───────┘        └────────┬─────────┘
                │                        │
                └────────────┬───────────┘
                             │
                             ▼
                ┌─────────────────────────┐
                │  TallyEngine Instance   │
                │  (Core Logic)           │
                └──────────┬──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────┐      ┌────────────┐    ┌────────────┐
    │ Ledger │      │  Accounts  │    │Statements  │
    │        │      │  Hierarchy │    │            │
    │- Debit │      │            │    │- Balance   │
    │- Credit│      │14 Default  │    │  Sheet     │
    │- Running│     │Accounts    │    │- Income    │
    │Balance │      └────────────┘    │  Statement │
    └────────┘                        │- Cash Flow │
        │                             └────────────┘
        │                                   │
        └──────────────────┬────────────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │  Financial Calculations  │
            │                          │
            │ - Trial Balance          │
            │ - Ratios                 │
            │ - Metrics                │
            │ - Recommendations        │
            └───────────┬──────────────┘
                        │
                        ▼
            ┌──────────────────────────┐
            │   TallyDashboard UI      │
            │   (React Component)      │
            │                          │
            │ ┌────────────────────┐   │
            │ │  Metric Cards (4)  │   │
            │ └────────────────────┘   │
            │ ┌────────────────────┐   │
            │ │  Tabs (4)          │   │
            │ │- Overview          │   │
            │ │- Accounts          │   │
            │ │- Statements        │   │
            │ │- Analysis          │   │
            │ └────────────────────┘   │
            │ ┌────────────────────┐   │
            │ │  Charts            │   │
            │ │- Pie, Bar, etc     │   │
            │ └────────────────────┘   │
            └───────────┬──────────────┘
                        │
                        ▼
                    USER SEES
                 FINANCIAL INSIGHTS
```

## Data Flow Diagram

```
TRANSACTIONS & INVOICES
    │
    ├─────┬────────────────────────┐
    │     │                        │
    ▼     ▼                        ▼
  
  Income  Expense        Invoice Payment
    │       │                   │
    │       │                   │
    └───────┼───────────────────┘
            │
            ▼
    TallyEngine.record*()
    - recordIncome()
    - recordExpense()
    - recordTransaction()
            │
            ├─ Debit Entry
            ├─ Credit Entry
            └─ Both stored in Ledger
            │
            ▼
    Ledger Array
    [
      { account: 'bank', debit: 1000, credit: 0 },
      { account: 'sales', debit: 0, credit: 1000 }
    ]
            │
            ├─────────────┬─────────────┐
            │             │             │
            ▼             ▼             ▼
    Trial Balance   Statements    Ratios
    (Validation)   (Reporting)   (Analysis)
            │             │             │
            └─────────────┼─────────────┘
                          │
                          ▼
                    Dashboard Display
```

## Component Structure

```
Finance Page
  │
  ├─ Tabs
  │   ├─ "Tally Brain" (DEFAULT)
  │   │   └─ TallyDashboard
  │   │       ├─ MetricCards (4)
  │   │       │   ├─ Profit Margin
  │   │       │   ├─ Debt-to-Equity
  │   │       │   ├─ Current Ratio
  │   │       │   └─ Operating Efficiency
  │   │       │
  │   │       └─ Tabs (4)
  │   │           ├─ Overview
  │   │           │   ├─ Balance Sheet Cards
  │   │           │   ├─ Income Statement Cards
  │   │           │   └─ Charts
  │   │           │
  │   │           ├─ Accounts
  │   │           │   ├─ Assets
  │   │           │   ├─ Liabilities
  │   │           │   ├─ Equity
  │   │           │   ├─ Income
  │   │           │   └─ Expenses
  │   │           │
  │   │           ├─ Statements
  │   │           │   └─ Trial Balance Table
  │   │           │
  │   │           └─ Analysis
  │   │               ├─ Ratio Metrics
  │   │               └─ Recommendations
  │   │
  │   └─ "Transactions" (BACKUP)
  │       └─ Transaction Table (Traditional View)
  │
  ├─ Stats Cards (3) - Quick Overview
  │   ├─ Current Balance
  │   ├─ Total Revenue
  │   └─ Total Expenses
  │
  └─ Dialogs
      ├─ Add Transaction
      └─ Set Balance
```

## Account Hierarchy

```
CHART OF ACCOUNTS
│
├─ ASSETS (Type: asset)
│  ├─ 1010: Bank Account
│  ├─ 1020: Cash in Hand
│  └─ 1030: Accounts Receivable
│
├─ LIABILITIES (Type: liability)
│  └─ 2010: Accounts Payable
│
├─ EQUITY (Type: equity)
│  ├─ 3010: Capital Account
│  └─ 3020: Retained Earnings
│
├─ INCOME (Type: income)
│  ├─ 4010: Sales Revenue
│  ├─ 4020: Service Income
│  └─ 4030: Other Income
│
└─ EXPENSES (Type: expense)
   ├─ 5010: Salaries & Wages
   ├─ 5020: Rent Expense
   ├─ 5030: Utilities
   ├─ 5040: Office Supplies
   └─ 5050: Software & Subscriptions
```

## Double-Entry Example

```
SCENARIO: Receive $1000 from client

        ┌─────────────────────┐
        │   Client Payment    │
        │      $1000          │
        └──────────┬──────────┘
                   │
                   ▼
    ┌──────────────────────────┐
    │   recordIncome()         │
    │   amount: 1000           │
    │   description: Payment   │
    └──────────┬───────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    ┌────────────┐ ┌───────────────┐
    │   DEBIT    │ │    CREDIT     │
    ├────────────┤ ├───────────────┤
    │ Bank Acct  │ │Sales Revenue  │
    │   +$1000   │ │    +$1000     │
    └────────────┘ └───────────────┘
        │             │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │   Ledger    │
        │  BALANCED ✅ │
        └─────────────┘
     (Debit = Credit = $1000)
```

## Calculation Flow

```
FINANCIAL METRICS CALCULATION

Raw Data
  │
  ├─ Accounts with balances
  ├─ Account types
  └─ All ledger entries
    │
    ▼
Trial Balance Calculation
  │
  ├─ Sum debits by account
  ├─ Sum credits by account
  └─ Verify: Total Debits = Total Credits
    │
    ▼
Financial Statements
  │
  ├─ Assets (debit balance accounts)
  ├─ Liabilities (credit balance accounts)
  ├─ Equity (credit balance accounts)
  ├─ Revenue (credit balance accounts)
  └─ Expenses (debit balance accounts)
    │
    ▼
Key Metrics Calculation
  │
  ├─ Total Assets
  ├─ Total Liabilities
  ├─ Total Equity
  ├─ Total Revenue
  └─ Total Expenses
    │
    ▼
Financial Ratios
  │
  ├─ Profit Margin = (Net Income / Revenue) × 100
  ├─ Debt-to-Equity = Liabilities / Equity
  ├─ Current Ratio = Assets / Liabilities
  └─ Operating Efficiency = (Expenses / Revenue) × 100
    │
    ▼
Smart Recommendations
  │
  └─ Based on ratio values
      ├─ IF Profit Margin > 30% → "Excellent"
      ├─ IF Debt-to-Equity > 2 → "High Debt"
      ├─ IF Current Ratio < 1 → "Liquidity Issue"
      └─ IF Efficiency > 80% → "Cut Costs"
```

## File Relationships

```
lib/
  ├─ tally-engine.ts
  │   └─ Used by: tally-utils.ts, tally-dashboard.tsx
  │   └─ Exports: TallyEngine, DEFAULT_ACCOUNTS, Types
  │
  └─ tally-utils.ts
      └─ Uses: tally-engine.ts
      └─ Used by: finance/page.tsx
      └─ Exports: Helper functions

components/
  └─ admin/
      └─ tally-dashboard.tsx
          └─ Uses: tally-engine.ts
          └─ Used by: finance/page.tsx
          └─ Exports: TallyDashboard component

app/
  └─ (admin)/
      └─ admin/
          └─ finance/
              └─ page.tsx
                  ├─ Uses: tally-engine.ts
                  ├─ Uses: tally-utils.ts
                  └─ Renders: TallyDashboard
```

## State Management Flow

```
Finance Page State
  │
  ├─ invoices: Invoice[]
  │   └─ Loaded from Firebase
  │
  ├─ transactions: Transaction[]
  │   └─ Loaded from Firebase
  │
  ├─ tallyEngine: TallyEngine | null
  │   └─ Created from invoices + transactions
  │   └─ Updated when data changes
  │   └─ Passed to TallyDashboard
  │
  ├─ activeTab: 'tally' | 'transactions'
  │   └─ Default: 'tally' (Tally Brain enabled)
  │   └─ Controls which tab is visible
  │
  └─ Other states: loading, saving, isAddOpen, etc.


TallyDashboard Props
  │
  ├─ engine: TallyEngine
  │   └─ Used for all calculations
  │   └─ Read-only (no mutations)
  │
  └─ onReconcile?: () => void
      └─ Callback for reconciliation actions
```

---

**This architecture ensures:**
- ✅ Clean separation of concerns
- ✅ Reusable components
- ✅ Type-safe calculations
- ✅ Easy to test
- ✅ Scalable design
- ✅ Professional accounting practices
