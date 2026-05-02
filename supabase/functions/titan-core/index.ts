
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@^0.24.1";
import { createClient } from "npm:@supabase/supabase-js@^2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { category, description, images, location } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const locationContext = location 
      ? `The user is currently located at coordinates: ${location.latitude}, ${location.longitude}. 
         IMPORTANT: IDENTIFY the user's country from these coordinates. 
         1. Identify the local currency and set 'currency_code' accordingly.
         2. Use this country to find LOCAL hardware/tool retailers.` 
      : "The user's location is unknown; default to USD and global retailers (Amazon, eBay).";

    const prompt = `TITAN FORENSIC PROTOCOL: Execute analysis on hardware component. 
      
      PRIMARY CONTEXT:
      Current Date: ${currentDate}
      Category: ${category}
      User Description: ${description}
      ${locationContext}

      HYPER-ACCURATE IDENTIFICATION MANDATE (CRITICAL):
      1. FORENSIC SCRUTINY: Analyze EVERY pixel for serial numbers, model markings, port types, camera modules, and materials.
      2. MODEL-SPECIFIC FEATURES: Distinguish between latest models (e.g., iPhone 16/17, Galaxy S25) using release dates up to ${currentDate}.
      3. BRAND AUTHENTICITY: Identify genuine vs knock-offs.

      SPECIALIST SEARCH MANDATE:
      1. Find REAL, ACTIVE local electronic repair specialists near the coordinates.
      2. STRICT BLACKLIST: DO NOT include "Compu Ghana".
      3. LINK STABILITY: Provide direct Google Maps search links (\`https://www.google.com/maps/search/?api=1&query=...\`).

      DIY SEARCH MANDATE:
      - Provide TWO STABLE YouTube search URLs (Diagnostic Search, Step-by-Step Repair).

      MARKET & TOOL LOCALIZATION:
      - Provide search-only URLs for Amazon, AliExpress, eBay, and local marketplaces (e.g., Jiji.com.gh).
      - BLACKLIST: DO NOT include JUMIA.

      INTELLIGENT VALIDATION:
      - Check for category mismatch.
      - Detect "no visible issue" cases.

      Provide the result in the specified JSON schema.
      Schema: {
        brand: string,
        model: string,
        confidence_score: number,
        risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
        is_high_voltage: boolean,
        recommended_action: string,
        reasoning: string,
        potential_fix_cost_estimate: string,
        currency_code: string,
        resale_value: { unit_value_fixed: string, unit_value_broken: string, profit_potential: string },
        recommended_repair_hubs: Array<{ name: string, address: string, uri: string, rating?: string, specialty?: string }>,
        diy_guides: Array<{ title: string, uri: string, platform: string, difficulty: string }>,
        required_tools: Array<{ name: string, reason: string, link: string }>,
        purchase_options: Array<{ name: string, price: string, uri: string, is_new: boolean }>,
        parts_retailers: Array<{ name: string, part_name: string, uri: string }>,
        category_mismatch: boolean,
        identified_category: string,
        common_failures: string[],
        no_visible_issue: boolean
      }`;

    const result = await model.generateContent([
      prompt,
      ...images.map((img: string) => ({
        inlineData: { mimeType: "image/jpeg", data: img.split(',')[1] }
      }))
    ]);

    const diagnosisResult = JSON.parse(result.response.text());

    // HYBRID BRAIN: Database Augmentation
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: specs } = await supabase
      .from('device_specs')
      .select('*')
      .ilike('brand_name', `%${diagnosisResult.brand}%`)
      .ilike('model_name', `%${diagnosisResult.model}%`)
      .limit(1)
      .maybeSingle();

    if (specs) {
      diagnosisResult.technical_specs = {
        processor: `${specs.processor_brand} ${specs.num_cores} Cores`,
        screen: `${specs.screen_size}" @ ${specs.refresh_rate}Hz`,
        battery: `${specs.battery_capacity} mAh`,
        camera: `${specs.num_rear_cameras} Rear / ${specs.primary_camera_front}MP Front`,
        os: specs.os,
        data_source: 'TITAN_MASTER_DB'
      };
      if (specs.model_name && specs.model_name.length > diagnosisResult.model.length) {
        diagnosisResult.model = specs.model_name;
      }
    }

    // Post-processing
    if (diagnosisResult.recommended_repair_hubs) {
      diagnosisResult.recommended_repair_hubs = diagnosisResult.recommended_repair_hubs
        .filter((hub: { name: string; address: string; uri: string }) => !hub.name.toLowerCase().includes("compu ghana"))
        .map((hub: { name: string; address: string; uri: string }) => {
          if (!hub.uri.includes('maps') || hub.uri.includes('placeholder')) {
            const query = encodeURIComponent(`${hub.name} ${hub.address}`);
            hub.uri = `https://www.google.com/maps/search/?api=1&query=${query}`;
          }
          return hub;
        });
    }

    return new Response(JSON.stringify(diagnosisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
