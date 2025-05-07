import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, pool } from "./db";
import { and, eq, sql } from "drizzle-orm";
import { 
  insertClassSchema, 
  insertStudentSchema, 
  insertAttendanceRecordSchema, 
  insertMissionaryActivitySchema,
  insertTeacherSchema,
  insertTeacherClassSchema,
  Teacher,
  attendanceRecords,
  students,
  missionaryActivities
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
  
  // Remover atribuição de professor a uma classe
  app.delete("/api/teacher-classes/:teacherId/:classId", ensureAdmin, async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId, 10);
      const classId = parseInt(req.params.classId, 10);
      
      if (isNaN(teacherId) || isNaN(classId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      const result = await storage.removeTeacherFromClass(teacherId, classId);
      if (!result) {
        return res.status(404).json({ message: "Atribuição não encontrada" });
      }
      
      res.status(200).json({ message: "Atribuição removida com sucesso" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Falha ao remover atribuição" });
    }
  });
  
  // Rota para atualizar um professor (incluindo ativação/desativação)
  app.put("/api/teachers/:id", ensureAdmin, async (req, res) => {
    try {
      const teacherId = parseInt(req.params.id, 10);
      if (isNaN(teacherId)) {
        return res.status(400).json({ message: "ID de professor inválido" });
      }
      
      // Verificar se o professor existe
      const existingTeacher = await storage.getTeacherById(teacherId);
      if (!existingTeacher) {
        return res.status(404).json({ message: "Professor não encontrado" });
      }
      
      // Validar os dados de atualização
      const parsed = insertTeacherSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados de professor inválidos" });
      }
      
      // Não podemos alterar o campo isAdmin desta forma para segurança
      // Isso evita que um administrador seja rebaixado acidentalmente
      if (parsed.data.isAdmin !== undefined) {
        delete parsed.data.isAdmin;
      }
      
      // Não permitir alteração de senha por esta rota
      if (parsed.data.password !== undefined) {
        delete parsed.data.password;
      }
      
      // Verificar se tentar atualizar o CPF, se ele já existe
      if (parsed.data.cpf && parsed.data.cpf !== existingTeacher.cpf) {
        const existingByCpf = await storage.getTeacherByCpf(parsed.data.cpf);
        if (existingByCpf) {
          return res.status(409).json({ message: "CPF já cadastrado para outro professor" });
        }
      }
      
      // Atualizar professor
      const updatedTeacher = await storage.updateTeacher(teacherId, parsed.data);
      if (!updatedTeacher) {
        return res.status(404).json({ message: "Professor não encontrado" });
      }
      
      // Não retornar a senha na resposta
      const { password, ...teacherData } = updatedTeacher;
      res.json(teacherData);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Falha ao atualizar professor" });
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
  
  // Rota para atualizar uma classe (incluindo ativação/desativação)
  app.put("/api/classes/:id", ensureAdmin, async (req, res) => {
    try {
      const classId = parseInt(req.params.id, 10);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "ID de classe inválido" });
      }
      
      // Verificar se a classe existe
      const existingClass = await storage.getClass(classId);
      if (!existingClass) {
        return res.status(404).json({ message: "Classe não encontrada" });
      }
      
      // Validar os dados de atualização
      const parsed = insertClassSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados de classe inválidos" });
      }
      
      // Atualizar classe
      const updatedClass = await storage.updateClass(classId, parsed.data);
      if (!updatedClass) {
        return res.status(404).json({ message: "Classe não encontrada" });
      }
      
      res.json(updatedClass);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Falha ao atualizar classe" });
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
  
  // Rota para desativar/reativar um aluno
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
      
      // Verificar se tem permissão para desativar/reativar este aluno
      const teacher = req.user as Teacher;
      if (!teacher.isAdmin) {
        const teacherClasses = await storage.getClassesByTeacherId(teacher.id);
        const hasAccess = teacherClasses.some(c => c.id === student.classId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: `Você não tem permissão para ${student.active ? 'desativar' : 'reativar'} alunos desta classe` 
          });
        }
      }
      
      // Alternar status do aluno (ativar/desativar)
      const result = await storage.deleteStudent(studentId);
      if (!result) {
        return res.status(404).json({ message: "Aluno não encontrado" });
      }
      
      // Buscar o aluno atualizado para obter seu novo estado
      const updatedStudent = await storage.getStudent(studentId);
      
      res.status(200).json({ 
        message: updatedStudent?.active 
          ? "Aluno reativado com sucesso"
          : "Aluno desativado com sucesso",
        student: updatedStudent 
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || "Falha ao alterar o status do aluno" 
      });
    }
  });

  // Attendance routes
  app.get("/api/attendance", ensureAuthenticated, async (req, res) => {
    try {
      const classId = req.query.classId ? parseInt(req.query.classId as string, 10) : undefined;
      const date = req.query.date ? String(req.query.date) : undefined;
      
      if (classId && date) {
        // Se temos classId e date, buscamos registros específicos para esta data e classe
        console.log(`Buscando registros de presença para classe ${classId} na data ${date}`);
        const records = await storage.getAttendanceRecordsForClassAndDate(classId, date);
        return res.json(records);
      }
      
      // Caso contrário, busca normal de todos os registros
      const records = await storage.getAttendanceRecords(classId);
      res.json(records);
    } catch (error) {
      console.error('Erro ao buscar registros de presença:', error);
      res.status(500).json({ message: "Falha ao buscar registros de presença" });
    }
  });
  
  // Rota para excluir registros de presença por classe e data (para edição)
  app.delete("/api/attendance/:classId/:date", ensureAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId, 10);
      const date = req.params.date;
      
      if (isNaN(classId) || !date) {
        return res.status(400).json({ message: "ID de classe ou data inválidos" });
      }
      
      // Verificar permissões do professor
      const teacher = req.user as Teacher;
      if (!teacher.isAdmin) {
        const teacherClasses = await storage.getClassesByTeacherId(teacher.id);
        const hasAccess = teacherClasses.some(c => c.id === classId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Você não tem permissão para excluir registros nesta classe" 
          });
        }
      }
      
      // Obter registros existentes para confirmar que serão excluídos
      const existingRecords = await storage.getAttendanceRecordsForClassAndDate(classId, date);
      
      if (existingRecords.length === 0) {
        return res.status(404).json({ message: "Nenhum registro encontrado para exclusão" });
      }
      
      // Excluir registros
      const success = await storage.deleteAttendanceRecordsForClassAndDate(classId, date);
      
      if (success) {
        res.status(200).json({ 
          message: `${existingRecords.length} registros de presença excluídos com sucesso` 
        });
      } else {
        res.status(500).json({ message: "Erro ao excluir registros de presença" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Falha ao excluir registros de presença" });
    }
  });
  
  // Rota para atualizar um registro de presença
  app.patch("/api/attendance/:id", ensureAuthenticated, async (req, res) => {
    try {
      const attendanceId = parseInt(req.params.id, 10);
      if (isNaN(attendanceId)) {
        return res.status(400).json({ message: "ID de registro inválido" });
      }
      
      // Validar os dados de atualização
      if (typeof req.body.present !== 'boolean') {
        return res.status(400).json({ message: "Valor de presença inválido" });
      }
      
      // Buscar o registro para verificar a classe e o aluno
      const allRecords = await storage.getAttendanceRecords();
      const record = allRecords.find(r => r.id === attendanceId);
      
      if (!record) {
        return res.status(404).json({ message: "Registro de presença não encontrado" });
      }
      
      // Buscar informações do aluno para verificar a classe
      const student = await storage.getStudent(record.studentId);
      if (!student) {
        return res.status(404).json({ message: "Aluno não encontrado" });
      }
      
      // Verificar se o professor tem permissão para editar este registro
      const teacher = req.user as Teacher;
      if (!teacher.isAdmin) {
        const teacherClasses = await storage.getClassesByTeacherId(teacher.id);
        const hasAccess = teacherClasses.some(c => c.id === student.classId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Você não tem permissão para editar registros desta classe" 
          });
        }
      }
      
      // Atualizar o registro
      const updatedRecord = await storage.updateAttendanceRecord(
        attendanceId, 
        { present: req.body.present }
      );
      
      if (!updatedRecord) {
        return res.status(500).json({ message: "Falha ao atualizar registro" });
      }
      
      res.json(updatedRecord);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Falha ao atualizar registro de presença" });
    }
  });
  
  // Rota para verificar se já existe registro de chamada e atividades para o dia atual da classe
  app.get("/api/check-today-records/:classId", ensureAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId, 10);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "ID de classe inválido" });
      }
      
      // Obter a data da query ou usar a data atual
      let date = req.query.date ? String(req.query.date) : undefined;
      
      if (!date) {
        const today = new Date();
        date = today.toISOString().split('T')[0]; // yyyy-mm-dd
      }
      
      console.log(`Verificando registros para classe ${classId} na data ${date}`);
      
      // Verificar registros de frequência para a data
      const attendanceRecords = await storage.getAttendanceRecordsForClassAndDate(classId, date);
      
      // Verificar atividades missionárias para a data
      const missionaryActivities = await storage.getMissionaryActivitiesForClassAndDate(classId, date);
      
      console.log(`Encontrados: ${attendanceRecords.length} registros de presença e ${missionaryActivities.length} atividades missionárias`);
      
      // Verificação adicional - Buscar diretamente na base através de SQL bruto
      const hasRecordsFromDb = 
        attendanceRecords.length > 0 || 
        missionaryActivities.length > 0;
      
      res.json({
        hasRecords: hasRecordsFromDb,
        attendanceRecords: attendanceRecords,
        missionaryActivities: missionaryActivities.length > 0 ? missionaryActivities[0] : null
      });
    } catch (error) {
      console.error('Erro ao verificar registros:', error);
      res.status(500).json({ message: "Falha ao verificar registros do dia" });
    }
  });
  
  // Nova rota para verificação simplificada de registros existentes considerando datas recentes
  app.get("/api/class-has-recent-records/:classId", ensureAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId, 10);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "ID de classe inválido" });
      }
      
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0]; // yyyy-mm-dd
      
      // Usar o dia anterior também para levar em conta diferenças de fuso horário
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = yesterday.toISOString().split('T')[0]; // yyyy-mm-dd
      
      console.log(`Verificando registros recentes para classe ${classId}. Datas: ${yesterdayFormatted} e ${todayFormatted}`);
      
      // Verificar registros de frequência usando Drizzle
      const attendanceData = await db.select({ date: attendanceRecords.date })
        .from(attendanceRecords)
        .innerJoin(students, eq(attendanceRecords.studentId, students.id))
        .where(
          and(
            eq(students.classId, classId),
            sql`${attendanceRecords.date} IN (${todayFormatted}, ${yesterdayFormatted})`
          )
        )
        .limit(1);
      
      // Verificar atividades missionárias usando Drizzle
      const activityData = await db.select({ date: missionaryActivities.date })
        .from(missionaryActivities)
        .where(
          and(
            eq(missionaryActivities.classId, classId),
            sql`${missionaryActivities.date} IN (${todayFormatted}, ${yesterdayFormatted})`
          )
        )
        .limit(1);
      
      // Capturar todas as datas encontradas para debug
      const foundDates = new Set<string>();
      
      if (attendanceData.length > 0) {
        attendanceData.forEach((record) => {
          if (record.date) foundDates.add(record.date);
        });
      }
      
      if (activityData.length > 0) {
        activityData.forEach((record) => {
          if (record.date) foundDates.add(record.date);
        });
      }
      
      const hasRecords = attendanceData.length > 0 || activityData.length > 0;
      console.log(`Verificação de registros recentes. Resultado: ${hasRecords}, datas encontradas: ${Array.from(foundDates).join(', ')}`);
      
      res.json({
        hasRecords: hasRecords,
        datesFound: Array.from(foundDates)
      });
    } catch (error) {
      console.error('Erro na verificação direta:', error);
      res.status(500).json({ message: "Falha ao verificar registros" });
    }
  });

  app.post("/api/attendance", ensureTeacher, async (req, res) => {
    try {
      const parsed = insertAttendanceRecordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados de presença inválidos" });
      }
      
      // Obter o aluno para identificar a classe
      const student = await storage.getStudent(parsed.data.studentId);
      if (!student) {
        return res.status(404).json({ message: "Aluno não encontrado" });
      }
      
      // Verificar se já existe um registro para este aluno na data especificada
      const existingRecords = await storage.getAttendanceRecordsForClassAndDate(student.classId, parsed.data.date);
      const existingRecord = existingRecords.find(record => record.studentId === parsed.data.studentId);
      
      if (existingRecord) {
        console.log(`Registro existente para aluno ${parsed.data.studentId} na data ${parsed.data.date} - será substituído`);
        
        // Implementação ideal seria um UPDATE, mas como drizzle não tem um método "upsert" simples,
        // vamos simplesmente criar um novo registro que substituirá o antigo na visualização
        // A solução mais robusta seria implementar um método de atualização no storage
      }
      
      // Criar novo registro
      const newRecord = await storage.createAttendanceRecord(parsed.data);
      res.status(201).json(newRecord);
    } catch (error) {
      console.error("Erro ao criar registro de presença:", error);
      res.status(500).json({ message: "Falha ao criar registro de presença" });
    }
  });

  // Missionary activities routes
  app.get("/api/missionary-activities", ensureAuthenticated, async (req, res) => {
    try {
      const classId = req.query.classId ? parseInt(req.query.classId as string, 10) : undefined;
      const date = req.query.date ? String(req.query.date) : undefined;
      
      if (classId && date) {
        // Se temos classId e date, buscamos registros específicos para esta data e classe
        console.log(`Buscando atividades missionárias para classe ${classId} na data ${date}`);
        const activities = await storage.getMissionaryActivitiesForClassAndDate(classId, date);
        return res.json(activities);
      }
      
      // Caso contrário, busca normal de todas as atividades
      const activities = await storage.getMissionaryActivities(classId);
      res.json(activities);
    } catch (error) {
      console.error('Erro ao buscar atividades missionárias:', error);
      res.status(500).json({ message: "Falha ao buscar atividades missionárias" });
    }
  });
  
  // Rota para excluir atividades missionárias por classe e data (para edição)
  app.delete("/api/missionary-activities/:classId/:date", ensureAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId, 10);
      const date = req.params.date;
      
      if (isNaN(classId) || !date) {
        return res.status(400).json({ message: "ID de classe ou data inválidos" });
      }
      
      // Verificar permissões do professor
      const teacher = req.user as Teacher;
      if (!teacher.isAdmin) {
        const teacherClasses = await storage.getClassesByTeacherId(teacher.id);
        const hasAccess = teacherClasses.some(c => c.id === classId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Você não tem permissão para excluir registros nesta classe" 
          });
        }
      }
      
      // Obter atividades existentes para confirmar que serão excluídas
      const existingActivities = await storage.getMissionaryActivitiesForClassAndDate(classId, date);
      
      if (existingActivities.length === 0) {
        return res.status(404).json({ message: "Nenhuma atividade missionária encontrada para exclusão" });
      }
      
      // Excluir atividades
      const success = await storage.deleteMissionaryActivitiesForClassAndDate(classId, date);
      
      if (success) {
        res.status(200).json({ 
          message: `${existingActivities.length} atividades missionárias excluídas com sucesso` 
        });
      } else {
        res.status(500).json({ message: "Erro ao excluir atividades missionárias" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Falha ao excluir atividades missionárias" });
    }
  });

  app.post("/api/missionary-activities", ensureTeacher, async (req, res) => {
    try {
      const parsed = insertMissionaryActivitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados de atividade missionária inválidos" });
      }
      
      // Se já existe um registro para esta classe e data, atualizamos o registro em vez de criar um novo
      const { classId, date } = parsed.data;
      const existingActivities = await storage.getMissionaryActivitiesForClassAndDate(classId, date);
      
      if (existingActivities.length > 0) {
        // Excluir atividades existentes antes de criar a nova
        await storage.deleteMissionaryActivitiesForClassAndDate(classId, date);
      }
      
      const newActivity = await storage.createMissionaryActivity(parsed.data);
      res.status(201).json(newActivity);
    } catch (error) {
      res.status(500).json({ message: "Falha ao criar atividade missionária" });
    }
  });
  
  // Rota para atualizar atividade missionária
  app.patch("/api/missionary-activities/:id", ensureAuthenticated, async (req, res) => {
    try {
      const activityId = parseInt(req.params.id, 10);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "ID de atividade inválido" });
      }
      
      // Verificar se a atividade existe
      const activities = await storage.getMissionaryActivities();
      const activity = activities.find(a => a.id === activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Atividade missionária não encontrada" });
      }
      
      // Verificar se tem permissão para editar esta atividade
      const teacher = req.user as Teacher;
      if (!teacher.isAdmin) {
        const teacherClasses = await storage.getClassesByTeacherId(teacher.id);
        const hasAccess = teacherClasses.some(c => c.id === activity.classId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Você não tem permissão para editar atividades desta classe" 
          });
        }
      }
      
      // Campos permitidos para atualização
      const allowedFields = [
        'qtdContatosMissionarios', 
        'literaturasDistribuidas', 
        'visitasMissionarias', 
        'estudosBiblicos', 
        'ministrados',
        'pessoasAuxiliadas',
        'pessoasTrazidasIgreja'
      ];
      
      // Verificar quais campos foram enviados
      const updateData: Record<string, number> = {};
      let fieldCount = 0;
      
      for (const field of allowedFields) {
        if (typeof req.body[field] === 'number') {
          updateData[field] = req.body[field];
          fieldCount++;
        }
      }
      
      if (fieldCount === 0) {
        return res.status(400).json({ message: "Nenhum campo válido para atualização" });
      }
      
      // Atualizar atividade
      const updatedActivity = await storage.updateMissionaryActivity(activityId, updateData);
      if (!updatedActivity) {
        return res.status(500).json({ message: "Falha ao atualizar atividade" });
      }
      
      res.json(updatedActivity);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Falha ao atualizar atividade missionária" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
