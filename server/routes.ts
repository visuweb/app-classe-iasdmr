import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClassSchema, 
  insertStudentSchema, 
  insertAttendanceRecordSchema, 
  insertMissionaryActivitySchema,
  insertTeacherSchema,
  insertTeacherClassSchema,
  Teacher
} from "@shared/schema";
import { setupAuth } from "./auth";

// Middleware to check if user is authenticated
const ensureAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Não autenticado" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Middleware to check if user is admin
  const ensureAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Acesso negado. Apenas administradores podem acessar esta função." });
  };
  
  // Middleware to check if user is a regular teacher (not admin)
  const ensureTeacher = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && !req.user.isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Acesso negado. Apenas professores regulares podem acessar esta função." });
  };

  // Teacher routes
  app.get("/api/teachers", ensureAdmin, async (req, res) => {
    try {
      const teachers = await storage.getAllTeachers();
      // Remove passwords from response
      const sanitizedTeachers = teachers.map(({ password, ...rest }) => rest);
      res.json(sanitizedTeachers);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar professores" });
    }
  });

  app.get("/api/classes/:classId/teachers", ensureAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId, 10);
      const teachers = await storage.getTeachersByClassId(classId);
      // Remove passwords from response
      const sanitizedTeachers = teachers.map(({ password, ...rest }) => rest);
      res.json(sanitizedTeachers);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar professores da classe" });
    }
  });

  app.post("/api/teachers", ensureAdmin, async (req, res) => {
    try {
      const parsed = insertTeacherSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados de professor inválidos" });
      }
      
      // Check if teacher with this CPF already exists
      const existingTeacher = await storage.getTeacherByCpf(parsed.data.cpf);
      if (existingTeacher) {
        return res.status(409).json({ message: "Professor com este CPF já existe" });
      }
      
      const newTeacher = await storage.createTeacher(parsed.data);
      // Don't return the password in the response
      const { password, ...teacherData } = newTeacher;
      res.status(201).json(teacherData);
    } catch (error) {
      console.error("Error creating teacher:", error);
      res.status(500).json({ message: "Falha ao criar professor" });
    }
  });

  app.post("/api/teacher-classes", ensureAdmin, async (req, res) => {
    try {
      const parsed = insertTeacherClassSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos" });
      }
      
      const teacherClass = await storage.assignTeacherToClass(parsed.data);
      res.status(201).json(teacherClass);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Falha ao atribuir professor à classe" });
    }
  });

  // Classes routes
  app.get("/api/classes", ensureAuthenticated, async (req, res) => {
    try {
      const teacher = req.user as Teacher;
      
      // Se for admin, retorna todas as classes
      if (teacher.isAdmin) {
        const classes = await storage.getAllClasses();
        return res.json(classes);
      }
      
      // Se for professor regular, retorna apenas suas classes
      const teacherClasses = await storage.getClassesByTeacherId(teacher.id);
      res.json(teacherClasses);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar classes" });
    }
  });

  // Get class by ID
  app.get("/api/classes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.id, 10);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "ID de classe inválido" });
      }
      
      const classData = await storage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ message: "Classe não encontrada" });
      }
      
      // Verificar se o professor tem acesso a esta classe
      const teacher = req.user as Teacher;
      if (!teacher.isAdmin) {
        const teacherClasses = await storage.getClassesByTeacherId(teacher.id);
        const hasAccess = teacherClasses.some(c => c.id === classId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Acesso negado a esta classe" });
        }
      }
      
      res.json(classData);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar dados da classe" });
    }
  });

  app.post("/api/classes", ensureAdmin, async (req, res) => {
    try {
      const parsed = insertClassSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados de classe inválidos" });
      }
      
      const newClass = await storage.createClass(parsed.data);
      res.status(201).json(newClass);
    } catch (error) {
      res.status(500).json({ message: "Falha ao criar classe" });
    }
  });

  // Students routes
  app.get("/api/classes/:classId/students", ensureAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId, 10);
      const students = await storage.getStudentsByClassId(classId);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar alunos" });
    }
  });

  app.post("/api/students", ensureAuthenticated, async (req, res) => {
    try {
      // Verificar se é administrador ou se está adicionando alunos à sua própria classe
      const teacher = req.user as Teacher;
      
      if (!teacher.isAdmin) {
        const classId = parseInt(req.body.classId);
        const teacherClasses = await storage.getClassesByTeacherId(teacher.id);
        const isTeacherOfClass = teacherClasses.some(c => c.id === classId);
        
        if (!isTeacherOfClass) {
          return res.status(403).json({ 
            message: "Você não tem permissão para adicionar alunos a esta classe" 
          });
        }
      }
      
      const parsed = insertStudentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados de aluno inválidos" });
      }
      
      const newStudent = await storage.createStudent(parsed.data);
      res.status(201).json(newStudent);
    } catch (error) {
      res.status(500).json({ message: "Falha ao criar aluno" });
    }
  });
  
  // Rota para atualizar um aluno
  app.put("/api/students/:id", ensureAuthenticated, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id, 10);
      if (isNaN(studentId)) {
        return res.status(400).json({ message: "ID de aluno inválido" });
      }
      
      // Verificar se o aluno existe e obter dados da classe
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Aluno não encontrado" });
      }
      
      // Verificar se tem permissão para editar este aluno
      const teacher = req.user as Teacher;
      if (!teacher.isAdmin) {
        const teacherClasses = await storage.getClassesByTeacherId(teacher.id);
        const hasAccess = teacherClasses.some(c => c.id === student.classId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Você não tem permissão para editar alunos desta classe" 
          });
        }
      }
      
      // Validar os dados de atualização
      const parsed = insertStudentSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados de aluno inválidos" });
      }
      
      // Atualizar aluno
      const updatedStudent = await storage.updateStudent(studentId, parsed.data);
      if (!updatedStudent) {
        return res.status(404).json({ message: "Aluno não encontrado" });
      }
      
      res.json(updatedStudent);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Falha ao atualizar aluno" });
    }
  });
  
  // Rota para excluir um aluno
  app.delete("/api/students/:id", ensureAuthenticated, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id, 10);
      if (isNaN(studentId)) {
        return res.status(400).json({ message: "ID de aluno inválido" });
      }
      
      // Verificar se o aluno existe e obter dados da classe
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Aluno não encontrado" });
      }
      
      // Verificar se tem permissão para excluir este aluno
      const teacher = req.user as Teacher;
      if (!teacher.isAdmin) {
        const teacherClasses = await storage.getClassesByTeacherId(teacher.id);
        const hasAccess = teacherClasses.some(c => c.id === student.classId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Você não tem permissão para excluir alunos desta classe" 
          });
        }
      }
      
      // Excluir aluno
      await storage.deleteStudent(studentId);
      res.status(200).json({ message: "Aluno excluído com sucesso" });
    } catch (error: any) {
      // Verificar se é erro de registros de presença
      if (error.message && error.message.includes("registros de presença")) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message || "Falha ao excluir aluno" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", ensureAuthenticated, async (req, res) => {
    try {
      const classId = req.query.classId ? parseInt(req.query.classId as string, 10) : undefined;
      const records = await storage.getAttendanceRecords(classId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar registros de presença" });
    }
  });

  app.post("/api/attendance", ensureTeacher, async (req, res) => {
    try {
      const parsed = insertAttendanceRecordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados de presença inválidos" });
      }
      
      const newRecord = await storage.createAttendanceRecord(parsed.data);
      res.status(201).json(newRecord);
    } catch (error) {
      res.status(500).json({ message: "Falha ao criar registro de presença" });
    }
  });

  // Missionary activities routes
  app.get("/api/missionary-activities", ensureAuthenticated, async (req, res) => {
    try {
      const classId = req.query.classId ? parseInt(req.query.classId as string, 10) : undefined;
      const activities = await storage.getMissionaryActivities(classId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar atividades missionárias" });
    }
  });

  app.post("/api/missionary-activities", ensureTeacher, async (req, res) => {
    try {
      const parsed = insertMissionaryActivitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados de atividade missionária inválidos" });
      }
      
      const newActivity = await storage.createMissionaryActivity(parsed.data);
      res.status(201).json(newActivity);
    } catch (error) {
      res.status(500).json({ message: "Falha ao criar atividade missionária" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
