// Create users script for AZ Barber
// Run with: node scripts/create-users.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://uokzhoteojtnluhpqvjj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVva3pob3Rlb2p0bmx1aHBxdmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NTE0MDgsImV4cCI6MjA4NTIyNzQwOH0.FRYXnVd2imCuK1WuJjkT5tdkZI91jYZEo_hDWS-HZt8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERS_TO_CREATE = [
  // Barbers
  { email: 'az@test.com', password: 'test123', name: 'AZ', role: 'barber', barberId: '11111111-1111-1111-1111-111111111111', displayName: 'AZ' },
  { email: 'wendy@test.com', password: 'test123', name: 'Wendy', role: 'barber', barberId: '22222222-2222-2222-2222-222222222222', displayName: 'Wendy' },
  // Customers
  { email: 'customer@test.com', password: 'test123', name: 'Test Customer', role: 'customer' },
  { email: 'customer2@test.com', password: 'test123', name: '王小明', role: 'customer' },
];

async function createUsers() {
  console.log('Creating users...\n');

  for (const userData of USERS_TO_CREATE) {
    console.log(`Creating ${userData.email}...`);

    // 1. Sign up via Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: userData.role,
        }
      }
    });

    if (authError) {
      console.log(`  ❌ Auth error: ${authError.message}`);
      continue;
    }

    const userId = authData.user?.id;
    console.log(`  ✓ Auth created: ${userId}`);

    // 2. Insert into users table
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      });

    if (userError) {
      console.log(`  ❌ Users table error: ${userError.message}`);
    } else {
      console.log(`  ✓ Users table updated`);
    }

    // 3. If barber, insert into barbers table
    if (userData.role === 'barber' && userData.barberId) {
      const { error: barberError } = await supabase
        .from('barbers')
        .upsert({
          id: userData.barberId,
          user_id: userId,
          display_name: userData.displayName,
          is_active: true,
        });

      if (barberError) {
        console.log(`  ❌ Barbers table error: ${barberError.message}`);
      } else {
        console.log(`  ✓ Barbers table updated`);
      }
    }

    console.log('');
  }

  console.log('\n=== Summary ===');
  console.log('Email              | Password | Role');
  console.log('-------------------|----------|--------');
  for (const u of USERS_TO_CREATE) {
    console.log(`${u.email.padEnd(18)} | ${u.password.padEnd(8)} | ${u.role}`);
  }
}

createUsers().catch(console.error);
