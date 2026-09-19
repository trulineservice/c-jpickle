import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wfvxznvpjjgnjhvukqcp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setTestingRates() {
  console.log('Updating Events Place & View Deck hourly rates to ₱1.00 PHP for testing...');

  const { data, error } = await supabase
    .from('courts')
    .update({ hourly_rate: 1.00 })
    .or('name.ilike.%Events Place%,name.ilike.%View Deck%')
    .select('id, name, hourly_rate');

  if (error) {
    console.error('Error updating rates:', error);
    process.exit(1);
  }

  console.log('Successfully updated court rates for testing:');
  console.log(data);
}

setTestingRates();
