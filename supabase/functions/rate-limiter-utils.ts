import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Rate Limiter & Quota Manager
 * Provides rate limiting and API call quotas for users
 */

interface RateLimitConfig {
  maxCallsPerHour: number;  // Rate limit per hour
  maxCallsPerDay: number;   // Daily quota (100 for free users)
}

interface QuotaStatus {
  remainingCalls: number;
  resetTime: number;
  isLimited: boolean;
  planType: string;
}

const FREE_USER_CONFIG: RateLimitConfig = {
  maxCallsPerHour: 20,      // Burst protection
  maxCallsPerDay: 100,      // Daily limit (100 for free)
};

const PREMIUM_USER_CONFIG: RateLimitConfig = {
  maxCallsPerHour: 1000,
  maxCallsPerDay: 10000,
};

const UNLIMITED_USER_CONFIG: RateLimitConfig = {
  maxCallsPerHour: 10000,
  maxCallsPerDay: 1000000,
};

/**
 * Get rate limit config based on user plan
 */
function getConfigForPlan(planType: string | null): RateLimitConfig {
  if (planType === "premium") return PREMIUM_USER_CONFIG;
  if (planType === "unlimited") return UNLIMITED_USER_CONFIG;
  return FREE_USER_CONFIG;
}

/**
 * Check if user has exceeded rate limits
 * Returns remaining calls and whether request should be allowed
 */
export async function checkRateLimit(
  userId: string,
  planType: string | null = null
): Promise<QuotaStatus> {
  const config = getConfigForPlan(planType);
  
  // Get Supabase client with service role (can write to tables)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hourStart = new Date(now.getTime() - 60 * 60 * 1000);

  try {
    // Get or create user quota record for today
    let { data: quotaData, error: quotaError } = await supabase
      .from("user_api_quotas")
      .select("*")
      .eq("user_id", userId)
      .eq("quota_date", dayStart.toISOString().split("T")[0])
      .single();

    if (quotaError && quotaError.code !== "PGRST116") {
      throw quotaError;
    }

    // Create new quota record if doesn't exist
    if (!quotaData) {
      const { data, error } = await supabase
        .from("user_api_quotas")
        .insert({
          user_id: userId,
          quota_date: dayStart.toISOString().split("T")[0],
          calls_today: 0,
          calls_this_hour: 0,
          last_call_hour: new Date().getHours(),
          plan_type: planType || "free",
        })
        .select()
        .single();

      if (error) throw error;
      quotaData = data;
    }

    // Reset hour counter if we've moved to a new hour
    let callsThisHour = quotaData.calls_this_hour;
    if (new Date().getHours() !== quotaData.last_call_hour) {
      callsThisHour = 0;
      await supabase
        .from("user_api_quotas")
        .update({ calls_this_hour: 0, last_call_hour: new Date().getHours() })
        .eq("user_id", userId)
        .eq("quota_date", dayStart.toISOString().split("T")[0]);
    }

    // Check if limits exceeded
    const dailyExceeded = quotaData.calls_today >= config.maxCallsPerDay;
    const hourlyExceeded = callsThisHour >= config.maxCallsPerHour;

    const isLimited = dailyExceeded || hourlyExceeded;
    const remainingCalls = Math.max(
      0,
      config.maxCallsPerDay - quotaData.calls_today
    );

    return {
      remainingCalls,
      resetTime: dayStart.getTime() + 24 * 60 * 60 * 1000,
      isLimited,
      planType: planType || "free",
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Fail open on database errors (let request through)
    return {
      remainingCalls: 1000,
      resetTime: Date.now() + 24 * 60 * 60 * 1000,
      isLimited: false,
      planType: planType || "free",
    };
  }
}

/**
 * Increment API call counter for user
 */
export async function incrementAPICallCount(userId: string): Promise<void> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    await supabase.rpc("increment_api_calls", {
      p_user_id: userId,
      p_quota_date: dayStart.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Error incrementing API calls:", error);
    // Non-critical - continue anyway
  }
}

/**
 * Verify JWT token and extract user info
 */
export async function verifyJWT(authHeader: string | null): Promise<{
  userId: string;
  email: string;
  planType: string | null;
  isValid: boolean;
}> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      userId: "",
      email: "",
      planType: null,
      isValid: false,
    };
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return {
        userId: "",
        email: "",
        planType: null,
        isValid: false,
      };
    }

    // Get user plan from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    return {
      userId: data.user.id,
      email: data.user.email || "",
      planType: profile?.role || "free",
      isValid: true,
    };
  } catch (error) {
    console.error("JWT verification error:", error);
    return {
      userId: "",
      email: "",
      planType: null,
      isValid: false,
    };
  }
}

/**
 * Validate input size
 */
export function validateInputSize(
  requestBody: Record<string, unknown>,
  maxSizeKB: number = 50
): { isValid: boolean; error?: string } {
  const bodyString = JSON.stringify(requestBody);
  const sizeKB = Buffer.byteLength(bodyString) / 1024;

  if (sizeKB > maxSizeKB) {
    return {
      isValid: false,
      error: `Request too large. Maximum ${maxSizeKB}KB allowed, got ${sizeKB.toFixed(1)}KB`,
    };
  }

  return { isValid: true };
}

/**
 * Secure CORS headers (only allow your domains)
 */
export function getSecureCorsHeaders(
  origin: string | null
): Record<string, string> {
  // Get allowed origins from environment variable, with fallbacks
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map(o => o.trim())
    : [
        // Common development origins
        "http://localhost:5173", // Vite dev server
        "http://localhost:3000", // Alternative dev
        "http://localhost:5174", // Vite alternative
        "http://127.0.0.1:5173", // IP version of localhost
        "http://127.0.0.1:3000", // IP version of localhost
        // Production patterns (user should update these)
        "https://yourdomain.com",
        "https://www.yourdomain.com",
        "https://your-main-app.vercel.app", // Vercel deployment pattern
        "https://your-earthworm-app.vercel.app", // Earthworm deployment pattern
      ];

  // Check if origin matches any allowed pattern (including wildcards for subdomains)
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return false;
    })
  );

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}
