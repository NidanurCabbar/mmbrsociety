import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import Iyzipay from 'npm:iyzipay';

const app = new Hono();

app.use('*', cors({
  origin: [
    'https://mmbrsociety.com',
    'https://www.mmbrsociety.com',
    'https://mmbrsociety.vercel.app',  // Vercel preview
    'http://localhost:5173',           // Lokal geliştirme (Vite default)
    'http://localhost:4173',           // Lokal preview (vite preview)
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use('*', logger(console.log));

// ===== RATE LIMITER =====
// Not: Edge Function tek instance üzerinde çalışır; memory-based limiter bu trafik hacmi için yeterlidir.
interface RateLimitEntry { count: number; resetAt: number; }
const rateLimitStore = new Map<string, RateLimitEntry>();

// Süresi dolmuş kayıtları 5 dakikada bir temizle (memory leak önlemi)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

function rateLimit(id: string, max: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(id);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(id, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

function getClientIP(c: any): string {
  return (
    c.req.header('CF-Connecting-IP') ||          // Cloudflare
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    c.req.header('X-Real-IP') ||
    'unknown'
  );
}
// ===== /RATE LIMITER =====

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Initialize admin accounts on server startup
async function initializeAdminAccount() {
  try {
    console.log('🔐 Starting admin account initialization...');
    
    // Test Supabase connection first
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return;
    }

    // Add timeout to listing users (30 seconds max - increased for reliability)
    const listUsersPromise = supabase.auth.admin.listUsers();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Admin initialization timeout - Supabase taking too long')), 30000)
    );

    let result;
    try {
      result = await Promise.race([
        listUsersPromise,
        timeoutPromise
      ]);
    } catch (timeoutError) {
      console.error('⏱️ Timeout while connecting to Supabase:', timeoutError);
      console.log('⚠️ Supabase connection timeout. Server will continue without admin init.');
      return;
    }

    const { data: existingUsers, error: listError } = result as any;
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      console.log('⚠️ Supabase may be temporarily unavailable. Continuing server startup...');
      return;
    }
    
    console.log(`📋 Found ${existingUsers?.users?.length || 0} existing users`);
    
    // Define admin accounts to check/create
    const adminAccounts = [
      {
        email: 'sahin@mmbrsociety.com',
        password: 'admin_sahaner7894',
        name: 'Şahin Şahaner',
        phone: 'Admin User'
      }
    ];
    
    // Define old admin accounts to convert to regular users
    const oldAdminAccountsToConvert = [
      'mmbr.ship@mmbr.org.tr',
      'kadriyenidanurc@gmail.com',
      'erenguven@gmail.com',
      'deniz.kaya@mmbr.org.tr'
    ];

    console.log('🎯 Processing admin accounts...');
    
    // First, convert old admin accounts to regular users
    console.log('🔄 Converting old admin accounts to regular users...');
    for (const oldAdminEmail of oldAdminAccountsToConvert) {
      try {
        const oldAdmin = existingUsers.users.find(user => user.email === oldAdminEmail);
        if (oldAdmin && (oldAdmin.user_metadata?.role === 'admin' || oldAdmin.app_metadata?.role === 'admin')) {
          console.log(`🔄 Converting ${oldAdminEmail} from admin to user...`);
          const { error: updateError } = await supabase.auth.admin.updateUserById(oldAdmin.id, {
            user_metadata: {
              ...oldAdmin.user_metadata,
              role: 'user'
            },
            app_metadata: { role: 'user' }
          });
          
          if (updateError) {
            console.error(`❌ Error converting ${oldAdminEmail}:`, updateError);
          } else {
            console.log(`✅ Successfully converted ${oldAdminEmail} to regular user`);
          }
        } else if (oldAdmin) {
          console.log(`ℹ️ ${oldAdminEmail} already a regular user`);
        } else {
          console.log(`ℹ️ ${oldAdminEmail} not found in database`);
        }
      } catch (error) {
        console.error(`💥 Error processing ${oldAdminEmail}:`, error);
      }
    }

    for (const adminAccount of adminAccounts) {
      try {
        console.log(`\n🔍 Processing: ${adminAccount.email}`);
        const existingUser = existingUsers.users.find(user => user.email === adminAccount.email);
      
      if (!existingUser) {
        console.log(`🆕 Creating new admin account for: ${adminAccount.email}`);
        
        const { data, error } = await supabase.auth.admin.createUser({
          email: adminAccount.email,
          password: adminAccount.password,
          user_metadata: {
            name: adminAccount.name,
            phone: adminAccount.phone
          },
          app_metadata: { role: 'admin' },
          email_confirm: true
        });

        if (error) {
          const errorMsg = error.message?.toLowerCase() || '';
          if (errorMsg.includes('already registered') || 
              errorMsg.includes('email_exists') || 
              errorMsg.includes('user already registered') ||
              errorMsg.includes('database error') ||
              error.code === 'email_exists') {
            console.log(`ℹ️ Admin account already exists or database constraint: ${adminAccount.email}`);
          } else {
            console.error(`❌ Error creating admin account ${adminAccount.email}:`, {
              message: error.message,
              code: error.code,
              status: error.status
            });
          }
        } else {
          console.log(`✅ Admin account created successfully:`, {
            email: data.user?.email,
            id: data.user?.id,
            name: data.user?.user_metadata?.name,
            role: data.user?.user_metadata?.role
          });
        }
      } else {
        console.log(`✅ Admin account already exists: ${adminAccount.email}`);
        console.log(`📊 Existing user data:`, {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.user_metadata?.role,
          name: existingUser.user_metadata?.name,
          metadata: existingUser.user_metadata
        });
        
        // Always update metadata to ensure consistency
        console.log(`🔄 Updating/ensuring admin metadata for: ${adminAccount.email}`);
        const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
          user_metadata: {
            ...existingUser.user_metadata,
            name: adminAccount.name,
            phone: adminAccount.phone
          },
          app_metadata: { role: 'admin' }
        });
        
        if (updateError) {
          console.error(`❌ Error updating admin metadata for ${adminAccount.email}:`, updateError);
        } else {
          console.log(`✅ Admin metadata updated/confirmed for: ${adminAccount.email}`);
        }
      }
      } catch (accountError: any) {
        console.error(`💥 Error processing admin account ${adminAccount.email}:`, {
          message: accountError.message,
          name: accountError.name
        });
        console.log(`⏭️ Continuing to next admin account...`);
      }
    }
    
    console.log('\n🏁 Admin account initialization completed');
    
    // Verification step: List all users again to confirm
    try {
      const { data: finalUsers } = await supabase.auth.admin.listUsers();
      const adminUsers = finalUsers?.users?.filter(user => user.app_metadata?.role === 'admin') || [];
      
      console.log(`\n🎯 Verification - Found ${adminUsers.length} admin users:`);
      adminUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} - ${user.user_metadata?.name} (ID: ${user.id})`);
      });
    } catch (verifyError) {
      console.error('❌ Error during verification:', verifyError);
    }
    
  } catch (error) {
    console.warn('⚠️ Admin account initialization encountered an error:', {
      name: error?.name || 'Unknown',
      message: error?.message || 'No error message'
    });
    console.log('ℹ️ This is not critical - likely a temporary connection issue. Server will continue normally.');
  }
}

// Initialize admin account (non-blocking)
initializeAdminAccount().catch(error => {
  console.warn('⚠️ Admin account initialization failed, but server will continue. Check if Supabase is available.');
});

// Initialize storage bucket for events
async function initializeEventsBucket() {
  try {
    const bucketName = 'make-350bb6b2-events';
    console.log('Initializing events storage bucket...');
    
    // First, try to list buckets to check if it exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log('⚠️ Unable to list buckets (Supabase may be down):', listError.message);
      return;
    } else {
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      if (bucketExists) {
        const existingBucket = buckets.find(bucket => bucket.name === bucketName);
        console.log('✅ Events storage bucket already exists:', {
          name: existingBucket?.name,
          public: existingBucket?.public,
          created_at: existingBucket?.created_at
        });
        
        // ⚠️ CRITICAL: If bucket is public, warn about CORS issues
        if (existingBucket?.public) {
          console.log('⚠️ WARNING: Bucket is PUBLIC which may cause CORS issues!');
          console.log('💡 TIP: To fix CORS issues, delete the bucket in Supabase UI and restart the server');
          console.log('💡 Or manually change bucket to private in Supabase UI');
        } else {
          console.log('✅ Bucket is PRIVATE - using signed URLs (no CORS issues)');
        }
        
        return;
      } else {
        console.log('📋 Available buckets:', buckets?.map(b => ({ name: b.name, public: b.public })));
      }
    }

    // Try to create the bucket
    console.log('Creating events storage bucket...');
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: false, // ✅ PRIVATE bucket to avoid CORS issues - will use signed URLs
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
      fileSizeLimit: 10485760 // 10MB
    });
    
    if (createError) {
      // Check if the error is because bucket already exists (409 conflict)
      if (createError.message?.includes('already exists') || 
          createError.statusCode === '409' || 
          createError.status === 409) {
        console.log('✅ Events storage bucket already exists (confirmed via create attempt)');
        return;
      }
      
      // Log other errors but don't fail the initialization
      console.warn('⚠️ Error creating events bucket (non-critical):', createError);
    } else {
      console.log('✅ Events storage bucket created successfully');
    }
  } catch (error: any) {
    // Handle StorageApiError specifically
    if (error.name === 'StorageApiError' && (error.statusCode === '409' || error.status === 409)) {
      console.log('✅ Events storage bucket already exists (caught StorageApiError)');
      return;
    }
    
    // Log other errors but don't fail the server startup
    console.warn('⚠️ Error during events bucket initialization (non-critical):', error);
  }
}

// Initialize storage bucket (non-blocking)
initializeEventsBucket().catch(error => {
  console.warn('⚠️ Storage bucket initialization failed, but server will continue:', error);
});

// Local placeholder images (base64 data URLs)
const LOCAL_PLACEHOLDERS = {
  DJ_PERFORMANCE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWExYTFhO3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwYTBhMGE7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0idXJsKCNiZykiLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSIxNTAiIHI9IjUwIiBmaWxsPSIjYWQzMDJlIiBvcGFjaXR5PSIwLjgiLz4KICA8cmVjdCB4PSIxNTAiIHk9IjIyMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI0MCIgZmlsbD0iI2FkMzAyZSIgcng9IjUiLz4KICA8Y2lyY2xlIGN4PSIxNzAiIGN5PSIyNDAiIHI9IjgiIGZpbGw9IiNjZWFkODEiLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSIyNDAiIHI9IjgiIGZpbGw9IiNjZWFkODEiLz4KICA8Y2lyY2xlIGN4PSIyMzAiIGN5PSIyNDAiIHI9IjgiIGZpbGw9IiNjZWFkODEiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjMyMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjY2VhZDgxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ETCBQZXJmb3JtYW5jZTwvdGV4dD4KPC9zdmc+',
  CLUB_SCENE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iY2x1YmJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzBhMGEwYTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWExYTFhO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9InVybCgjY2x1YmJnKSIvPgogIDxyZWN0IHg9IjUwIiB5PSIzMDAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAiIGZpbGw9IiM1YTIzMjEiLz4KICA8Y2lyY2xlIGN4PSI4MCIgY3k9IjEwMCIgcj0iMyIgZmlsbD0iI2NlYWQ4MSIgb3BhY2l0eT0iMC44Ij4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9Im9wYWNpdHkiIHZhbHVlcz0iMC44OzAuMzswLjgiIGR1cj0iMnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+CiAgPC9jaXJjbGU+CiAgPGNpcmNsZSBjeD0iMzIwIiBjeT0iMTUwIiByPSIzIiBmaWxsPSIjY2VhZDgxIiBvcGFjaXR5PSIwLjYiPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0ib3BhY2l0eSIgdmFsdWVzPSIwLjY7MC4yOzAuNiIgZHVyPSIyLjVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIvPgogIDwvY2lyY2xlPgogIDxjaXJjbGUgY3g9IjIwMCIgY3k9IjgwIiByPSIyIiBmaWxsPSIjYWQzMDJlIiBvcGFjaXR5PSIwLjciPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0ib3BhY2l0eSIgdmFsdWVzPSIwLjc7MC00OzAuNyIgZHVyPSIxLjVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIvPgogIDwvY2lyY2xlPgogIDx0ZXh0IHg9IjIwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNhZDMwMmUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIj5NTUJSPC90ZXh0PgogIDx0ZXh0IHg9IjIwMCIgeT0iMzUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiNjZWFkODEiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkNsdWIgRXZlbnQ8L3RleHQ+Cjwvc3ZnPg==',
  TECHNO: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxyYWRpYWxHcmFkaWVudCBpZD0idGVjaG5vYmciIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjUwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxYTFhMWE7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzAwMDAwMDtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI3RlY2hub2JnKSIvPgogIDxyZWN0IHg9IjEwMCIgeT0iMTUwIiB3aWR0aD0iNDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjYWExOTE2IiBvcGFjaXR5PSIwLjgiLz4KICA8cmVjdCB4PSIxNTAiIHk9IjEyMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjEzMCIgZmlsbD0iI2FhMTkxNiIgb3BhY2l0eT0iMC42Ii8+CiAgPHJlY3QgeD0iMjAwIiB5PSIxMDAiIHdpZHRoPSI0MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNhYTE5MTYiIG9wYWNpdHk9IjAuOSIvPgogIDxyZWN0IHg9IjI1MCIgeT0iMTMwIiB3aWR0aD0iNDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjYWExOTE2IiBvcGFjaXR5PSIwLjciLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSI4MCIgcj0iMTUiIGZpbGw9IiNjZWFkODEiIG9wYWNpdHk9IjAuOCIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMzIwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiNjZWFkODEiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkVsZWN0cm9uaWMgTXVzaWM8L3RleHQ+Cjwvc3ZnPg==',
  UNDERGROUND: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0idW5kZXJncm91bmRiZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMDAwMDA7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzFhMWExYTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI3VuZGVyZ3JvdW5kYmcpIi8+CiAgPGNpcmNsZSBjeD0iMjAwIiBjeT0iMjAwIiByPSI4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNWEyMzIxIiBzdHJva2Utd2lkdGg9IjMiIG9wYWNpdHk9IjAuNiIvPgogIDxjaXJjbGUgY3g9IjIwMCIgY3k9IjIwMCIgcj0iNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2FkMzAyZSIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIwLjgiLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSIyMDAiIHI9IjEwIiBmaWxsPSIjY2VhZDgxIiBvcGFjaXR5PSIwLjkiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjMzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSIjY2VhZDgxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5VbmRlcmdyb3VuZCBTZXNzaW9uPC90ZXh0Pgo8L3N2Zz4=',
  DEFAULT: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZGVmYXVsdGJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzBhMGEwYTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWExYTFhO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9InVybCgjZGVmYXVsdGJnKSIvPgogIDxjaXJjbGUgY3g9IjIwMCIgY3k9IjE4MCIgcj0iNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2FkMzAyZSIgc3Ryb2tlLXdpZHRoPSI0IiBvcGFjaXR5PSIwLjciLz4KICA8cG9seWdvbiBwb2ludHM9IjE3MCwyMDAgMjMwLDIwMCAyMDAsMTUwIiBmaWxsPSIjY2VhZDgxIiBvcGFjaXR5PSIwLjgiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjI4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjYWQzMDJlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+TU1CUjwvdGV4dD4KICA8dGV4dCB4PSIyMDAiIHk9IjMzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSIjY2VhZDgxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5OaWdodCBDbHViIEV2ZW50PC90ZXh0Pgo8L3N2Zz4='
};

// Enhanced image validation utilities
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Check for common invalid URL patterns (enhanced)
  const invalidPatterns = [
    /google\.com\/imgres/i,
    /google\.com\/search/i,
    /bing\.com\/images/i,
    /yahoo\.com\/search/i,
    /pinterest\.com\/pin/i,
    /instagram\.com\/p/i,
    /facebook\.com\/photo/i,
    /imgurl=/i, // Google Images parameter
    /tbnid=/i,  // Google thumbnail ID
    /vet=/i,    // Google verification token
    /docid=/i,  // Google document ID
    /imgrefurl=/i, // Google image reference URL
    /&w=\d+&h=\d+/i, // Google Images width/height parameters
    /tbm=isch/i, // Google Images search
    /source=images/i // Image search source
  ];
  
  // Check if URL matches any invalid pattern
  for (const pattern of invalidPatterns) {
    if (pattern.test(url)) {
      console.warn('🚫 Invalid image URL detected:', url.substring(0, 80) + '...');
      return false;
    }
  }
  
  return true;
}

function shouldReplaceWithLocal(url: string): boolean {
  if (!url || typeof url !== 'string') return true;
  
  // Replace all external URLs with local placeholders for maximum reliability
  // Only allow data URLs and Supabase storage URLs (including signed URLs with tokens)
  const allowedPatterns = [
    /^data:image\//i,
    /supabase\.co.*\/storage\/v1\//i,  // Supabase Storage URLs
    /make-350bb6b2-events/i             // Our bucket name (in signed URLs)
  ];
  
  for (const pattern of allowedPatterns) {
    if (pattern.test(url)) {
      console.log('✅ ALLOWED URL (keeping as-is):', url.substring(0, 80) + '...');
      return false; // Don't replace these URLs
    }
  }
  
  console.log('🔄 External URL detected, will replace with local placeholder:', url.substring(0, 60) + '...');
  return true; // Replace all other URLs
}

function getLocalPlaceholderForEvent(eventTitle: string = ''): string {
  const keywords = eventTitle.toLowerCase();
  
  if (keywords.includes('aoki') || keywords.includes('steve') || keywords.includes('dj') || keywords.includes('performance')) {
    return LOCAL_PLACEHOLDERS.DJ_PERFORMANCE;
  } else if (keywords.includes('techno') || keywords.includes('electronic') || keywords.includes('minimal')) {
    return LOCAL_PLACEHOLDERS.TECHNO;
  } else if (keywords.includes('underground')) {
    return LOCAL_PLACEHOLDERS.UNDERGROUND;
  } else if (keywords.includes('house') || keywords.includes('deep') || keywords.includes('club')) {
    return LOCAL_PLACEHOLDERS.CLUB_SCENE;
  }
  
  // Default to DJ performance for most events
  return LOCAL_PLACEHOLDERS.DJ_PERFORMANCE;
}

// NUCLEAR OPTION: Force replace ALL external images with local placeholders
async function forceReplaceAllExternalImages() {
  try {
    console.log('🚨 NUCLEAR OPTION: Replacing ALL external images with local placeholders...');
    
    const events = await kv.getByPrefix('event_');
    let processedCount = 0;
    let replacedCount = 0;
    
    for (const event of events) {
      processedCount++;
      
      if (event.image && shouldReplaceWithLocal(event.image)) {
        const oldImage = event.image;
        const newPlaceholder = getLocalPlaceholderForEvent(event.title || '');
        
        console.log(`🔄 NUCLEAR REPLACE [${processedCount}/${events.length}]:`, {
          title: event.title,
          oldImage: oldImage.substring(0, 60) + '...',
          newImage: 'LOCAL_PLACEHOLDER'
        });
        
        event.image = newPlaceholder;
        event.updatedAt = new Date().toISOString();
        event.nuclearReplacedAt = new Date().toISOString();
        event.replacementReason = 'nuclear_external_to_local';
        
        await kv.set(event.id, event);
        replacedCount++;
      } else if (event.image) {
        console.log(`✅ KEEPING [${processedCount}/${events.length}]:`, {
          title: event.title,
          image: event.image.substring(0, 60) + '...',
          reason: 'allowed_url_pattern'
        });
      } else {
        console.log(`⚠️ NO IMAGE [${processedCount}/${events.length}]:`, {
          title: event.title
        });
        
        // Add default placeholder for events without images
        const newPlaceholder = getLocalPlaceholderForEvent(event.title || '');
        event.image = newPlaceholder;
        event.updatedAt = new Date().toISOString();
        event.addedPlaceholderAt = new Date().toISOString();
        
        await kv.set(event.id, event);
        replacedCount++;
      }
    }
    
    console.log(`🚨 NUCLEAR REPLACEMENT COMPLETED: ${replacedCount}/${processedCount} events replaced with local placeholders`);
    
  } catch (error) {
    console.error('💥 NUCLEAR REPLACEMENT ERROR:', error);
  }
}

// Run NUCLEAR replacement in background (non-blocking) - delayed to allow health check
// ⚠️ DISABLED: We now support Supabase Storage signed URLs, so no need to replace them
console.log('🚀 Server starting - NUCLEAR replacement DISABLED (Supabase Storage URLs now supported)');

// setTimeout(() => {
//   forceReplaceAllExternalImages().then(() => {
//     console.log('✅ Background nuclear replacement completed');
//   }).catch(error => {
//     console.error('❌ Background nuclear replacement failed:', error);
//   });
// }, 5000); // Wait 5 seconds after server start to allow health check to work

// Health check endpoint - ultra-fast response
app.get('/make-server-350bb6b2/health', (c) => {
  console.log('🏥 Health check requested');
  
  const response = { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'make-server-350bb6b2',
    ready: true
  };
  
  console.log('✅ Health check response ready');
  return c.json(response);
});

// Manual admin account creation endpoint (requires existing admin JWT)
app.post('/make-server-350bb6b2/auth/create-admin', async (c) => {
  try {
    // Require valid admin JWT
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) return c.json({ error: 'Unauthorized' }, 401);
    const { data: { user: requester }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !requester?.id) return c.json({ error: 'Unauthorized' }, 401);
    if (requester.app_metadata?.role !== 'admin') return c.json({ error: 'Admin access required' }, 403);

    const { email, password, name } = await c.req.json();

    console.log(`🔧 Manual admin creation for: ${email} (requested by: ${requester.email})`);
    
    // Delete any existing user with this email first
    try {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);
      
      if (existingUser) {
        console.log(`🗑️ Deleting existing user: ${email}`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
        if (deleteError) {
          console.warn('⚠️ Error deleting existing user (continuing anyway):', deleteError);
        } else {
          console.log(`✅ Existing user deleted: ${email}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error checking/deleting existing user:', error);
    }
    
    // Create fresh admin account
    console.log(`🆕 Creating fresh admin account: ${email}`);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name: name || 'Admin User',
        phone: 'Manual Creation'
      },
      app_metadata: { role: 'admin' },
      email_confirm: true
    });

    if (error) {
      console.error(`❌ Error creating admin:`, error);
      return c.json({ 
        error: 'Admin creation failed',
        details: {
          message: error.message,
          code: error.code,
          status: error.status
        }
      }, 400);
    }

    console.log(`✅ Admin created successfully:`, {
      email: data.user?.email,
      id: data.user?.id,
      name: data.user?.user_metadata?.name,
      role: data.user?.user_metadata?.role,
      metadata: data.user?.user_metadata
    });

    // Test immediate login
    const testSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    const { data: signInData, error: signInError } = await testSupabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      console.error(`❌ Immediate login test failed:`, signInError);
      return c.json({ 
        success: true,
        user: data.user,
        message: 'Admin created but immediate login failed',
        login_error: signInError.message
      });
    }

    console.log(`✅ Immediate login test successful`);
    
    return c.json({ 
      success: true,
      user: data.user,
      message: 'Admin created and login tested successfully',
      login_test: 'passed'
    });
    
  } catch (error) {
    console.error('💥 Manual admin creation error:', error);
    return c.json({ error: 'Server error during admin creation', details: error.message }, 500);
  }
});

// Test admin credentials endpoint (admin only)
app.post('/make-server-350bb6b2/auth/test-admin', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) return c.json({ error: 'Unauthorized' }, 401);
    const { data: { user: requester }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !requester?.id || requester.app_metadata?.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { email, password } = await c.req.json();
    
    console.log(`🧪 Testing admin credentials for: ${email}`);
    
    // List all users to check
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return c.json({ error: 'Error checking users', details: listError.message }, 500);
    }
    
    const user = allUsers?.users?.find(u => u.email === email);
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return c.json({ error: 'User not found' }, 404);
    }
    
    console.log(`✅ User found:`, {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role,
      name: user.user_metadata?.name,
      metadata: user.user_metadata,
      created_at: user.created_at,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at
    });
    
    // Try to sign in
    const testSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    const { data: signInData, error: signInError } = await testSupabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      console.error(`❌ Sign in failed for ${email}:`, {
        message: signInError.message,
        code: signInError.code,
        status: signInError.status
      });
      
      return c.json({ 
        error: 'Sign in failed',
        details: {
          message: signInError.message,
          code: signInError.code,
          user_exists: true,
          user_metadata: user.user_metadata,
          email_confirmed: !!user.email_confirmed_at,
          suggestion: 'Try recreating the admin account'
        }
      }, 400);
    }
    
    console.log(`✅ Sign in successful for ${email}:`, {
      session_user_id: signInData.user?.id,
      session_user_email: signInData.user?.email,
      session_user_metadata: signInData.user?.user_metadata,
      access_token_preview: signInData.session?.access_token?.substring(0, 20) + '...'
    });
    
    return c.json({ 
      success: true,
      message: 'Admin credentials test successful',
      user: {
        id: signInData.user?.id,
        email: signInData.user?.email,
        name: signInData.user?.user_metadata?.name,
        role: signInData.user?.user_metadata?.role,
        metadata: signInData.user?.user_metadata
      }
    });
    
  } catch (error) {
    console.error('💥 Test admin credentials error:', error);
    return c.json({ error: 'Server error during test', details: error.message }, 500);
  }
});



// User registration
app.post('/make-server-350bb6b2/auth/signup', async (c) => {
  try {
    // Rate limit: IP başına 15 dakikada max 5 kayıt
    const ip = getClientIP(c);
    const rl = rateLimit(`signup:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return c.json({ error: `Çok fazla kayıt denemesi. ${rl.retryAfter} saniye sonra tekrar deneyin.` }, 429);
    }

    const { email, password, name } = await c.req.json();
    // Role is always forced to 'user' — admin creation goes through admin API only
    
    // Validate input
    if (!email || !password || !name) {
      return c.json({ error: 'E-posta, şifre ve isim alanları gereklidir' }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ error: 'Şifre en az 6 karakter olmalıdır' }, 400);
    }
    
    // Check if user already exists
    try {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(user => user.email === email);
      if (existingUser) {
        console.log('User already exists:', email);
        return c.json({ 
          error: 'Bu e-posta adresi zaten kayıtlı'
        }, 409);
      }
    } catch (listError) {
      console.log('Error checking existing users:', listError);
    }
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      app_metadata: { role: 'user' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('User registration error:', error);
      
      let errorMessage = error.message;
      if (error.message?.includes('User already registered')) {
        errorMessage = 'Bu e-posta adresi zaten kayıtlı';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Şifre en az 6 karakter olmalıdır';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Geçerli bir e-posta adresi girin';
      }
      
      return c.json({ error: errorMessage }, 400);
    }

    console.log('🎉 User created successfully:', {
      id: data.user?.id,
      email: data.user?.email,
      name: data.user?.user_metadata?.name,
      role: data.user?.user_metadata?.role,
      fullMetadata: data.user?.user_metadata,
      rawMetadata: JSON.stringify(data.user?.user_metadata, null, 2),
      inputName: name,
      inputRole: role
    });

    return c.json({ 
      success: true,
      user: data.user,
      message: 'Hesabınız başarıyla oluşturuldu'
    });
  } catch (error) {
    console.log('Signup server error:', error);
    return c.json({ error: 'Hesap oluşturulurken bir hata oluştu' }, 500);
  }
});

// Save reservation
app.post('/make-server-350bb6b2/reservations', async (c) => {
  try {
    // Rate limit: IP başına saatte max 10 rezervasyon
    const ip = getClientIP(c);
    const rl = rateLimit(`reservation:${ip}`, 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      return c.json({ error: `Çok fazla rezervasyon isteği. ${rl.retryAfter} saniye sonra tekrar deneyin.` }, 429);
    }

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    let userId = null;
    
    // Check if user is authenticated (optional for reservations)
    if (accessToken && accessToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id;
    }

    const reservationData = await c.req.json();
    
    // ✅ REZERVASYON TİPİ KONTROLÜ: Ayakta ve Özel Masa için kapasite kontrolü
    const reservationType = reservationData.reservationType || 'table';
    
    if (reservationType === 'standing' || reservationType === 'special') {
      const allReservations = await kv.getByPrefix('reservation_');
      
      // Aynı tarih ve saat için rezervasyonları filtrele (pending ve confirmed)
      const sameDateTime = allReservations.filter(res => 
        res.date === reservationData.date &&
        res.time === reservationData.time &&
        (res.status === 'pending' || res.status === 'confirmed')
      );
      
      if (reservationType === 'standing') {
        // Ayakta rezervasyon sayısını kontrol et (max 20)
        const standingReservations = sameDateTime.filter(res => res.reservationType === 'standing');
        
        if (standingReservations.length >= 20) {
          console.log('❌ Standing reservation capacity full:', {
            date: reservationData.date,
            time: reservationData.time,
            currentCount: standingReservations.length
          });
          
          return c.json({ 
            error: 'Ayakta rezervasyon kapasitesi dolmuştur. Lütfen farklı bir saat veya masa rezervasyonu seçin.',
            conflictType: 'standing_capacity_full',
            conflictDetails: {
              date: reservationData.date,
              time: reservationData.time,
              currentCount: standingReservations.length,
              maxCapacity: 20
            }
          }, 409); // 409 Conflict
        }
      } else if (reservationType === 'special') {
        // Özel masa rezervasyonunu kontrol et (max 1)
        const specialReservation = sameDateTime.find(res => res.reservationType === 'special');
        
        if (specialReservation) {
          console.log('❌ Special table already reserved:', {
            date: reservationData.date,
            time: reservationData.time,
            existingReservation: specialReservation.id
          });
          
          return c.json({ 
            error: 'Özel masa bu tarih ve saatte zaten rezerve edilmiş. Lütfen farklı bir saat veya masa rezervasyonu seçin.',
            conflictType: 'special_table_taken',
            conflictDetails: {
              date: reservationData.date,
              time: reservationData.time,
              reservedBy: specialReservation.name
            }
          }, 409); // 409 Conflict
        }
      }
    }
    
    // ✅ ÇAKIŞMA KONTROLÜ: Aynı tarih, saat ve masaya başka rezervasyon var mı? (Sadece normal masa rezervasyonları için)
    if (reservationType === 'table' && reservationData.table && reservationData.date && reservationData.time) {
      const allReservations = await kv.getByPrefix('reservation_');
      
      // Sadece pending ve confirmed rezervasyonları kontrol et (cancelled hariç)
      const conflictingReservation = allReservations.find(res => 
        res.date === reservationData.date &&
        res.time === reservationData.time &&
        res.table?.name === reservationData.table.name &&
        (res.status === 'pending' || res.status === 'confirmed')
      );
      
      if (conflictingReservation) {
        console.log('❌ Reservation conflict detected:', {
          date: reservationData.date,
          time: reservationData.time,
          table: reservationData.table.name,
          existingReservation: conflictingReservation.id
        });
        
        return c.json({ 
          error: 'Bu masa, seçtiğiniz tarih ve saatte zaten rezerve edilmiş. Lütfen farklı bir masa veya zaman seçin.',
          conflictType: 'table_occupied',
          conflictDetails: {
            date: reservationData.date,
            time: reservationData.time,
            tableName: reservationData.table.name
          }
        }, 409); // 409 Conflict
      }
    }
    
    const reservationId = `reservation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract and structure the reservation data properly
    const reservation = {
      id: reservationId,
      userId,
      // Reservation type (NEW FIELD)
      reservationType: reservationType,
      // Customer info
      name: reservationData.customerInfo?.name || '',
      email: reservationData.customerInfo?.email || '',
      phone: reservationData.customerInfo?.phone || '',
      specialRequests: reservationData.customerInfo?.specialRequests || '',
      // Reservation details
      date: reservationData.date,
      time: reservationData.time,
      partySize: reservationData.guestCount || 2,
      // Table info (if selected)
      table: reservationData.table ? {
        name: reservationData.table.name,
        type: reservationData.table.type,
        capacity: reservationData.table.capacity,
        price: reservationData.table.price
      } : null,
      // Event info (if from event reservation)
      eventInfo: reservationData.eventInfo || null,
      // System fields
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    await kv.set(reservationId, reservation);
    
    console.log('✅ Reservation saved:', {
      id: reservationId,
      name: reservation.name,
      date: reservation.date,
      time: reservation.time,
      type: reservation.reservationType,
      table: reservation.table?.name,
      event: reservation.eventInfo?.eventTitle
    });
    
    return c.json({ success: true, reservationId, reservation });
  } catch (error) {
    console.log('Reservation save error:', error);
    return c.json({ error: 'Error saving reservation' }, 500);
  }
});

// Get occupied tables for a specific date and time
app.post('/make-server-350bb6b2/reservations/occupied-tables', async (c) => {
  try {
    const { date, time } = await c.req.json();
    
    if (!date || !time) {
      return c.json({ error: 'Date and time are required' }, 400);
    }
    
    const allReservations = await kv.getByPrefix('reservation_');
    
    // Filter reservations for the specific date and time (only pending and confirmed)
    const dateTimeReservations = allReservations.filter(res => 
      res.date === date &&
      res.time === time &&
      (res.status === 'pending' || res.status === 'confirmed')
    );
    
    // Get occupied table names (for normal table reservations)
    const occupiedTables = dateTimeReservations
      .filter(res => res.table?.name)
      .map(res => res.table.name);
    
    // Count standing reservations
    const standingCount = dateTimeReservations.filter(res => res.reservationType === 'standing').length;
    
    // Check if special table is taken
    const specialTaken = dateTimeReservations.some(res => res.reservationType === 'special');
    
    console.log('📋 Reservation status for', date, time, ':', {
      occupiedTables,
      standingCount,
      specialTaken
    });
    
    return c.json({ 
      occupiedTables,
      standingCount,
      specialTaken
    });
  } catch (error) {
    console.log('Get occupied tables error:', error);
    return c.json({ error: 'Error fetching occupied tables' }, 500);
  }
});

// Get user reservations
app.get('/make-server-350bb6b2/reservations/my', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allReservations = await kv.getByPrefix('reservation_');
    const userReservations = allReservations.filter(res => res.userId === user.id);
    
    // Separate past and active/future reservations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeReservations = [];
    const pastReservations = [];
    
    userReservations.forEach(res => {
      const resDate = new Date(res.date);
      resDate.setHours(0, 0, 0, 0);
      
      if (resDate >= today) {
        activeReservations.push(res);
      } else {
        pastReservations.push(res);
      }
    });
    
    // Sort both by date (newest first)
    activeReservations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    pastReservations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return c.json({ 
      reservations: activeReservations,
      pastReservations: pastReservations
    });
  } catch (error) {
    console.log('Get user reservations error:', error);
    return c.json({ error: 'Error fetching reservations' }, 500);
  }
});

// Get all reservations (admin only)
app.get('/make-server-350bb6b2/reservations', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    
    if (!isAdmin) {
      console.log(`Admin access denied for user ${user.email} with role: ${user.user_metadata?.role}`);
      return c.json({ error: 'Admin access required' }, 403);
    }

    const reservations = await kv.getByPrefix('reservation_');
    
    // Filter only current and future reservations for admin
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const activeReservations = reservations.filter(res => {
      const resDate = new Date(res.date);
      resDate.setHours(0, 0, 0, 0);
      return resDate >= today; // Only today and future dates
    });
    
    activeReservations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return c.json({ reservations: activeReservations });
  } catch (error) {
    console.log('Get reservations error:', error);
    return c.json({ error: 'Error fetching reservations' }, 500);
  }
});

// Update reservation status (admin only)
app.patch('/make-server-350bb6b2/reservations/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const reservationId = c.req.param('id');
    const { status } = await c.req.json();
    
    const reservation = await kv.get(reservationId);
    if (!reservation) {
      return c.json({ error: 'Reservation not found' }, 404);
    }

    const updatedReservation = { ...reservation, status, updated_at: new Date().toISOString() };
    await kv.set(reservationId, updatedReservation);
    
    return c.json({ success: true, reservation: updatedReservation });
  } catch (error) {
    console.log('Update reservation status error:', error);
    return c.json({ error: 'Error updating reservation status' }, 500);
  }
});

// Delete reservation (admin only)
app.delete('/make-server-350bb6b2/reservations/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const reservationId = c.req.param('id');
    await kv.del(reservationId);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Delete reservation error:', error);
    return c.json({ error: 'Error deleting reservation' }, 500);
  }
});

// Save contact message
app.post('/make-server-350bb6b2/messages', async (c) => {
  try {
    // Rate limit: IP başına saatte max 5 mesaj (iletişim formu spam koruması)
    const ip = getClientIP(c);
    const rl = rateLimit(`message:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return c.json({ error: `Çok fazla mesaj gönderdiniz. ${rl.retryAfter} saniye sonra tekrar deneyin.` }, 429);
    }

    const messageData = await c.req.json();
    const messageId = `message_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const message = {
      id: messageId,
      ...messageData,
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    await kv.set(messageId, message);
    
    return c.json({ success: true, messageId });
  } catch (error) {
    console.log('Message save error:', error);
    return c.json({ error: 'Error saving message' }, 500);
  }
});

// Get all messages (admin only)
app.get('/make-server-350bb6b2/messages', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    // Handle Supabase auth errors gracefully
    let user;
    try {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (error) throw error;
      user = data.user;
    } catch (authError) {
      console.error('⚠️ Auth error (Supabase may be down):', authError?.message?.substring(0, 100));
      return c.json({ error: 'Authentication service unavailable', messages: [] }, 503);
    }
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    
    if (!isAdmin) {
      console.log(`Admin access denied for user ${user.email} with role: ${user.user_metadata?.role}`);
      return c.json({ error: 'Admin access required' }, 403);
    }

    // Handle KV errors gracefully
    let messages = [];
    try {
      messages = await kv.getByPrefix('message_');
      if (Array.isArray(messages)) {
        messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    } catch (kvError) {
      console.error('⚠️ KV storage error:', kvError?.message?.substring(0, 100));
      return c.json({ messages: [], error: 'Database temporarily unavailable' }, 503);
    }
    
    return c.json({ messages });
  } catch (error) {
    console.log('Get messages error:', error?.message?.substring(0, 100));
    return c.json({ error: 'Service temporarily unavailable', messages: [] }, 503);
  }
});

// Get user's own messages
app.get('/make-server-350bb6b2/messages/my', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allMessages = await kv.getByPrefix('message_');
    const userMessages = allMessages.filter(msg => msg.email === user.email);
    userMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return c.json({ messages: userMessages });
  } catch (error) {
    console.log('Get user messages error:', error);
    return c.json({ error: 'Error fetching user messages' }, 500);
  }
});

// Update message status
app.patch('/make-server-350bb6b2/messages/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const messageId = c.req.param('id');
    const { status } = await c.req.json();
    
    const message = await kv.get(messageId);
    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }

    const updatedMessage = { ...message, status };
    await kv.set(messageId, updatedMessage);
    
    return c.json({ success: true, message: updatedMessage });
  } catch (error) {
    console.log('Update message status error:', error);
    return c.json({ error: 'Error updating message status' }, 500);
  }
});

// Save membership application
app.post('/make-server-350bb6b2/memberships', async (c) => {
  try {
    // Rate limit: IP başına 30 dakikada max 5 üyelik başvurusu
    const ip = getClientIP(c);
    const rl = rateLimit(`membership:${ip}`, 5, 30 * 60 * 1000);
    if (!rl.allowed) {
      return c.json({ error: `Çok fazla üyelik başvurusu. ${rl.retryAfter} saniye sonra tekrar deneyin.` }, 429);
    }

    const membershipData = await c.req.json();
    const membershipId = `membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const membership = {
      id: membershipId,
      ...membershipData,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    await kv.set(membershipId, membership);
    
    return c.json({ success: true, membershipId });
  } catch (error) {
    console.log('Membership save error:', error);
    return c.json({ error: 'Error saving membership application' }, 500);
  }
});

// Get all memberships (admin only)
app.get('/make-server-350bb6b2/memberships', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    
    if (!isAdmin) {
      console.log(`Admin access denied for user ${user.email} with role: ${user.user_metadata?.role}`);
      return c.json({ error: 'Admin access required' }, 403);
    }

    const memberships = await kv.getByPrefix('membership_');
    memberships.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({ memberships });
  } catch (error) {
    console.log('Get memberships error:', error);
    return c.json({ error: 'Error fetching memberships' }, 500);
  }
});

// Update membership status (admin only)
app.patch('/make-server-350bb6b2/memberships/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const membershipId = c.req.param('id');
    const { status } = await c.req.json();
    
    const membership = await kv.get(membershipId);
    if (!membership) {
      return c.json({ error: 'Membership not found' }, 404);
    }

    const updatedMembership = { ...membership, status, updated_at: new Date().toISOString() };
    await kv.set(membershipId, updatedMembership);
    
    return c.json({ success: true, membership: updatedMembership });
  } catch (error) {
    console.log('Update membership status error:', error);
    return c.json({ error: 'Error updating membership status' }, 500);
  }
});

// Validate reference code for membership (admin only)
app.post('/make-server-350bb6b2/memberships/:id/validate-reference', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const membershipId = c.req.param('id');
    const { referenceCode } = await c.req.json();
    
    const membership = await kv.get(membershipId);
    if (!membership) {
      return c.json({ error: 'Membership not found' }, 404);
    }

    // Geçerli referans kodları listesi
    const validReferenceCodes = ['MMBR2024', 'VIP2024', 'GOLD2024', 'FRIEND50', 'SPECIAL30'];
    const isValidCode = validReferenceCodes.includes(referenceCode.toUpperCase());

    const updatedMembership = { 
      ...membership, 
      referenceCodeValidated: isValidCode,
      referenceCodeValidatedAt: new Date().toISOString(),
      referenceCodeValidatedBy: user.email,
      updated_at: new Date().toISOString() 
    };
    
    await kv.set(membershipId, updatedMembership);
    
    return c.json({ 
      success: true, 
      membership: updatedMembership,
      isValidCode,
      message: isValidCode ? 'Referans kodu doğrulandı' : 'Geçersiz referans kodu'
    });
  } catch (error) {
    console.log('Validate reference code error:', error);
    return c.json({ error: 'Error validating reference code' }, 500);
  }
});

// Get events - ALL EXTERNAL IMAGES ALREADY REPLACED
app.get('/make-server-350bb6b2/events', async (c) => {
  try {
    console.log('📋 GET /events endpoint called');
    
    // Wrap KV call in try-catch to handle Supabase down gracefully
    let events;
    try {
      events = await kv.getByPrefix('event_');
      console.log(`📊 Found ${events?.length || 0} events in database`);
    } catch (kvError) {
      console.error('⚠️ KV storage error (Supabase may be down):', kvError?.message?.substring(0, 200));
      // Return empty array if database is unavailable
      return c.json({ events: [], message: 'Database temporarily unavailable' });
    }
    
    // Handle null/undefined case
    if (!events || !Array.isArray(events)) {
      console.log('⚠️ getByPrefix returned invalid data, returning empty array');
      return c.json({ events: [] });
    }
    
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log('📋 Sending events to frontend:', events.length, 'events');
    
    return c.json({ events });
  } catch (error) {
    console.error('❌ Get events error:', error?.message?.substring(0, 200));
    // Return empty array instead of error to prevent frontend from breaking
    console.log('📋 Returning empty events array due to error');
    return c.json({ events: [], message: 'Service temporarily unavailable' });
  }
});

// Save/Update event (admin only) - With automatic local placeholder assignment
app.post('/make-server-350bb6b2/events', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const eventData = await c.req.json();
    const eventId = eventData.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📥 === SAVING EVENT ===');
    console.log('Event ID:', eventId);
    console.log('Event Title:', eventData.title);
    console.log('Original Image URL (first 100 chars):', eventData.image?.substring(0, 100));
    console.log('Image URL full length:', eventData.image?.length);
    console.log('Is update?:', !!eventData.id);
    
    // ✅ NO REPLACEMENT: Just save the image URL as-is
    // Supabase Storage signed URLs are now fully supported
    let finalImageUrl = eventData.image;
    
    console.log('✅ Saving image URL as-is (Supabase Storage URLs supported):', {
      hasImage: !!finalImageUrl,
      imagePreview: finalImageUrl?.substring(0, 100) + '...'
    });
    
    const event = {
      id: eventId,
      ...eventData,
      image: finalImageUrl,
      updatedAt: new Date().toISOString()
    };
    
    console.log('💾 Final event data before save:', {
      id: eventId,
      title: eventData.title,
      hasImage: !!finalImageUrl,
      imageType: finalImageUrl?.startsWith('data:') ? 'base64' : 'url',
      imagePreview: finalImageUrl?.substring(0, 100) + '...'
    });

    if (!eventData.id) {
      event.createdAt = new Date().toISOString();
      event.status = 'active';
    }

    await kv.set(eventId, event);
    
    return c.json({ success: true, event });
  } catch (error) {
    console.log('Save event error:', error);
    return c.json({ error: 'Error saving event' }, 500);
  }
});

// Delete event (admin only)
app.delete('/make-server-350bb6b2/events/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const eventId = c.req.param('id');
    await kv.del(eventId);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Delete event error:', error);
    return c.json({ error: 'Error deleting event' }, 500);
  }
});

// Upload event image (admin only)
app.post('/make-server-350bb6b2/events/upload-image', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const formData = await c.req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    console.log('📤 Processing file upload:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Sadece PNG, JPEG ve GIF dosyaları desteklenmektedir' }, 400);
    }

    // Validate file size (10MB max)
    if (file.size > 10485760) {
      return c.json({ error: 'Dosya boyutu 10MB\'dan küçük olmalıdır' }, 400);
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    
    console.log('📂 Generated filename:', fileName);
    
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log('☁️ Uploading to Supabase Storage...');

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('make-350bb6b2-events')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('🚨 Upload error:', uploadError);
      
      // Provide more specific error messages
      if (uploadError.message?.includes('Bucket not found')) {
        return c.json({ error: 'Storage bucket bulunamadı. Admin ile iletişime geçin.' }, 500);
      } else if (uploadError.message?.includes('already exists')) {
        return c.json({ error: 'Bu dosya adı zaten kullanılıyor. Lütfen tekrar deneyin.' }, 409);
      } else if (uploadError.message?.includes('size')) {
        return c.json({ error: 'Dosya boyutu çok büyük. Maksimum 10MB yükleyebilirsiniz.' }, 413);
      } else {
        return c.json({ error: `Dosya yüklenirken hata oluştu: ${uploadError.message}` }, 500);
      }
    }

    console.log('✅ File uploaded successfully:', uploadData);

    // ⚠️ CRITICAL FIX: Use SIGNED URL instead of public URL to avoid CORS issues
    // Signed URLs work with private buckets and don't require CORS configuration
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('make-350bb6b2-events')
      .createSignedUrl(fileName, 31536000); // 1 year expiry (365 days)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('🚨 Signed URL error:', signedUrlError);
      return c.json({ error: 'Signed URL oluşturulamadı: ' + signedUrlError?.message }, 500);
    }

    console.log('🔗 Signed URL created successfully:', signedUrlData.signedUrl.substring(0, 80) + '...');
    console.log('📝 File name:', fileName);
    console.log('⏰ Expires in: 1 year');

    return c.json({ 
      success: true, 
      imageUrl: signedUrlData.signedUrl,
      fileName: fileName,
      urlType: 'signed',
      expiresIn: '1 year'
    });
  } catch (error) {
    console.error('💥 Upload server error:', error);
    return c.json({ error: 'Dosya yüklenirken sunucu hatası oluştu' }, 500);
  }
});

// Debug endpoint to check storage bucket status (admin only)
app.get('/make-server-350bb6b2/debug/storage', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const bucketName = 'make-350bb6b2-events';
    
    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    // List files in our bucket
    const { data: files, error: filesError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 10 });
    
    return c.json({
      buckets: buckets?.map(b => ({ name: b.name, public: b.public })),
      bucketExists: buckets?.some(bucket => bucket.name === bucketName),
      listError: listError?.message,
      files: files?.map(f => ({ name: f.name, size: f.metadata?.size })),
      filesError: filesError?.message,
      bucketName
    });
  } catch (error) {
    console.error('Debug storage error:', error);
    return c.json({ error: 'Debug error', details: error.message }, 500);
  }
});

// Debug endpoint to check events and their images (admin only)
app.get('/make-server-350bb6b2/debug/events', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (accessToken && accessToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (error || !user?.id || user.app_metadata?.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
      }
    } else {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const events = await kv.getByPrefix('event_');
    
    console.log('🐛 DEBUG: Events in database:', events.length);
    
    const eventSummary = events.map(event => ({
      id: event.id,
      title: event.title,
      hasImage: !!event.image,
      imageUrl: event.image?.includes('data:image') ? 'LOCAL_PLACEHOLDER' : event.image,
      isLocalPlaceholder: event.image?.includes('data:image'),
      imageLength: event.image?.length,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      nuclearReplacedAt: event.nuclearReplacedAt,
      replacementReason: event.replacementReason
    }));
    
    console.log('🐛 DEBUG: Event summary:', JSON.stringify(eventSummary, null, 2));
    
    return c.json({
      eventsCount: events.length,
      events: eventSummary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug events error:', error);
    return c.json({ error: 'Debug error', details: error.message }, 500);
  }
});

// Nuclear replacement endpoint (admin only)
app.post('/make-server-350bb6b2/debug/nuclear-replace', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    // Run nuclear replacement
    await forceReplaceAllExternalImages();
    
    return c.json({
      success: true,
      message: 'Nuclear replacement completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Nuclear replacement error:', error);
    return c.json({ error: 'Nuclear replacement error', details: error.message }, 500);
  }
});

// ==================== TABLE MANAGEMENT ENDPOINTS ====================

// Get all table configurations
app.get('/make-server-350bb6b2/table-management', async (c) => {
  try {
    const tables = await kv.get('table_configurations');
    
    // Default table configurations if none exist
    const defaultTables = [
      {
        id: 'VIP-1',
        name: 'VIP 1',
        capacity: 8,
        price: 15000,
        area: 'vip',
        features: {
          tr: ['Premium konum', 'Özel servis', 'Sahne görüşü'],
          en: ['Premium location', 'Dedicated service', 'Stage view']
        }
      },
      {
        id: 'VIP-2',
        name: 'VIP 2',
        capacity: 8,
        price: 15000,
        area: 'vip',
        features: {
          tr: ['Premium konum', 'Özel servis', 'Sahne görüşü'],
          en: ['Premium location', 'Dedicated service', 'Stage view']
        }
      },
      {
        id: 'VIP-3',
        name: 'VIP 3',
        capacity: 6,
        price: 12000,
        area: 'vip',
        features: {
          tr: ['Özel servis', 'Sahne görüşü'],
          en: ['Dedicated service', 'Stage view']
        }
      },
      {
        id: 'VIP-4',
        name: 'VIP 4',
        capacity: 6,
        price: 12000,
        area: 'vip',
        features: {
          tr: ['Özel servis', 'Sahne görüşü'],
          en: ['Dedicated service', 'Stage view']
        }
      },
      {
        id: 'PREMIUM-1',
        name: 'Premium 1',
        capacity: 6,
        price: 10000,
        area: 'premium',
        features: {
          tr: ['İyi konum', 'Standart servis'],
          en: ['Good location', 'Standard service']
        }
      },
      {
        id: 'PREMIUM-2',
        name: 'Premium 2',
        capacity: 6,
        price: 10000,
        area: 'premium',
        features: {
          tr: ['İyi konum', 'Standart servis'],
          en: ['Good location', 'Standard service']
        }
      },
      {
        id: 'PREMIUM-3',
        name: 'Premium 3',
        capacity: 4,
        price: 8000,
        area: 'premium',
        features: {
          tr: ['İyi konum', 'Standart servis'],
          en: ['Good location', 'Standard service']
        }
      },
      {
        id: 'STANDARD-1',
        name: 'Standard 1',
        capacity: 4,
        price: 6000,
        area: 'standard',
        features: {
          tr: ['Standart konum', 'Temel servis'],
          en: ['Standard location', 'Basic service']
        }
      },
      {
        id: 'STANDARD-2',
        name: 'Standard 2',
        capacity: 4,
        price: 6000,
        area: 'standard',
        features: {
          tr: ['Standart konum', 'Temel servis'],
          en: ['Standard location', 'Basic service']
        }
      },
      {
        id: 'STANDARD-3',
        name: 'Standard 3',
        capacity: 4,
        price: 6000,
        area: 'standard',
        features: {
          tr: ['Standart konum', 'Temel servis'],
          en: ['Standard location', 'Basic service']
        }
      }
    ];
    
    return c.json({
      success: true,
      tables: tables || defaultTables
    });
  } catch (error) {
    console.log('Error fetching table configurations:', error);
    return c.json({ error: 'Failed to fetch table configurations' }, 500);
  }
});

// Update table configurations (Admin only)
app.put('/make-server-350bb6b2/table-management', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { tables } = await c.req.json();
    
    if (!tables || !Array.isArray(tables)) {
      return c.json({ error: 'Invalid tables data' }, 400);
    }

    // Validate table structure
    for (const table of tables) {
      if (!table.id || !table.name || !table.capacity || !table.price || !table.area) {
        return c.json({ error: 'Invalid table structure: missing required fields' }, 400);
      }
    }

    // Save tables to KV store
    await kv.set('table_configurations', tables);
    
    console.log('Table configurations updated by admin:', user.email);
    
    return c.json({ 
      success: true,
      message: 'Table configurations updated successfully',
      tables
    });
  } catch (error) {
    console.log('Error updating table configurations:', error);
    return c.json({ error: 'Failed to update table configurations' }, 500);
  }
});

// ==================== MEMBERSHIP PLANS ENDPOINTS ====================

// Get all membership plans
app.get('/make-server-350bb6b2/membership-plans', async (c) => {
  try {
    const plans = await kv.get('membership_plans');
    
    // Default plans if none exist
    const defaultPlans = [
      {
        id: 'bronze',
        name: 'Silver',
        nameEn: 'Silver',
        price: 199,
        color: '#C0C0C0',
        popular: false,
        features: [
          'Rezervasyonlarda öncelik',
          '10% harcama limiti indirimi',
          'Le Porte Restoran harcamalarında %5 indirim'
        ],
        featuresEn: [
          'Priority on reservations',
          '10% discount on spending limits',
          '5% discount on Le Porte Restaurant expenses'
        ]
      },
      {
        id: 'silver',
        name: 'Gold',
        nameEn: 'Gold',
        price: 349,
        color: '#FFD700',
        popular: true,
        features: [
          'MMBR dünyasına ayrıcalıklı erişim',
          'VIP alan erişimi',
          'Rezervasyonlarda öncelik',
          'Seçili etkinliklerde özel avantajlar',
          'Üyelere özel duyurular ve içerikler',
          '%20 harcama limiti indirimi',
          'Le Porte Restoran harcamalarında %10 indirim'
        ],
        featuresEn: [
          'Privileged access to the MMBR world',
          'VIP area access',
          'Priority on reservations',
          'Special advantages at selected events',
          'Exclusive announcements and content for members',
          '20% discount on spending limits',
          '10% discount on Le Porte Restaurant expenses'
        ]
      },
      {
        id: 'gold',
        name: 'Diamond',
        nameEn: 'Diamond',
        price: 599,
        color: '#0EBFE9',
        popular: false,
        features: [
          'MMBR\'ın en yüksek seviye üyelik statüsü',
          'Öncelikli giriş ve rezervasyon hakkı',
          'Evden MMBR\'a ve dönüşte ücretsiz VIP transfer',
          'Gelen DJ\'lerle fotoğraf çekilme fırsatı',
          'Kişisel temsilci ile doğrudan iletişim',
          'VIP alan erişimi',
          'Özel masa ve lokasyonlar için öncelik',
          'Özel kokteyl ikramı',
          'Özel etkinliklere davet',
          '%30 harcama limiti indirimi',
          'Üyelere özel indirimler ve kampanyalar',
          'Kardeş marka Aura Entertainment etkinliklerine ücretsiz katılım',
          'Le Porte Restoran harcamalarında %20 indirim'
        ],
        featuresEn: [
          'MMBR\'s highest level membership status',
          'Priority entry and reservation rights',
          'Free VIP transfer from home to MMBR and back',
          'Photo opportunity with visiting DJs',
          'Direct contact with personal representative',
          'VIP area access',
          'Priority for special tables and locations',
          'Complimentary signature cocktail',
          'Invitations to exclusive events',
          '30% discount on spending limits',
          'Member-exclusive discounts and campaigns',
          'Free participation in Aura Entertainment events',
          '20% discount on Le Porte Restaurant expenses'
        ]
      }
    ];
    
    return c.json({ 
      plans: plans || defaultPlans
    });
  } catch (error) {
    console.log('Error fetching membership plans:', error);
    return c.json({ error: 'Failed to fetch membership plans' }, 500);
  }
});

// Update membership plans (Admin only)
app.put('/make-server-350bb6b2/membership-plans', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { plans } = await c.req.json();
    
    if (!plans || !Array.isArray(plans)) {
      return c.json({ error: 'Invalid plans data' }, 400);
    }

    // Save plans to KV store
    await kv.set('membership_plans', plans);
    
    console.log('Membership plans updated by admin:', user.email);
    
    return c.json({ 
      success: true,
      message: 'Membership plans updated successfully',
      plans
    });
  } catch (error) {
    console.log('Error updating membership plans:', error);
    return c.json({ error: 'Failed to update membership plans' }, 500);
  }
});

// ==================== ADMIN MANAGEMENT ENDPOINTS ====================

// Get all admin users (Admin only)
app.get('/make-server-350bb6b2/admins', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const admins = await kv.getByPrefix('admin_');
    
    // Sort by creation date
    admins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return c.json({ admins });
  } catch (error) {
    console.log('Error fetching admins:', error);
    return c.json({ error: 'Failed to fetch admins' }, 500);
  }
});

// Create new admin user (Admin only)
app.post('/make-server-350bb6b2/admins', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { email, password, name } = await c.req.json();
    
    // Validate input
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password and name are required' }, 400);
    }

    // Check if admin with this email already exists
    const existingAdmins = await kv.getByPrefix('admin_');
    const emailExists = existingAdmins.some(admin => admin.email.toLowerCase() === email.toLowerCase());
    
    if (emailExists) {
      return c.json({ error: 'Admin with this email already exists' }, 400);
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: { role: 'admin' }
    });

    if (authError) {
      console.log('Error creating auth user:', authError);
      return c.json({ error: authError.message || 'Failed to create auth user' }, 500);
    }

    // Store admin info in KV
    const adminId = `admin_${authData.user.id}`;
    const adminData = {
      id: adminId,
      auth_user_id: authData.user.id,
      email,
      name,
      created_at: new Date().toISOString(),
      created_by: user.id
    };

    await kv.set(adminId, adminData);
    
    return c.json({ success: true, admin: adminData });
  } catch (error) {
    console.log('Error creating admin:', error);
    return c.json({ error: 'Failed to create admin' }, 500);
  }
});

// Update admin user (Admin only)
app.put('/make-server-350bb6b2/admins/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const adminId = c.req.param('id');
    const { email, name, password } = await c.req.json();
    
    // Get existing admin data
    const existingAdmin = await kv.get(adminId);
    if (!existingAdmin) {
      return c.json({ error: 'Admin not found' }, 404);
    }

    // Check if email is being changed and if it's already taken
    if (email && email.toLowerCase() !== existingAdmin.email.toLowerCase()) {
      const allAdmins = await kv.getByPrefix('admin_');
      const emailExists = allAdmins.some(admin => 
        admin.id !== adminId && admin.email.toLowerCase() === email.toLowerCase()
      );
      
      if (emailExists) {
        return c.json({ error: 'Email already taken by another admin' }, 400);
      }
    }

    // Update auth user
    const updateData: any = {
      user_metadata: { name: name || existingAdmin.name },
      app_metadata: { role: 'admin' }
    };

    if (email) {
      updateData.email = email;
    }

    if (password) {
      updateData.password = password;
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(
      existingAdmin.auth_user_id,
      updateData
    );

    if (authError) {
      console.log('Error updating auth user:', authError);
      return c.json({ error: authError.message || 'Failed to update auth user' }, 500);
    }

    // Update KV data
    const updatedAdmin = {
      ...existingAdmin,
      email: email || existingAdmin.email,
      name: name || existingAdmin.name,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    await kv.set(adminId, updatedAdmin);
    
    return c.json({ success: true, admin: updatedAdmin });
  } catch (error) {
    console.log('Error updating admin:', error);
    return c.json({ error: 'Failed to update admin' }, 500);
  }
});

// Delete admin user (Admin only)
app.delete('/make-server-350bb6b2/admins/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const adminId = c.req.param('id');
    
    // Get admin data
    const adminToDelete = await kv.get(adminId);
    if (!adminToDelete) {
      return c.json({ error: 'Admin not found' }, 404);
    }

    // Prevent deleting yourself
    if (adminToDelete.auth_user_id === user.id) {
      return c.json({ error: 'Cannot delete your own admin account' }, 400);
    }

    // Delete from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(adminToDelete.auth_user_id);

    if (authError) {
      console.log('Error deleting auth user:', authError);
      return c.json({ error: authError.message || 'Failed to delete auth user' }, 500);
    }

    // Delete from KV
    await kv.del(adminId);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting admin:', error);
    return c.json({ error: 'Failed to delete admin' }, 500);
  }
});

// ==================== SITE SETTINGS ENDPOINTS ====================

// Get site settings (public)
app.get('/make-server-350bb6b2/site-settings', async (c) => {
  try {
    const settings = await kv.get('site_settings');
    const defaultSettings = {
      generalEntryVisible: false,
    };
    return c.json({ settings: settings || defaultSettings });
  } catch (error) {
    console.log('Error fetching site settings:', error);
    return c.json({ error: 'Failed to fetch site settings' }, 500);
  }
});

// Update site settings (admin only)
app.put('/make-server-350bb6b2/site-settings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const body = await c.req.json();
    const existing = await kv.get('site_settings') || { generalEntryVisible: false };
    const updated = { ...existing, ...body };
    await kv.set('site_settings', updated);

    console.log('Site settings updated by admin:', user.email, updated);
    return c.json({ success: true, settings: updated });
  } catch (error) {
    console.log('Error updating site settings:', error);
    return c.json({ error: 'Failed to update site settings' }, 500);
  }
});

// ==================== SITE CONTENT ENDPOINTS ====================

const defaultSiteContent = {
  hero: {
    image: ""
  },
  about: {
    desc1Tr: "MMBR, Ankara gece hayatına yeni bir standart getirmek için kurulmuş, üyelik bazlı, özel bir sosyal kulüptür. Mimarisinden müziğine, misafir profilinden servis anlayışına kadar her detay; kalite, mahremiyet ve deneyim odaklı olarak tasarlanmıştır.",
    desc1En: "MMBR is an exclusive membership-based social club established to bring a new standard to Ankara's nightlife. From its architecture to music, from guest profile to service approach, every detail is designed with a focus on quality, privacy and experience.",
    desc2Tr: "MMBR'da amaç sadece eğlendirmek değil; aynı vizyonu, aynı frekansı ve aynı yaşam tarzını paylaşan insanları bir araya getirmektir. Uluslararası DJ'ler, özel performanslar ve özenle kurgulanmış etkinliklerle; her gece tekrar etmeyen bir deneyim sunar.",
    desc2En: "At MMBR, the goal is not just to entertain; it is to bring together people who share the same vision, the same frequency and the same lifestyle. With international DJs, special performances and carefully curated events; every night offers an unrepeatable experience.",
    desc3Tr: "MMBR, kalabalığın değil; doğru kalabalığın olduğu yerdir.",
    desc3En: "MMBR is where the right crowd is, not the big crowd.",
    image: ""
  },
  contact: {
    address: "Ankara, Türkiye",
    phone: "+90 000 000 00 00",
    email: "info@mmbrsociety.com",
    instagram: "https://instagram.com/mmbrsociety",
    facebook: "",
    mapUrl: "https://maps.google.com"
  },
  hours: {
    fridayTime: "23:00 - 03:00",
    saturdayTime: "23:00 - 03:00"
  },
  rules: {
    rule1Tr: "Girişlerde cinsiyet dengesi gözetilmektedir.",
    rule1En: "Gender balance is observed at entrances.",
    rule2Tr: "Smart Casual kıyafet kodu uygulanmaktadır.",
    rule2En: "Smart Casual dress code is enforced.",
    rule3Tr: "Tavır, kıyafet ve genel uygunluk değerlendirilir; uygun görülmeyenlere giriş reddedilebilir.",
    rule3En: "Attitude, attire, and general suitability are evaluated; entry may be refused for those deemed unsuitable.",
    rule4Tr: "Kapora yatırmamış olanlar için rezervasyon 23:30'dadır ve 30 dakika sonra iptal edilecektir.",
    rule4En: "Except for those who have paid a deposit, reservations are at 23:30 and will be canceled after 30 minutes.",
    rule5Tr: "Mekanda ses ve görüntü kaydı yapılmakta olup tanıtım amaçlı kullanılabilir.",
    rule5En: "Audio and video recordings are made at the venue and may be used for promotional purposes."
  }
};

// Get site content (public)
app.get('/make-server-350bb6b2/site-content', async (c) => {
  try {
    const content = await kv.get('site_content');
    return c.json({ content: content || defaultSiteContent });
  } catch (error) {
    console.log('Error fetching site content:', error);
    return c.json({ error: 'Failed to fetch site content' }, 500);
  }
});

// Update site content (admin only)
app.put('/make-server-350bb6b2/site-content', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const body = await c.req.json();
    const existing = await kv.get('site_content') || defaultSiteContent;
    const updated = {
      hero: { ...existing.hero, ...(body.hero || {}) },
      about: { ...existing.about, ...(body.about || {}) },
      contact: { ...existing.contact, ...(body.contact || {}) },
      hours: { ...existing.hours, ...(body.hours || {}) },
      rules: { ...existing.rules, ...(body.rules || {}) },
    };
    await kv.set('site_content', updated);

    console.log('Site content updated by admin:', user.email);
    return c.json({ success: true, content: updated });
  } catch (error) {
    console.log('Error updating site content:', error);
    return c.json({ error: 'Failed to update site content' }, 500);
  }
});

// Upload site media image (admin only)
app.post('/make-server-350bb6b2/upload-site-image', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const bucketName = 'make-350bb6b2-site-media';

    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const section = (formData.get('section') as string) || 'general';

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Unsupported file type' }, 415);
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: 'File too large (max 10MB)' }, 413);
    }

    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${section}_${timestamp}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileData, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('Site image upload error:', uploadError);
      return c.json({ error: 'Failed to upload image: ' + uploadError.message }, 500);
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 60 * 60 * 24 * 365);

    if (signedError || !signedData?.signedUrl) {
      return c.json({ error: 'Failed to generate image URL' }, 500);
    }

    return c.json({ success: true, imageUrl: signedData.signedUrl, fileName });
  } catch (error) {
    console.error('Site image upload error:', error);
    return c.json({ error: 'Server error during image upload' }, 500);
  }
});

// ===== İYZİCO ÖDEME =====

const IYZICO_API_KEY    = Deno.env.get('IYZICO_API_KEY')    || '';
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY') || '';
const IYZICO_BASE_URL   = Deno.env.get('IYZICO_SANDBOX') === 'false'
  ? 'https://api.iyzipay.com'
  : 'https://sandbox-api.iyzipay.com'; // sandbox default (geliştirme)

/** İyzico IYZWSv2 imzası ile checkout form sonucunu sorgular (SDK Deno uyumsuzluğu bypass) */
async function iyziRetrieveCheckout(params: { locale: string; conversationId: string; token: string }): Promise<any> {
  const uriPath    = '/payment/iyzipos/checkoutform/auth/ecom/detail';
  const bodyStr    = JSON.stringify(params);
  const encoder    = new TextEncoder();

  // 1) 8 karakter random string
  const randomKey  = crypto.randomUUID().replace(/-/g, '').slice(0, 8);

  // 2) SHA-256( randomKey + uriPath + body )  →  hex
  const shaInput   = encoder.encode(randomKey + uriPath + bodyStr);
  const shaDigest  = await crypto.subtle.digest('SHA-256', shaInput);
  const hashHex    = [...new Uint8Array(shaDigest)].map(b => b.toString(16).padStart(2, '0')).join('');

  // 3) HMAC-SHA256( secretKey, hashHex )  →  hex
  const hmacKey    = await crypto.subtle.importKey('raw', encoder.encode(IYZICO_SECRET_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hmacBuf    = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(hashHex));
  const sigHex     = [...new Uint8Array(hmacBuf)].map(b => b.toString(16).padStart(2, '0')).join('');

  // 4) Authorization header:  IYZWSv2 apiKey:randomKey:signature
  const authHeader = `IYZWSv2 ${IYZICO_API_KEY}:${randomKey}:${sigHex}`;
  const endpoint   = `${IYZICO_BASE_URL}${uriPath}`;

  console.log('[iyziRetrieve] endpoint:', endpoint, 'auth:', authHeader.slice(0, 40) + '...');

  const res = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body:    bodyStr,
  });
  const json = await res.json();
  console.log('[iyziRetrieve] response status:', json.status, 'paymentStatus:', json.paymentStatus, 'errorCode:', json.errorCode);
  return json;
}

/** Resmi iyzipay SDK instance */
function getIyzipay() {
  return new Iyzipay({
    apiKey:    IYZICO_API_KEY,
    secretKey: IYZICO_SECRET_KEY,
    uri:       IYZICO_BASE_URL,
  });
}

/** İyzipay SDK promisify yardımcısı */
function iyziCall(fn: Function, data: object): Promise<any> {
  return new Promise((resolve, reject) => {
    fn(data, (err: any, result: any) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ---- Checkout formu oluştur ----
app.post('/make-server-350bb6b2/payments/create-checkout', async (c) => {
  try {
    // Rate limit: IP başına saatte 20 ödeme başlatma
    const ip = getClientIP(c);
    const rl = rateLimit(`payment:${ip}`, 20, 60 * 60 * 1000);
    if (!rl.allowed) {
      return c.json({ error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` }, 429);
    }

    const { amount, paymentType, referenceId, buyerInfo, description } = await c.req.json();

    if (!amount || !paymentType || !buyerInfo?.email || !buyerInfo?.name) {
      return c.json({ error: 'amount, paymentType, buyerInfo.email ve buyerInfo.name zorunlu' }, 400);
    }

    const conversationId = `${paymentType}-${referenceId || Date.now()}`;
    const priceStr       = Number(amount).toFixed(2);
    const [firstName, ...rest] = (buyerInfo.name as string).trim().split(' ');
    const lastName = rest.join(' ') || '-';

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-350bb6b2/payments/callback`;

    const checkoutBody = {
      locale:         'tr',
      conversationId,
      price:          priceStr,
      paidPrice:      priceStr,
      currency:       'TRY',
      basketId:       conversationId,
      paymentGroup:   'PRODUCT',
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6],
      buyer: {
        id:                  buyerInfo.userId || conversationId,
        name:                firstName,
        surname:             lastName,
        gsmNumber:           buyerInfo.phone  || '+905000000000',
        email:               buyerInfo.email,
        identityNumber:      '11111111111', // sandbox için sabit
        registrationAddress: buyerInfo.address || 'İstanbul',
        ip:                  ip === 'unknown' ? '127.0.0.1' : ip,
        city:                buyerInfo.city    || 'İstanbul',
        country:             'Turkey',
        zipCode:             '34000',
      },
      shippingAddress: {
        contactName: `${firstName} ${lastName}`,
        city:        'İstanbul',
        country:     'Turkey',
        address:     buyerInfo.address || 'İstanbul',
        zipCode:     '34000',
      },
      billingAddress: {
        contactName: `${firstName} ${lastName}`,
        city:        'İstanbul',
        country:     'Turkey',
        address:     buyerInfo.address || 'İstanbul',
        zipCode:     '34000',
      },
      basketItems: [{
        id:        conversationId,
        name:      description || paymentType,
        category1: 'Eğlence',
        itemType:  'VIRTUAL',
        price:     priceStr,
      }],
    };

    const iyzipay = getIyzipay();
    const iyziRes = await iyziCall(
      iyzipay.checkoutFormInitialize.create.bind(iyzipay.checkoutFormInitialize),
      checkoutBody
    );

    if (iyziRes.status !== 'success') {
      console.error('İyzico checkout error:', iyziRes);
      return c.json({ error: iyziRes.errorMessage || 'Ödeme başlatılamadı' }, 502);
    }

    // payments tablosuna kaydet
    await supabase.from('payments').insert({
      token:           iyziRes.token,
      conversation_id: conversationId,
      payment_type:    paymentType,
      reference_id:    referenceId || null,
      amount:          Number(amount),
      buyer_email:     buyerInfo.email,
      buyer_name:      buyerInfo.name,
      status:          'pending',
    });

    return c.json({
      token:               iyziRes.token,
      checkoutFormContent: iyziRes.checkoutFormContent,
      conversationId,
    });
  } catch (error) {
    console.error('create-checkout error:', error);
    return c.json({ error: 'Sunucu hatası' }, 500);
  }
});

// ---- İyzico callback (ödeme sonrası İyzico buraya POST eder) ----
app.post('/make-server-350bb6b2/payments/callback', async (c) => {
  try {
    let token = '';
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await c.req.text();
      token = new URLSearchParams(text).get('token') || '';
    } else {
      const body = await c.req.json().catch(() => ({}));
      token = body.token || '';
    }

    const FRONTEND_URL = 'https://mmbrsociety.vercel.app';

    if (!token) {
      return c.redirect(`${FRONTEND_URL}/payment/result?status=failure`);
    }

    // DB'den conversation_id'yi al
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('conversation_id, payment_type, reference_id')
      .eq('token', token)
      .maybeSingle();

    // Ödeme durumunu sorgula
    const conversationId = existingPayment?.conversation_id || `cb-${Date.now()}`;
    let detailRes: any;

    // Önce SDK ile dene (doğru property: checkoutForm, checkoutFormRetrieve değil)
    try {
      const iyz = getIyzipay();
      console.log('[callback] iyzipay keys:', Object.keys(iyz).join(', '));
      const retrieveFn = (iyz as any).checkoutForm || (iyz as any).checkoutFormRetrieve;
      if (retrieveFn && typeof retrieveFn.retrieve === 'function') {
        console.log('[callback] SDK retrieve found, using SDK');
        detailRes = await iyziCall(retrieveFn.retrieve.bind(retrieveFn), {
          locale: 'tr',
          conversationId,
          token,
        });
      } else {
        console.log('[callback] SDK retrieve not available, falling back to HTTP');
        detailRes = await iyziRetrieveCheckout({ locale: 'tr', conversationId, token });
      }
    } catch (sdkErr) {
      console.error('[callback] SDK error, falling back to HTTP:', sdkErr);
      detailRes = await iyziRetrieveCheckout({ locale: 'tr', conversationId, token });
    }

    console.log('[callback] detailRes:', JSON.stringify({ status: detailRes?.status, paymentStatus: detailRes?.paymentStatus, errorCode: detailRes?.errorCode, errorMessage: detailRes?.errorMessage }));

    const success = detailRes.status === 'success' && detailRes.paymentStatus === 'SUCCESS';

    // payments tablosunu güncelle
    await supabase
      .from('payments')
      .update({
        status:            success ? 'success' : 'failure',
        iyzico_payment_id: detailRes.paymentId || null,
        updated_at:        new Date().toISOString(),
      })
      .eq('token', token);

    // İlgili rezervasyon/üyelik durumunu KV store'da güncelle
    if (existingPayment?.reference_id) {
      try {
        const existing = await kv.get(existingPayment.reference_id);
        if (existing) {
          if (success) {
            await kv.set(existingPayment.reference_id, { ...existing, status: 'confirmed', payment_status: 'paid' });
          } else {
            // Ödeme başarısız → rezervasyonu iptal et (masa tekrar müsait olsun)
            await kv.set(existingPayment.reference_id, { ...existing, status: 'cancelled', payment_status: 'failed' });
          }
        }
      } catch (_) { /* KV güncelleme hatası ödeme başarısını etkilemesin */ }
    }

    const statusParam = success ? 'success' : 'failure';
    const typeParam   = existingPayment?.payment_type || '';
    return c.redirect(`${FRONTEND_URL}/payment/result?status=${statusParam}&type=${typeParam}`);
  } catch (error) {
    console.error('payment callback error:', error);
    return c.redirect('https://mmbrsociety.vercel.app/payment/result?status=failure');
  }
});

// ---- Ödeme durumu sorgula ----
app.get('/make-server-350bb6b2/payments/status/:conversationId', async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const { data, error } = await supabase
      .from('payments')
      .select('status, payment_type, reference_id, amount, created_at')
      .eq('conversation_id', conversationId)
      .single();

    if (error || !data) return c.json({ error: 'Kayıt bulunamadı' }, 404);
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Sunucu hatası' }, 500);
  }
});
// ===== /İYZİCO ÖDEME =====

// Start the server
Deno.serve(app.fetch);