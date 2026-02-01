# Database Rules & Data Visibility Analysis

## Issue Found
**Other users' data is showing when it shouldn't** - specifically transactions and financial data.

## Root Cause
1. **Transactions stored in Firebase** without user-level filtering
2. **No Supabase RLS policies** for transactions table (table didn't exist)
3. **`getTransactions()` fetches ALL transactions** regardless of user role

```typescript
// Current code - INSECURE
export async function getTransactions(): Promise<Transaction[]> {
  const transactionsRef = ref(database, 'transactions');
  const snapshot = await get(transactionsRef);  // ← Gets ALL transactions
  // No filtering by user or role
}
```

## Database Security Rules - CURRENT STATE

### ✅ SECURE - Proper RLS Enforced
| Table | Access | Rule |
|-------|--------|------|
| `users` | Clients | Can only view own profile |
| `users` | Admins | Can view all profiles |
| `projects` | Clients | Can only view own projects |
| `projects` | Admins | Can manage all projects |
| `invoices` | Clients | Can only view own invoices |
| `invoices` | Admins | Can manage all invoices |
| `payments` | Clients | Can view if linked to their invoice |
| `payments` | Admins | Can manage all payments |
| `support_requests` | Clients | Can only view own support requests |
| `support_requests` | Admins | Can manage all requests |
| `meetings` | Clients | Can only view own meeting requests |
| `meetings` | Admins | Can manage all meetings |
| `team_members` | All | Admin-only access |
| `salary_payments` | All | Admin-only access |
| `notifications` | Users | Can only view own notifications |
| `system_settings` | All | Admin-only access |

### ⚠️ INSECURE - NO FILTERING
| Table | Access | Issue |
|-------|--------|-------|
| `transactions` | Firebase | **NO TABLE IN SUPABASE** |
| | Firebase | **NO USER FILTERING** |
| | Firebase | **ALL USERS CAN SEE ALL DATA** |

## Solution Implemented

### New Migration File
**File**: `supabase/migrations/20260202_add_transactions_table.sql`

Creates `transactions` table with strict RLS:
```sql
-- Only admins can view transactions
CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin')
  );

-- Only admins can create transactions
CREATE POLICY "Admins can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin')
  );
```

## How RLS Works

### Row Level Security (RLS) Flow
```
User Query → Postgres → Check RLS Policy → 
  ✓ Policy allows → Return data
  ✗ Policy blocks → Return empty/error
```

### Example: Client User
```
Client queries: SELECT * FROM transactions
  ↓
Postgres checks: Is auth.uid() an admin?
  ↓
Answer: No (auth.uid() = 'client-123')
  ↓
Result: Query returns empty array (0 rows)
```

### Example: Admin User
```
Admin queries: SELECT * FROM transactions
  ↓
Postgres checks: Is auth.uid() an admin?
  ↓
Answer: Yes (auth.uid() = 'admin-456', role = 'admin')
  ↓
Result: Query returns all transactions
```

## Data Visibility Summary

### Client Users Can See
- ✅ Own projects
- ✅ Own invoices
- ✅ Own support tickets
- ✅ Own meetings
- ✅ Own notifications
- ❌ Other users' projects
- ❌ Other users' invoices
- ❌ Financial transactions
- ❌ Team member data
- ❌ Salary payments

### Admin Users Can See
- ✅ All projects
- ✅ All invoices
- ✅ All support tickets
- ✅ All meetings
- ✅ All transactions ← **With new migration**
- ✅ All team members
- ✅ All salary payments
- ✅ All users
- ✅ System settings
- ✅ All notifications

## How to Apply the Fix

### Step 1: Push Migration to Supabase
```bash
npx supabase migration list
npx supabase db push  # Applies the new migration
```

### Step 2: Update Firebase Storage Rules (OPTIONAL - if continuing to use Firebase)
If you keep transactions in Firebase, add these rules:
```json
{
  "rules": {
    "transactions": {
      ".read": "root.child('admin_users').child(auth.uid()).val() === true",
      ".write": "root.child('admin_users').child(auth.uid()).val() === true"
    }
  }
}
```

### Step 3: Migrate Code from Firebase to Supabase
Replace Firebase calls with Supabase:
```typescript
// OLD - Firebase (insecure)
import { getTransactions } from '@/lib/firebase/database';

// NEW - Supabase (secure with RLS)
import { createServerClient } from '@/lib/supabase/server';

export async function getTransactions() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}
```

## Key Takeaways

1. **RLS is enforced at database level** - no way to bypass via code
2. **Always check who can view what** - verify policies match business requirements
3. **Admin-only data should have strict policies** - transactions, salaries, settings
4. **Client data should be isolated** - projects, invoices, support tickets
5. **Test with different user roles** - verify the policies actually work

## Verification Checklist

- [ ] New migration file exists: `20260202_add_transactions_table.sql`
- [ ] Migration pushed to Supabase database
- [ ] Test: Client user tries to fetch transactions → Should get empty result
- [ ] Test: Admin user fetches transactions → Should get all transactions
- [ ] Code updated to use Supabase instead of Firebase for transactions
- [ ] Firebase rules updated (if keeping Firebase)
- [ ] No sensitive data leaks in browser console
