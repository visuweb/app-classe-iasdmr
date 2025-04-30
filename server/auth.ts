import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { Teacher } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends Teacher {}
  }
}

// Configure session secret from environment or use a default for development
const SESSION_SECRET = process.env.SESSION_SECRET || "turma-classe-secret-key-dev";

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: storage.sessionStore,
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport to use username (cpf) and password
  passport.use(
    new LocalStrategy(
      {
        usernameField: "cpf", // use cpf field as username
      },
      async (cpf, password, done) => {
        try {
          // Verificar admin especial com login "admin"
          if (cpf === "admin") {
            // Login especial para o admin
            const adminTeacher = await storage.getTeacherByCpf("admin");
            if (adminTeacher && await storage.comparePasswords(password, adminTeacher.password)) {
              return done(null, adminTeacher);
            }
            return done(null, false, { message: "Credenciais de admin inválidas" });
          }
          
          // Login normal para professores
          const teacher = await storage.validateTeacher(cpf, password);
          if (!teacher) {
            return done(null, false, { message: "Credenciais inválidas" });
          }
          return done(null, teacher);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize teacher to session
  passport.serializeUser((teacher: Teacher, done) => {
    done(null, teacher.id);
  });

  // Deserialize teacher from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const teacher = await storage.getTeacherById(id);
      done(null, teacher);
    } catch (error) {
      done(error);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, teacher: Teacher | false, info: { message?: string }) => {
      if (err) {
        return next(err);
      }
      if (!teacher) {
        return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      }
      req.login(teacher, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({ 
          id: teacher.id,
          name: teacher.name,
          cpf: teacher.cpf
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.status(200).json({ message: "Logout realizado com sucesso" });
    });
  });

  // Current user route
  app.get("/api/current-teacher", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    // Return teacher info without sensitive data like password
    const { password, ...teacherData } = req.user;
    return res.json(teacherData);
  });

  // Get teacher's classes
  app.get("/api/teacher/classes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    try {
      const classes = await storage.getClassesByTeacherId(req.user.id);
      return res.json(classes);
    } catch (error) {
      return res.status(500).json({ message: "Erro ao obter classes do professor" });
    }
  });
}