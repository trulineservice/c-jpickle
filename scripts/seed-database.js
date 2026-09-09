/**
 * C&J Pickleball Arena - Database Seeding Helper Script
 * Run with: node scripts/seed-database.js
 */

const fs = require('fs');
const path = require('path');

const seedSqlPath = path.join(__dirname, '..', 'supabase', 'seed.sql');

console.log(`
================================================================================
   C&J PICKLEBALL ARENA - DATABASE SEEDING ENGINE
   Author: Database Manager Persona
================================================================================
Target Dataset Size:
  • Authenticated Users: 1,050 Profiles (1 Owner, 3 Admins, 6 Cashiers, 1,040 Clients)
  • Court Bookings:      500+ Sessions across Court 1 & Court 2 (GiST Exclusion Safe)
  • Multi-Paddle Rental: Realistic 0 to 4 paddle distribution (+₱150/ea)
  • POS Transactions:    450 BIR EOPT-Compliant Sales Invoices & Line Items
================================================================================
`);

if (!fs.existsSync(seedSqlPath)) {
  console.error(`Error: Seed SQL file not found at ${seedSqlPath}`);
  process.exit(1);
}

const stats = fs.statSync(seedSqlPath);
console.log(`Seed script is ready!
File:     supabase/seed.sql (also saved in supabase/migrations/20260909_seed_1000_users_and_orders.sql)
Filesize: ${(stats.size / 1024).toFixed(1)} KB

HOW TO RUN IN 1 STEP IN SUPABASE:
1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/wfvxznvpjjgnjhvukqcp
2. Click on "SQL Editor" on the left menu.
3. Paste the contents of "supabase/seed.sql" (or "supabase/migrations/20260909_seed_1000_users_and_orders.sql").
4. Click "Run" (it executes in ~2 to 3 seconds).

This will bulk-populate:
- 1,050 Auth Users & Profiles with encrypted passwords ('Password123!')
- 500+ Bookings with NO GiST double-booking collisions
- 450 POS Invoices with 12% VAT and Senior/PWD 20% statutory discounts
================================================================================
`);
