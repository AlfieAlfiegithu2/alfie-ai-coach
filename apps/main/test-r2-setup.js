// Test R2 Setup - Run this to verify your configuration
// This script tests if your R2 setup is working correctly

const testR2Setup = async () => {
  console.log('🧪 Testing R2 Setup...\n');

  // Test 1: Check if R2 functions are accessible
  console.log('1️⃣ Testing R2 Upload Function...');
  try {
    const response = await fetch('/api/r2-upload', {
      method: 'POST',
      body: new FormData() // Empty test
    });
    
    if (response.status === 400) {
      console.log('✅ R2 Upload function is accessible (400 = missing file, which is expected)');
    } else {
      console.log(`⚠️  R2 Upload function returned: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ R2 Upload function not accessible:', error.message);
  }

  // Test 2: Check if R2 Delete function is accessible
  console.log('\n2️⃣ Testing R2 Delete Function...');
  try {
    const response = await fetch('/api/r2-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'test' })
    });
    
    if (response.status === 200 || response.status === 404) {
      console.log('✅ R2 Delete function is accessible');
    } else {
      console.log(`⚠️  R2 Delete function returned: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ R2 Delete function not accessible:', error.message);
  }

  // Test 3: Check if R2 List function is accessible
  console.log('\n3️⃣ Testing R2 List Function...');
  try {
    const response = await fetch('/api/r2-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: 'test' })
    });
    
    if (response.status === 200) {
      console.log('✅ R2 List function is accessible');
    } else {
      console.log(`⚠️  R2 List function returned: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ R2 List function not accessible:', error.message);
  }

  // Test 4: Check if Migration function is accessible
  console.log('\n4️⃣ Testing Migration Function...');
  try {
    const response = await fetch('/api/migrate-to-r2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketName: 'test', dryRun: true })
    });
    
    if (response.status === 200 || response.status === 400) {
      console.log('✅ Migration function is accessible');
    } else {
      console.log(`⚠️  Migration function returned: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Migration function not accessible:', error.message);
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Deploy the updated elevenlabs-voice function');
  console.log('2. Test audio generation to ensure it uses R2');
  console.log('3. Monitor your Supabase egress - it should drop to near zero!');
  console.log('\n💰 Expected Results:');
  console.log('- Egress should drop from 37GB+ to ~0GB');
  console.log('- Cost savings: $90+ per month');
  console.log('- All audio files served from R2 (zero egress)');
};

// Run the test
testR2Setup().catch(console.error);
