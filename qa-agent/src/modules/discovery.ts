/**
 * CTRL QA Agent - Discovery Module
 * Automatically discovers and analyzes project structure
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, relative, extname, basename } from "path";
import { glob } from "glob";
import {
  ProjectStructure,
  RouteInfo,
  ComponentInfo,
  ApiEndpoint,
  PageInfo,
  AuthConfig,
  FormElement,
  PageAction,
} from "../types/index.js";
import { loadConfig } from "../config/index.js";

/**
 * Main discovery class for analyzing project structure
 */
export class ProjectDiscovery {
  private config = loadConfig();
  private frontendPath: string;
  private backendPath: string;

  constructor() {
    this.frontendPath = this.config.projectPaths.frontend;
    this.backendPath = this.config.projectPaths.backend;
  }

  /**
   * Discover complete project structure
   */
  async discoverProject(): Promise<ProjectStructure> {
    console.log("🔍 Discovering project structure...\n");

    const [frontendInfo, backendInfo] = await Promise.all([
      this.discoverFrontend(),
      this.discoverBackend(),
    ]);

    const structure: ProjectStructure = {
      name: "CTRL Assessment Platform",
      type: "nextjs",
      version: this.getProjectVersion(),
      routes: [...frontendInfo.routes],
      components: frontendInfo.components,
      apiEndpoints: backendInfo.endpoints,
      authConfig: this.discoverAuthConfig(),
      pages: frontendInfo.pages,
    };

    console.log(`✅ Discovered ${structure.routes.length} routes`);
    console.log(`✅ Discovered ${structure.components.length} components`);
    console.log(`✅ Discovered ${structure.apiEndpoints.length} API endpoints`);
    console.log(`✅ Discovered ${structure.pages.length} pages\n`);

    return structure;
  }

  /**
   * Discover frontend structure (Next.js app router)
   */
  private async discoverFrontend(): Promise<{
    routes: RouteInfo[];
    components: ComponentInfo[];
    pages: PageInfo[];
  }> {
    const appDir = join(this.frontendPath, "src", "app");
    const componentsDir = join(this.frontendPath, "src", "components");

    const routes: RouteInfo[] = [];
    const pages: PageInfo[] = [];
    const components: ComponentInfo[] = [];

    // Discover pages from app directory
    if (existsSync(appDir)) {
      const pageFiles = await glob("**/page.tsx", { cwd: appDir });

      for (const file of pageFiles) {
        const fullPath = join(appDir, file);
        const routePath = this.fileToRoute(file);
        const content = this.safeReadFile(fullPath);

        const pageInfo = this.analyzePageContent(content, routePath, file);
        pages.push(pageInfo);

        routes.push({
          path: routePath,
          type: routePath.includes("[") ? "dynamic" : "page",
          protected: this.isProtectedRoute(routePath, content),
          file: file,
        });
      }

      // Discover API routes
      const apiFiles = await glob("api/**/route.ts", { cwd: appDir });
      for (const file of apiFiles) {
        const routePath = "/api" + this.fileToRoute(file).replace("/route", "");
        routes.push({
          path: routePath,
          type: "api",
          protected: false,
          file: file,
        });
      }
    }

    // Discover components
    if (existsSync(componentsDir)) {
      const componentFiles = await glob("**/*.tsx", { cwd: componentsDir });

      for (const file of componentFiles) {
        const fullPath = join(componentsDir, file);
        const content = this.safeReadFile(fullPath);

        components.push(this.analyzeComponent(content, file));
      }
    }

    return { routes, components, pages };
  }

  /**
   * Discover backend structure (Strapi)
   */
  private async discoverBackend(): Promise<{ endpoints: ApiEndpoint[] }> {
    const apiDir = join(this.backendPath, "src", "api");
    const endpoints: ApiEndpoint[] = [];

    if (existsSync(apiDir)) {
      const entities = readdirSync(apiDir).filter((item) => {
        const itemPath = join(apiDir, item);
        return statSync(itemPath).isDirectory() && !item.startsWith(".");
      });

      for (const entity of entities) {
        // Standard Strapi CRUD endpoints
        const basePath = `/api/${entity}s`;

        endpoints.push(
          {
            path: basePath,
            method: "GET",
            authentication: true,
            controller: entity,
          },
          {
            path: basePath,
            method: "POST",
            authentication: true,
            controller: entity,
          },
          {
            path: `${basePath}/:id`,
            method: "GET",
            authentication: true,
            controller: entity,
          },
          {
            path: `${basePath}/:id`,
            method: "PUT",
            authentication: true,
            controller: entity,
          },
          {
            path: `${basePath}/:id`,
            method: "DELETE",
            authentication: true,
            controller: entity,
          },
        );
      }

      // Add auth endpoints
      endpoints.push(
        { path: "/api/auth/local", method: "POST", authentication: false },
        {
          path: "/api/auth/local/register",
          method: "POST",
          authentication: false,
        },
        { path: "/api/users/me", method: "GET", authentication: true },
      );
    }

    return { endpoints };
  }

  /**
   * Discover authentication configuration
   */
  private discoverAuthConfig(): AuthConfig {
    return {
      provider: "next-auth",
      routes: {
        login: "/auth/login",
        register: "/auth/register",
        logout: "/api/auth/signout",
        forgotPassword: "/auth/forgot-password",
      },
      roles: ["Admin", "Candidate", "Recruiter"],
    };
  }

  /**
   * Convert file path to route
   */
  private fileToRoute(filePath: string): string {
    let route =
      "/" +
      filePath
        .replace(/\\/g, "/")
        .replace(/\/page\.tsx$/, "")
        .replace(/\/route\.ts$/, "")
        .replace(/\(.*?\)\//g, "") // Remove route groups like (auth)
        .replace(/\/+/g, "/");

    if (route === "/") return "/";
    return route.replace(/\/$/, "");
  }

  /**
   * Check if route requires authentication
   */
  private isProtectedRoute(route: string, content: string): boolean {
    const protectedPrefixes = [
      "/admin",
      "/dashboard",
      "/assessment",
      "/results",
      "/profile",
    ];
    const isProtectedPrefix = protectedPrefixes.some((prefix) =>
      route.startsWith(prefix),
    );
    const hasProtectedLayout =
      content.includes("ProtectedLayout") ||
      content.includes("AuthProvider") ||
      content.includes("useAuth");
    return isProtectedPrefix || hasProtectedLayout;
  }

  /**
   * Analyze page content to extract information
   */
  private analyzePageContent(
    content: string,
    route: string,
    file: string,
  ): PageInfo {
    const formElements: FormElement[] = [];
    const actions: PageAction[] = [];

    // Detect form inputs
    const inputMatches = content.matchAll(
      /<Input[^>]*name=["']([^"']+)["'][^>]*(?:type=["']([^"']+)["'])?[^>]*(?:required)?/g,
    );
    for (const match of inputMatches) {
      formElements.push({
        name: match[1],
        type: match[2] || "text",
        required: match[0].includes("required"),
      });
    }

    // Detect buttons
    const buttonMatches = content.matchAll(/<Button[^>]*>([^<]+)<\/Button>/g);
    for (const match of buttonMatches) {
      actions.push({
        type: match[0].includes('type="submit"') ? "submit" : "button",
        label: match[1].trim(),
      });
    }

    // Detect links
    const linkMatches = content.matchAll(
      /<Link[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/Link>/g,
    );
    for (const match of linkMatches) {
      actions.push({
        type: "link",
        label: match[2].trim() || match[1],
        target: match[1],
      });
    }

    return {
      route,
      title: this.extractTitle(content) || basename(file, ".tsx"),
      file,
      requiresAuth: this.isProtectedRoute(route, content),
      formElements,
      actions,
    };
  }

  /**
   * Analyze component content
   */
  private analyzeComponent(content: string, file: string): ComponentInfo {
    const name = basename(file, ".tsx");
    const interactions: string[] = [];

    // Detect interactions
    if (content.includes("onClick")) interactions.push("click");
    if (content.includes("onChange")) interactions.push("change");
    if (content.includes("onSubmit")) interactions.push("submit");
    if (content.includes("useRouter")) interactions.push("navigation");

    return {
      name,
      file,
      type: file.includes("/ui/")
        ? "component"
        : file.includes("layout")
          ? "layout"
          : "component",
      hasForm: content.includes("<form") || content.includes("onSubmit"),
      hasAuth: content.includes("useAuth") || content.includes("session"),
      interactions,
    };
  }

  /**
   * Extract title from component
   */
  private extractTitle(content: string): string | null {
    const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
    if (titleMatch) return titleMatch[1];

    const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (h1Match) return h1Match[1];

    const cardTitleMatch = content.match(
      /<CardTitle[^>]*>([^<]+)<\/CardTitle>/,
    );
    if (cardTitleMatch) return cardTitleMatch[1];

    return null;
  }

  /**
   * Get project version from package.json
   */
  private getProjectVersion(): string {
    try {
      const pkg = JSON.parse(
        readFileSync(join(this.frontendPath, "package.json"), "utf-8"),
      );
      return pkg.version || "0.0.0";
    } catch {
      return "0.0.0";
    }
  }

  /**
   * Safely read file content
   */
  private safeReadFile(path: string): string {
    try {
      return readFileSync(path, "utf-8");
    } catch {
      return "";
    }
  }
}

/**
 * Discover CTRL-specific features
 */
export function discoverCTRLFeatures(): {
  assessmentModules: string[];
  adminFeatures: string[];
  authMethods: string[];
} {
  return {
    assessmentModules: [
      "typing-test",
      "call-simulation",
      "situational-judgement",
    ],
    adminFeatures: [
      "dashboard",
      "candidates-management",
      "companies-management",
      "questions-management",
      "texts-management",
      "audio-management",
      "reports",
      "analytics",
      "system-status",
    ],
    authMethods: ["email-password", "role-based-access", "protected-routes"],
  };
}

export default ProjectDiscovery;
