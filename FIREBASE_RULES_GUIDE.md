# Firebase Realtime Database Security Rules

## Overview
Complete Firebase Realtime Database rules for BridgeBreak application using **Firebase Authentication** only.

## How to Apply Rules

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select Your Project**
3. **Go to Realtime Database** → **Rules** tab
4. **Copy the entire content** from `firebase-rules.json`
5. **Paste** into the Rules editor
6. **Click Publish**

---

## Data Access Rules by Collection

### 1. **USERS** - Own Profile Only
```
✅ Can Read: Own profile OR Admin
✅ Can Write: Own profile OR Admin
❌ Clients: Cannot see other users
```

### 2. **PROJECTS** - Clients Own, Admin All
```
✅ Can Read: Own projects OR Admin can see all
✅ Can Write: Clients can only edit pending projects, Admins all
❌ Clients: Cannot see other clients' projects
```

### 3. **INVOICES** - Clients Own, Admin All
```
✅ Can Read: Own invoices OR Admin can see all
✅ Can Write: Admin only
❌ Clients: Cannot see other clients' invoices
```

### 4. **TRANSACTIONS** - ADMIN ONLY ⭐
```
✅ Can Read: Admin only
✅ Can Write: Admin only
❌ Clients: Cannot see ANY transactions
↳ THIS FIXES THE "EMPTY TABS" ISSUE
```

### 5. **SYSTEM_SETTINGS** - ADMIN ONLY
```
✅ Can Read: Admin only
✅ Can Write: Admin only
❌ Clients: Cannot see system config
```

### 6. **SUPPORT_REQUESTS** - Clients Own, Admin All
```
✅ Can Read: Own requests OR Admin
✅ Can Write: Clients create own, Admin updates
❌ Clients: Cannot see other clients' support tickets
```

### 7. **MEETINGS** - Clients Own, Admin All
```
✅ Can Read: Own meetings OR Admin
✅ Can Write: Clients create own, Admin updates
❌ Clients: Cannot see other clients' meetings
```

### 8. **TEAM_MEMBERS** - ADMIN ONLY
```
✅ Can Read: Admin only
✅ Can Write: Admin only
❌ Clients: Cannot see team member data
```

### 9. **SALARY_PAYMENTS** - ADMIN ONLY
```
✅ Can Read: Admin only
✅ Can Write: Admin only
❌ Clients: Cannot see salary information
```

### 10. **PLANNING_NOTES** - ADMIN ONLY
```
✅ Can Read: Admin only
✅ Can Write: Admin only
❌ Clients: Cannot see internal planning notes
```

### 11. **NOTIFICATIONS** - Own Only
```
✅ Can Read: Own notifications only
✅ Can Write: Own notifications OR Admin
❌ Clients: Cannot see other users' notifications
```

### 12. **QUOTATIONS** - Clients Own, Manual Quotes, Admin All
```
✅ Can Read: Own OR manually created (no client) OR Admin
✅ Can Write: Admin only
```

---

## Why This Fixes "Empty Tabs" Issue

**Problem**: Other tabs in the Finance page were showing empty data.

**Root Cause**: `getTransactions()` function was fetching ALL transactions from Firebase without user filtering.

**Solution**: Firebase Rules now restrict:
- Clients cannot READ transactions at all
- Only Admins can READ transactions
- This prevents data leakage while the code tries to fetch

**Effect**: 
- Admin sees full transaction data ✅
- Clients see empty transactions (403 forbidden at DB level) ✅

---

## Rule Structure Explained

### Authentication Check
```
root.child('users').child(auth.uid).child('role').val() === 'admin'
```
- Gets current user's ID via `auth.uid`
- Reads user document
- Checks if `role` field equals `'admin'`
- Returns true/false for permission

### Client-Specific Check
```
root.child('projects').child($projectId).child('client_id').val() === auth.uid
```
- Reads the specific resource's `client_id` field
- Compares to current user's ID
- Only allows if they match (own resource)

### Creating Resource Check
```
!data.exists()
```
- Checks if resource exists
- `!data.exists()` = true for new records (CREATE)
- Prevents clients from updating others' records

---

## Testing the Rules

### Admin User Should See:
- ✅ All transactions
- ✅ All invoices
- ✅ All projects
- ✅ All system settings
- ✅ All team members
- ✅ All salary payments
- ✅ All planning notes

### Client User Should See:
- ✅ Own profile
- ✅ Own projects
- ✅ Own invoices
- ✅ Own support requests
- ✅ Own meeting requests
- ✅ Own notifications
- ❌ Other users' data
- ❌ ANY transactions
- ❌ System settings
- ❌ Team members
- ❌ Salary payments
- ❌ Planning notes

---

## Important Notes

1. **Firebase enforces these rules at database level** - No way to bypass via code
2. **All .read and .write rules are checked** - Both must pass for operation
3. **Authentication must be valid** - `auth.uid` must exist
4. **Performance**: Rules are evaluated in milliseconds

---

## If Tabs Still Show Empty

### Checklist:
- [ ] Rules published successfully in Firebase Console
- [ ] Wait 5-10 seconds for propagation
- [ ] Logout and login again (refresh session)
- [ ] Check browser console for errors
- [ ] Verify user role is `'admin'` in Firebase users collection

### Debug: Check User Role
```
1. Go to Firebase Console
2. Realtime Database → Data tab
3. Click "users" → find your user
4. Verify "role" field = "admin"
```

---

## File Location
📄 **File**: `/firebase-rules.json`
