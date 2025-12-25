// Script to register the initial admin user
// Run this once to create the admin account

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function registerAdmin() {
    console.log('Registering admin user...');

    const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: {
            action: 'register',
            email: 'ryanbigbang15@gmail.com',
            password: 'myye65402086',
            name: 'Alfie'
        }
    });

    if (error) {
        console.error('Failed to register admin:', error);
        process.exit(1);
    }

    if (data?.error) {
        if (data.error === 'Admin already exists') {
            console.log('✅ Admin user already exists, no action needed');
        } else {
            console.error('Registration error:', data.error);
            process.exit(1);
        }
    } else if (data?.success) {
        console.log('✅ Admin registered successfully!');
        console.log('   Email:', data.admin.email);
        console.log('   Name:', data.admin.name);
        console.log('   ID:', data.admin.id);
    }
}

registerAdmin().catch(console.error);
