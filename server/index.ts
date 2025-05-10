import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Verificar se o banco de dados está online e semear dados iniciais
  try {
    await db.execute("SELECT 1");
    console.log("Database connection established");
    
    // Verifica se estamos em ambiente de desenvolvimento
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Semear dados de teste apenas se estiver em ambiente de desenvolvimento
    // e se for uma instância de DatabaseStorage
    if (isDevelopment && 'seedTestTeacher' in storage) {
      // Verificar se a variável SEED_TEST_DATA não está definida como 'false'
      if (process.env.SEED_TEST_DATA !== 'false') {
        console.log("Seeding test data (set SEED_TEST_DATA=false to disable)");
        await (storage as any).seedTestTeacher();
      } else {
        console.log("Test data seeding disabled via environment variable");
      }
    }
    
    // Criar usuário administrador (sempre executado, pois é necessário para o login)
    if ('createAdminUser' in storage) {
      await (storage as any).createAdminUser();
    }
  } catch (error) {
    console.error("Database connection failed:", error);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 3000 to evitar conflitos
  // this serves both the API and the client.
  // Change port if there's a conflict with other services
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  
  // Configuração de escuta do servidor com verificação de compatibilidade para Windows
  const serverOptions: any = {
    port,
    host: "0.0.0.0"  // Bind to all interfaces instead of just localhost
  };
  
  // Adiciona reusePort apenas em sistemas que não sejam Windows
  if (process.platform !== 'win32') {
    serverOptions.reusePort = true;
  }
  
  server.listen(serverOptions, () => {
    log(`serving on port ${port}`);
  });
})();