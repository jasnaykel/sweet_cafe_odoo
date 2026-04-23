/**
 * Sweet Café QA Agent - Configuration Module
 * Loads and validates configuration for Odoo 19 Sweet Café testing
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { QAConfig } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../../.env") });

/**
 * Default configuration values for Odoo 19 Sweet Café
 */
const defaultConfig: QAConfig = {
  projectPaths: {
    frontend: resolve(__dirname, "../../../sweet_cafe_ecommerce"),
    backend: resolve(__dirname, "../../../sweet_cafe_management"),
  },
  urls: {
    frontend: process.env.ODOO_URL || "http://localhost:8069",
    backend: process.env.ODOO_URL || "http://localhost:8069",
  },
  auth: {
    adminCredentials: {
      email: process.env.ODOO_ADMIN_EMAIL || "admin",
      password: process.env.ODOO_ADMIN_PASSWORD || "admin",
    },
    candidateCredentials: {
      email: process.env.ODOO_USER_EMAIL || "usuario@sweetcafe.cu",
      password: process.env.ODOO_USER_PASSWORD || "test1234",
    },
  },
  execution: {
    headless: process.env.HEADLESS !== "false",
    slowMo: parseInt(process.env.SLOW_MO || "0", 10),
    timeout: parseInt(process.env.TIMEOUT || "120000", 10),
    retries: 1,
    parallel: false, // Odoo requiere ejecución secuencial por estado compartido
  },
  reporting: {
    outputDir: resolve(__dirname, "../../reports"),
    screenshotOnFailure: process.env.SCREENSHOT_ON_FAILURE !== "false",
    videoOnFailure: true,
    formats: ["html", "json"],
  },
  ai: {
    provider: process.env.GOOGLE_AI_API_KEY ? "google" : "openai",
    model: process.env.GOOGLE_AI_API_KEY
      ? "gemini-1.5-flash"
      : "gpt-4-turbo-preview",
    maxTokens: 4096,
  },
};

/**
 * CTRL-specific business flows configuration
 */
export const ctrlFlows = {
  candidateFlows: [
    {
      name: "Complete Assessment Flow",
      description: "Full candidate assessment journey from login to completion",
      steps: [
        "Login as candidate",
        "View dashboard",
        "Start typing test",
        "Complete practice typing",
        "Complete 3 real typing tests",
        "View results",
        "Start call simulation",
        "Complete 3 call scenarios",
        "View results",
        "Start situational judgement",
        "Complete all questions",
        "View final results",
      ],
      criticalPath: true,
    },
    {
      name: "Typing Test Flow",
      description: "Complete typing assessment module",
      steps: [
        "Navigate to typing test",
        "View instructions",
        "Start practice test",
        "Type text correctly",
        "Verify WPM and accuracy",
        "Move to real tests",
        "Complete test 1",
        "Complete test 2",
        "Complete test 3",
        "Verify results saved",
      ],
      criticalPath: true,
    },
    {
      name: "Call Simulation Flow",
      description: "Complete call simulation module",
      steps: [
        "Navigate to call simulation",
        "View instructions",
        "Play audio call 1",
        "Fill incident form",
        "Submit and continue",
        "Complete call 2",
        "Complete call 3",
        "Verify all responses saved",
      ],
      criticalPath: true,
    },
    {
      name: "Situational Judgement Flow",
      description: "Complete SJT module",
      steps: [
        "Navigate to SJT",
        "View instructions",
        "Answer MCQ questions",
        "Answer text questions",
        "View AI feedback",
        "Complete all questions",
        "Verify results",
      ],
      criticalPath: true,
    },
  ],
  adminFlows: [
    {
      name: "Admin Dashboard Flow",
      description: "Admin views and manages system",
      steps: [
        "Login as admin",
        "View dashboard stats",
        "Check candidate list",
        "View analytics",
        "Generate reports",
      ],
      permissions: ["admin"],
    },
    {
      name: "Candidate Management Flow",
      description: "Admin manages candidates",
      steps: [
        "Navigate to candidates page",
        "Search for candidate",
        "View candidate details",
        "Check assessment progress",
        "Export candidate data",
      ],
      permissions: ["admin"],
    },
    {
      name: "Content Management Flow",
      description: "Admin manages assessment content",
      steps: [
        "Navigate to texts page",
        "Add new typing text",
        "Edit existing text",
        "Navigate to questions",
        "Add new question",
        "Navigate to audio calls",
        "Upload new audio",
      ],
      permissions: ["admin"],
    },
    {
      name: "Reports Flow",
      description: "Admin generates and exports reports",
      steps: [
        "Navigate to reports",
        "Select time period",
        "View group summaries",
        "Attempt CSV export",
        "Attempt PDF export",
      ],
      permissions: ["admin"],
    },
  ],
};

/**
 * Assessment modules configuration
 */
export const assessmentModules = [
  {
    name: "typing" as const,
    route: "/assessment/typing",
    hasPractice: true,
    hasTimer: true,
    hasProgress: true,
    autoSave: true,
  },
  {
    name: "call-simulation" as const,
    route: "/assessment/call-simulation",
    hasPractice: false,
    hasTimer: false,
    hasProgress: true,
    autoSave: false,
  },
  {
    name: "situational-judgement" as const,
    route: "/assessment/situational-judgement",
    hasPractice: false,
    hasTimer: false,
    hasProgress: true,
    autoSave: false,
  },
];

/**
 * Load configuration with validation
 */
export function loadConfig(): QAConfig {
  // Validate paths exist
  if (!existsSync(defaultConfig.projectPaths.frontend)) {
    console.warn(
      `⚠️ Frontend path not found: ${defaultConfig.projectPaths.frontend}`,
    );
  }
  if (!existsSync(defaultConfig.projectPaths.backend)) {
    console.warn(
      `⚠️ Backend path not found: ${defaultConfig.projectPaths.backend}`,
    );
  }

  // Validate AI configuration
  if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    console.warn("⚠️ No AI API key configured. AI analysis will be limited.");
  }

  return defaultConfig;
}

/**
 * Get specific configuration section
 */
export function getConfig<K extends keyof QAConfig>(key: K): QAConfig[K] {
  return defaultConfig[key];
}

export default loadConfig;
