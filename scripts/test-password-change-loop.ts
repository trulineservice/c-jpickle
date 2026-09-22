import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function runMultiIterationStressLoop(iterations = 5) {
  console.log(`\n====================================================`);
  console.log(`RUNNING MULTI-ITERATION PASSWORD CHANGE STRESS TEST (${iterations} ITERATIONS)`);
  console.log(`====================================================\n`);

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  const testEmail = 'stress_test_player@cjpickleball.internal';
  
  // Cleanup any old test user
  const { data: listData } = await adminClient.auth.admin.listUsers();
  const existing = listData?.users.find((u) => u.email === testEmail);
  if (existing) {
    await adminClient.auth.admin.deleteUser(existing.id);
  }

  // Create initial user
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: 'InitialPassword123!',
    email_confirm: true,
    user_metadata: { full_name: 'Stress Test Player' },
  });
  if (createError || !created.user) {
    throw new Error(`Failed to create stress test user: ${createError?.message}`);
  }
  const userId = created.user.id;
  console.log(` Created fresh test user ${testEmail} (ID: ${userId})`);

  let currentPassword = 'InitialPassword123!';

  for (let i = 1; i <= iterations; i++) {
    console.log(`\n--- [LOOP ITERATION ${i} of ${iterations}] ---`);
    const newPassword = `NewSecretPass_Iter${i}_${Date.now()}!`;
    const token = `stress_tok_${i}_${Date.now()}`;

    // A. Generate token
    const { data: cData, error: cErr } = await anonClient.rpc('create_password_reset_token', {
      p_email: testEmail,
      p_token: token,
      p_hours: 1,
    });
    if (cErr || !cData?.success) {
      throw new Error(`[Iter ${i}] create token failed: ${cErr?.message || cData?.error}`);
    }

    // B. Verify token
    const { data: vData, error: vErr } = await anonClient.rpc('verify_password_reset_token', {
      p_token: token,
    });
    if (vErr || !vData?.valid) {
      throw new Error(`[Iter ${i}] verify token failed: ${vErr?.message || vData?.error}`);
    }

    // C. Complete password reset RPC
    const { data: compData, error: compErr } = await anonClient.rpc('complete_password_reset', {
      p_token: token,
      p_new_password: newPassword,
    });
    if (compErr || !compData?.success) {
      throw new Error(`[Iter ${i}] complete reset failed: ${compErr?.message || compData?.error}`);
    }

    // D. Admin sync
    const { error: aSyncErr } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
      email_confirm: true,
    });
    if (aSyncErr) {
      throw new Error(`[Iter ${i}] admin sync failed: ${aSyncErr.message}`);
    }

    // E. Verify login with new password
    const { data: sData, error: sErr } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: newPassword,
    });
    if (sErr || !sData.user) {
      throw new Error(`[Iter ${i}] sign in failed: ${sErr?.message}`);
    }

    // F. Verify old password is now rejected
    const { error: oldPassErr } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: currentPassword,
    });
    if (!oldPassErr) {
      throw new Error(`[Iter ${i}] CRITICAL: Old password was still accepted!`);
    }

    console.log(` Iteration ${i} PASSED: Password changed & verified, old password rejected.`);
    currentPassword = newPassword;
  }

  // Cleanup
  await adminClient.auth.admin.deleteUser(userId);
  console.log('\nCleaned up stress test user.');
  console.log(`\n====================================================`);
  console.log(`ALL ${iterations} CONSECUTIVE ITERATIONS COMPLETED WITH ZERO ERRORS!`);
  console.log(`====================================================\n`);
}

runMultiIterationStressLoop(5).catch((err) => {
  console.error('\n❌ STRESS TEST FAILED:', err);
  process.exit(1);
});
