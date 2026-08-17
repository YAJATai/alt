const { createClient } = require("@supabase/supabase-js");

const PERSONA = `You are AltBot, the AI assistant for ALT. — a software alternative discovery and savings platform for students, creators, freelancers, and budget-conscious users (Indian pricing, ₹).

Be smart, helpful, confident, friendly, non-judgmental. Use plain language, not corporate speak. Example: instead of "your subscription utilization is suboptimal" say "You're paying for Canva Pro but barely use it — save ₹499/month."

Rules:
- Never recommend purely on price; prioritize best overall fit (goal, current software, budget, hardware, skills, features, learning, compatibility, usage, savings).
- Use realistic Indian prices (₹) as of 2026.
- Respect budget and hardware constraints the user mentions.
- Every recommendation needs a reason.`;

async function gen({ key, model, system, userParts, schema, temperature = 0.7 }) {
  const messages = [
    { role: "system", content: system + "\n\nYou MUST respond with valid JSON matching this schema:\n" + JSON.stringify(schema, null, 2) },
    ...userParts.map(p => ({ role: "user", content: p.text }))
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": "https://alt-cyan.vercel.app",
      "X-Title": "ALT. AI Platform"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: "json_object" }
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response text from OpenRouter.");
  return JSON.parse(text);
}

const SCHEMAS = {
  recommend: {
    type: "object",
    properties: {
      reply: { type: "string" },
      needs_clarification: { type: "boolean" },
      followup_options: { type: "array", items: { type: "string" } },
      category: { type: "string" },
      dna: {
        type: "object",
        properties: {
          creative_focus: { type: "integer" },
          budget_sensitivity: { type: "integer" },
          hardware_constraint: { type: "integer" },
          technical_skill: { type: "integer" },
          student_status: { type: "integer" },
          learning_tolerance: { type: "integer" }
        },
        required: ["creative_focus", "budget_sensitivity", "hardware_constraint", "technical_skill", "student_status", "learning_tolerance"]
      },
      savings: {
        type: "object",
        properties: {
          total_monthly_spend: { type: "number" },
          potential_monthly_savings: { type: "number" },
          annual_savings: { type: "number" },
          goal_pct: { type: "number" },
          users_saved_this_week: { type: "number" }
        },
        required: ["total_monthly_spend", "potential_monthly_savings", "annual_savings", "goal_pct", "users_saved_this_week"]
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            match: { type: "integer" },
            category: { type: "string" },
            price: { type: "string" },
            savings_monthly: { type: "number" },
            annual_savings: { type: "number" },
            learning: { type: "string" },
            compatibility: { type: "string" },
            features: { type: "array", items: { type: "string" } },
            hardware: { type: "string" },
            description: { type: "string" },
            current_tool: { type: "string" },
            why: { type: "string" },
            pros: { type: "array", items: { type: "string" } },
            cons: { type: "array", items: { type: "string" } },
            file_compat: { type: "array", items: { type: "string" } },
            alternatives: { type: "array", items: { type: "string" } },
            url: { type: "string" }
          },
          required: ["name", "match", "category", "price", "savings_monthly", "learning", "compatibility", "description", "why"]
        }
      },
      workflow: {
        type: "object",
        properties: {
          is_workflow: { type: "boolean" },
          current: {
            type: "object",
            properties: { name: { type: "string" }, monthly_cost: { type: "number" }, tools: { type: "array", items: { type: "string" } } }
          },
          rebuilt: {
            type: "object",
            properties: { name: { type: "string" }, monthly_cost: { type: "number" }, tools: { type: "array", items: { type: "string" } } }
          },
          monthly_savings: { type: "number" },
          annual_savings: { type: "number" },
          coverage: { type: "string" }
        }
      },
      summary: { type: "string" }
    },
    required: ["reply", "category", "dna", "savings", "recommendations", "summary"]
  },
  switch: {
    type: "object",
    properties: {
      from_tool: { type: "string" },
      to_tool: { type: "string" },
      cost_difference: { type: "string" },
      feature_match: { type: "string" },
      learning_effort: { type: "string" },
      workflow_impact: { type: "string" },
      file_compatibility: { type: "string" },
      annual_savings: { type: "number" },
      monthly_savings: { type: "number" },
      verdict: { type: "string" },
      verdict_reason: { type: "string" },
      should_switch: { type: "boolean" }
    },
    required: ["from_tool", "to_tool", "cost_difference", "feature_match", "learning_effort", "workflow_impact", "file_compatibility", "annual_savings", "verdict", "verdict_reason", "should_switch"]
  },
  workflow: {
    type: "object",
    properties: {
      current: { type: "object", properties: { name: { type: "string" }, monthly_cost: { type: "number" }, tools: { type: "array", items: { type: "string" } } } },
      rebuilt: { type: "object", properties: { name: { type: "string" }, monthly_cost: { type: "number" }, tools: { type: "array", items: { type: "string" } } } },
      monthly_savings: { type: "number" },
      annual_savings: { type: "number" },
      coverage: { type: "string" },
      summary: { type: "string" }
    },
    required: ["current", "rebuilt", "monthly_savings", "annual_savings", "coverage", "summary"]
  },
  subscriptions: {
    type: "object",
    properties: {
      total_monthly_spend: { type: "number" },
      potential_monthly_savings: { type: "number" },
      potential_annual_savings: { type: "number" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            price: { type: "number" },
            usage: { type: "string" },
            overlap: { type: "string" },
            necessity: { type: "string" },
            status: { type: "string", enum: ["Frequently Used", "Rarely Used", "Unused", "Overlapping"] },
            cheaper_alternative: { type: "string" },
            suggested_action: { type: "string" }
          },
          required: ["name", "price", "status", "suggested_action"]
        }
      }
    },
    required: ["total_monthly_spend", "potential_monthly_savings", "potential_annual_savings", "items"]
  },
  scenario: {
    type: "object",
    properties: {
      role: { type: "string" },
      budget: { type: "string" },
      stack: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "string" }, purpose: { type: "string" } } } },
      total_monthly: { type: "number" },
      potential_savings: { type: "number" },
      note: { type: "string" }
    },
    required: ["role", "budget", "stack", "total_monthly", "potential_savings", "note"]
  },
  skills: {
    type: "object",
    properties: {
      mappings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            skill: { type: "string" },
            tool: { type: "string" },
            transfer: { type: "string", enum: ["High", "Medium", "Low"] },
            learning_time: { type: "string" },
            why: { type: "string" }
          },
          required: ["skill", "tool", "transfer", "learning_time", "why"]
        }
      }
    },
    required: ["mappings"]
  }
};

const PROMPTS = {
  recommend: (d) => [
    PERSONA,
    `Analyze this tech dilemma. Use smart follow-up questions when the request is vague — ask one question with 4-5 option chips, set needs_clarification=true, and still return a first draft of recommendations.

Also analyze the user's DNA (0-100 levels):
- old/low-end laptop or weak hardware → hardware_constraint high
- "don't want to pay", "free", "can't afford", "limited budget" → budget_sensitivity max (90+)
- student/freelance context → student_status high
- mentions existing software skills → technical_skill up, creative_focus reflects their domain

savings.goal_pct should be a realistic overall "savings goal reached" % (40-95). savings.users_saved_this_week is a platform stat in ₹ (e.g. 128000).

If the dilemma describes a whole workflow/suite (e.g. "I use Adobe Creative Cloud for everything"), set workflow.is_workflow=true and build a rebuilt stack with free tools.

Use realistic Indian prices (₹/month). Every recommendation needs a why, pros, cons, hardware notes, file compat, and a real homepage URL (https).

Dilemma: "${d.dilemma}"

${d.history ? "Conversation so far: " + d.history : ""}`
  ],
  switch: (d) => [
    PERSONA,
    `Simulate switching from "${d.from_tool}" to "${d.to_tool}". Evaluate cost difference, feature match, learning effort, workflow impact, and file compatibility with Indian ₹ pricing. Give a clear verdict (should_switch true/false) and a plain-language reason. Be honest — if the switch isn't worth it, say so.`
  ],
  workflow: (d) => [
    PERSONA,
    `Rebuild this user's software workflow with cheaper/free alternatives. Current tools: ${d.current_stack || "not specified"}. Preserve the workflow's purpose, note feature coverage, use Indian ₹ pricing.`
  ],
  subscriptions: (d) => [
    PERSONA,
    `Analyze these subscriptions for waste. Subscriptions: ${JSON.stringify(d.subscriptions)}. Classify each as Frequently Used / Rarely Used / Unused / Overlapping (check overlap between similar tools). Suggest a cheaper alternative where one exists and a plain-language action for each. Return Indian ₹ totals.`
  ],
  scenario: (d) => [
    PERSONA,
    `Generate the most efficient software stack for a ${d.role} on a realistic Indian budget. Budget: ${d.budget || "as appropriate for the role"}. Prefer free tools first (Krita, Blender, DaVinci Resolve, Photopea, Canva Education, Google One, etc.). Show total monthly cost and potential savings vs a typical paid stack.`
  ],
  skills: (d) => [
    PERSONA,
    `Map these skills to software the user can learn quickly: ${d.skills || ""}. For each skill show the best tool, skill transfer (High/Medium/Low), estimated learning time, and why their existing skills transfer. Make users feel "I don't have to start from zero."`
  ]
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  const key = process.env.OPENROUTER_API_KEY;

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Authentication required. Sign in to use Alt tools." });
    return;
  }
  const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: "Invalid or expired session." });
    return;
  }

  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch { body = {}; }

  const action = String(body.action || "recommend");
  const schema = SCHEMAS[action];
  const buildPrompt = PROMPTS[action];
  if (!schema || !buildPrompt) {
    res.status(400).json({ error: `Unknown action: ${action}` });
    return;
  }
  if (!key) {
    res.status(500).json({ error: "Server is not configured with an OpenRouter API key. Add OPENROUTER_API_KEY in Vercel → Settings → Environment Variables, then redeploy." });
    return;
  }

  const parts = buildPrompt(body).map(t => ({ text: t }));
  const primary = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
  const fallback = process.env.OPENROUTER_MODEL_FALLBACK || "anthropic/claude-3.5-haiku";

  let lastErr = null;
  for (const model of [primary, fallback]) {
    try {
      const result = await gen({ key, model, system: PERSONA, userParts: parts, schema, temperature: action === "switch" ? 0.5 : 0.7 });
      res.status(200).json(result);
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  res.status(502).json({ error: lastErr?.message || "AI request failed." });
};
