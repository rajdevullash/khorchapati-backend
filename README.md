# Ay-Bay Backend

Modular Express + MongoDB backend with all expense tracker features and zod validation.

## Setup

1. Copy `.env.example` to `.env` and update values:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Seed default categories and payment methods:
   ```bash
   npm run seed
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Transactions
- `GET /api/transactions` - List transactions (with filters)
- `GET /api/transactions/:id` - Get transaction by ID
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Payment Methods
- `GET /api/payment-methods` - List payment methods
- `POST /api/payment-methods` - Create payment method
- `PUT /api/payment-methods/:id` - Update payment method
- `DELETE /api/payment-methods/:id` - Delete payment method

### Accounts
- `GET /api/accounts` - List accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `POST /api/accounts/transfer` - Transfer between accounts

### Budgets
- `GET /api/budgets` - List budgets
- `GET /api/budgets/status` - Get budget status with spent amounts
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### Recurring Transactions
- `GET /api/recurring` - List recurring transactions
- `POST /api/recurring` - Create recurring transaction
- `PUT /api/recurring/:id` - Update recurring transaction
- `DELETE /api/recurring/:id` - Delete recurring transaction
- `PATCH /api/recurring/:id/toggle` - Toggle active/inactive

### Dashboard
- `GET /api/dashboard/summary` - Get income/expense/balance summary
- `GET /api/dashboard/category-breakdown` - Get category-wise breakdown
- `GET /api/dashboard/monthly-overview` - Get monthly income/expense data
- `GET /api/dashboard/accounts-overview` - Get all accounts with total balance

### Export/Import
- `GET /api/export/csv` - Export transactions as CSV
- `GET /api/export/json` - Export transactions as JSON
- `POST /api/export/import` - Import transactions from JSON

All endpoints except `/api/auth/*` require JWT Bearer token in Authorization header.
# khorchapati-backend
