import { config } from 'dotenv';
config(); // Load .env BEFORE anything else
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

  // ... (rest of the setup logic stays the same)
  app.use(cors());
  app.use(express.json());

  // Supabase Admin client (SERVICE_ROLE_KEY bypasses RLS and email confirmation)
  let supabaseAdmin: SupabaseClient | null = null;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_URL) {
    supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    console.log("✅ Supabase Admin client initialized.");
  } else {
    console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY not set. Admin routes will be unavailable.");
  }

  // =============================================
  // ADMIN API ROUTES
  // =============================================

  // POST /api/admin/create-user
  // Creates user with immediate activation (no email confirmation)
  app.post("/api/admin/create-user", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({
        error: "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. Adicione-a no arquivo .env e reinicie."
      });
    }

    const { email, password, name, role, company_id, team_id, commission_type, commission_value } = req.body;

    if (!email || !password || !name || !role || !company_id) {
      return res.status(400).json({ error: "Campos obrigatórios: email, password, name, role, company_id" });
    }

    try {
      // Create user in Auth with email_confirm = true (immediate activation)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (authError) return res.status(400).json({ error: authError.message });
      if (!authData.user) return res.status(500).json({ error: "Falha ao criar usuário no Auth." });

      // Insert profile into public.users
      const profileData: any = {
        id: authData.user.id,
        company_id,
        name,
        email,
        role,
        status: "active",
        created_at: new Date().toISOString(),
      };

      if (role === "broker" && team_id) {
        profileData.team_id = team_id;
        profileData.commission_type = commission_type || "percentage";
        profileData.commission_value = commission_value || 0;
      }

      const { error: profileError } = await supabaseAdmin.from("users").insert(profileData);

      if (profileError) {
        // Rollback auth user if profile insert fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({ error: `Erro ao criar perfil: ${profileError.message}` });
      }

      return res.status(201).json({
        success: true,
        userId: authData.user.id,
        message: "Usuário criado e ativado com sucesso!"
      });
    } catch (err: any) {
      console.error("Error in /api/admin/create-user:", err);
      return res.status(500).json({ error: err.message || "Erro interno do servidor." });
    }
  });

  // DELETE /api/admin/delete-user/:id
  // Deletes a user from Auth and from public.users
  app.delete("/api/admin/delete-user/:id", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({
        error: "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. Adicione-a no arquivo .env e reinicie."
      });
    }

    const { id } = req.params;

    try {
      // Delete profile from public.users
      const { error: profileError } = await supabaseAdmin.from("users").delete().eq("id", id);
      if (profileError) return res.status(500).json({ error: `Erro ao remover perfil: ${profileError.message}` });

      // Delete from Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) {
        console.error("Auth user delete failed:", authError.message);
      }

      return res.json({ success: true, message: "Usuário excluído com sucesso!" });
    } catch (err: any) {
      console.error("Error in /api/admin/delete-user:", err);
      return res.status(500).json({ error: err.message || "Erro interno do servidor." });
    }
  });

  // GET /api/health
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", adminReady: !!supabaseAdmin });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const fs = require('fs');
    const distPath = path.join(process.cwd(), "dist");
    
    // Helper to serve index.html with injected environment variables
    const serveIndexWithEnv = (res: any) => {
      try {
        let html = fs.readFileSync(path.join(distPath, "index.html"), 'utf8');
        const envScript = `<script>window.__ENV__ = ${JSON.stringify({
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
        })}</script>`;
        html = html.replace('</head>', `${envScript}\n</head>`);
        res.send(html);
      } catch (err) {
        console.error("Error serving index.html:", err);
        res.status(500).send("Internal Server Error");
      }
    };

    // Serve injected index.html for root
    app.get("/", (_req, res) => serveIndexWithEnv(res));
    app.get("/index.html", (_req, res) => serveIndexWithEnv(res));

    app.use(express.static(distPath));
    app.get("*", (_req, res) => serveIndexWithEnv(res));
  }

  app.listen(PORT, "0.0.0.0", () => {
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    console.log(`Server running on ${appUrl}`);
  });
}

startServer();
