const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking Property_Sales...');
  const { data: sales, error: salesError } = await supabase.from('Property_Sales').select('*').limit(5);
  if (salesError) console.error('Sales Error:', salesError);
  else console.log('Sales:', sales);

  console.log('\nChecking property_sales (lowercase)...');
  const { data: salesLower, error: salesLowerError } = await supabase.from('property_sales').select('*').limit(5);
  if (salesLowerError) console.error('Sales Lower Error:', salesLowerError);
  else console.log('Sales Lower:', salesLower);

  console.log('\nChecking Property_Rentals...');
  const { data: rentals, error: rentalsError } = await supabase.from('Property_Rentals').select('*').limit(5);
  if (rentalsError) console.error('Rentals Error:', rentalsError);
  else console.log('Rentals:', rentals);

  console.log('\nChecking Property_Photos...');
  const { data: photos, error: photosError } = await supabase.from('Property_Photos').select('*').limit(5);
  if (photosError) console.error('Photos Error:', photosError);
  else console.log('Photos:', photos);
  
  console.log('\nChecking property_photos (lowercase)...');
  const { data: photosLower, error: photosLowerError } = await supabase.from('property_photos').select('*').limit(5);
  if (photosLowerError) console.error('Photos Lower Error:', photosLowerError);
  else console.log('Photos Lower:', photosLower);
}

check();
