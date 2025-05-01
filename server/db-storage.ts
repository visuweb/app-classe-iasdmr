import { 
  Class, 
  InsertClass, 
  Student, 
  InsertStudent, 
  AttendanceRecord, 
  InsertAttendanceRecord, 
  MissionaryActivity, 
  InsertMissionaryActivity,
  Teacher,
  InsertTeacher,
  TeacherClass,
  InsertTeacherClass,
  classes,
  students,
  teachers,
  teacherClasses,
  attendanceRecords,
  missionaryActivities
} from "@shared/schema";
import { db, pool } from "./db";
import { IStorage } from "./storage";
import session from "express-session";
import { eq, and, count } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Funções de hash e verificação de senha
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Se o formato não for compatível (não contém o delimitador) ou se algum for nulo/indefinido
  if (!stored || !supplied) {
    return false;
  }
  
  // Para senhas legadas
  if (!stored.includes('.')) {
    return supplied === stored;
  }
  
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    if (hashedBuf.length !== suppliedBuf.length) {
      console.error("Buffer length mismatch", hashedBuf.length, suppliedBuf.length);
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// Criar store para sessões no PostgreSQL
const PostgresSessionStore = connectPg(session);

// Implementação com PostgreSQL
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Configurar o store de sessão com o pool do PostgreSQL
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // Teacher operations
  async getTeacherById(id: number): Promise<Teacher | undefined> {
    const results = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  }
  
  async getTeacherByCpf(cpf: string): Promise<Teacher | undefined> {
    const results = await db.select().from(teachers).where(eq(teachers.cpf, cpf)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  }
  
  async getAllTeachers(): Promise<Teacher[]> {
    // Retornar todos os professores, incluindo ativos e inativos
    // Isso permite que administradores vejam e possam reativar professores
    return await db.select().from(teachers);
  }
  
  async createTeacher(data: InsertTeacher): Promise<Teacher> {
    const results = await db.insert(teachers).values(data).returning();
    return results[0];
  }
  
  async updateTeacher(id: number, data: Partial<InsertTeacher>): Promise<Teacher | undefined> {
    // Verificar se o professor existe
    const teacherExists = await this.getTeacherById(id);
    if (!teacherExists) {
      return undefined;
    }
    
    // Se estiver atualizando a senha e não estiver em formato hash
    if (data.password && !data.password.includes('.')) {
      data.password = await hashPassword(data.password);
    }
    
    const results = await db
      .update(teachers)
      .set(data)
      .where(eq(teachers.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : undefined;
  }
  
  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    return comparePasswords(supplied, stored);
  }
  
  async validateTeacher(cpf: string, password: string): Promise<Teacher | null> {
    const teacher = await this.getTeacherByCpf(cpf);
    
    // Verificar se o professor existe
    if (!teacher) return null;
    
    // Verificar se o professor está ativo
    if (!teacher.active) return null;
    
    // Caso especial para o admin (compatibilidade com implementação anterior)
    if (cpf === 'admin' && password === 'admincei2025') {
      return teacher;
    }
    
    // Verificando senha com hash seguro para outros usuários
    if (await this.comparePasswords(password, teacher.password)) {
      return teacher;
    }
    
    return null;
  }
  
  async createAdminUser(): Promise<void> {
    try {
      // Verificar se o administrador já existe
      const existingAdmin = await this.getTeacherByCpf("admin");
      
      if (!existingAdmin) {
        // Criar o usuário administrador com senha direta para compatibilidade
        // com o método de autenticação especial para admin
        await this.createTeacher({
          name: "Administrador",
          cpf: "admin",
          password: "admincei2025", // senha não hash para facilitar a verificação
          isAdmin: true
        });
        console.log("Admin user created successfully");
      }
    } catch (error) {
      console.error("Error creating admin user:", error);
    }
  }
  
  // Teacher-Class operations
  async assignTeacherToClass(data: InsertTeacherClass): Promise<TeacherClass> {
    // Verificar se a classe já tem 2 professores
    const classTeachers = await this.getTeachersByClassId(data.classId);
    if (classTeachers.length >= 2) {
      throw new Error("Class already has the maximum of 2 teachers");
    }
    
    // Verificar se o professor já está atribuído à classe
    const existingAssignment = await db.select()
      .from(teacherClasses)
      .where(
        and(
          eq(teacherClasses.teacherId, data.teacherId),
          eq(teacherClasses.classId, data.classId)
        )
      ).limit(1);
    
    if (existingAssignment.length > 0) {
      throw new Error("Teacher is already assigned to this class");
    }
    
    // Atribuir professor à classe
    const results = await db.insert(teacherClasses).values(data).returning();
    return results[0];
  }
  
  async getClassesByTeacherId(teacherId: number): Promise<(Class & { role?: string })[]> {
    // Verificar se o professor é admin
    const teacher = await this.getTeacherById(teacherId);
    
    if (teacher?.isAdmin) {
      // Admin vê todas as classes
      const allClasses = await this.getAllClasses();
      return allClasses.map(classObj => ({
        ...classObj,
        role: 'admin'
      }));
    } else {
      // Professor regular vê apenas suas classes
      const results = await db
        .select({
          id: classes.id,
          name: classes.name,
          active: classes.active,
          createdAt: classes.createdAt
        })
        .from(teacherClasses)
        .innerJoin(classes, eq(teacherClasses.classId, classes.id))
        .where(
          and(
            eq(teacherClasses.teacherId, teacherId),
            eq(classes.active, true)
          )
        );
      
      // Adicionar role a cada classe
      return results.map(classObj => ({
        ...classObj,
        role: 'professor'
      }));
    }
  }
  
  async getTeachersByClassId(classId: number): Promise<Teacher[]> {
    return await db
      .select({
        id: teachers.id,
        name: teachers.name,
        cpf: teachers.cpf,
        password: teachers.password,
        isAdmin: teachers.isAdmin,
        active: teachers.active,
        createdAt: teachers.createdAt
      })
      .from(teacherClasses)
      .innerJoin(teachers, eq(teacherClasses.teacherId, teachers.id))
      .where(
        and(
          eq(teacherClasses.classId, classId),
          eq(teachers.active, true)
        )
      );
  }
  
  // Class operations
  async getAllClasses(): Promise<Class[]> {
    return await db.select().from(classes).where(eq(classes.active, true));
  }
  
  async getClass(id: number): Promise<Class | undefined> {
    const results = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createClass(data: InsertClass): Promise<Class> {
    const results = await db.insert(classes).values(data).returning();
    return results[0];
  }
  
  async updateClass(id: number, data: Partial<InsertClass>): Promise<Class | undefined> {
    const classExists = await this.getClass(id);
    if (!classExists) {
      return undefined;
    }
    
    const results = await db
      .update(classes)
      .set(data)
      .where(eq(classes.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : undefined;
  }
  
  // Student operations
  async getStudentsByClassId(classId: number): Promise<Student[]> {
    return await db.select()
      .from(students)
      .where(
        and(
          eq(students.classId, classId),
          eq(students.active, true)
        )
      );
  }
  
  async getStudent(id: number): Promise<Student | undefined> {
    const results = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createStudent(data: InsertStudent): Promise<Student> {
    const results = await db.insert(students).values(data).returning();
    return results[0];
  }

  async updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const studentExists = await this.getStudent(id);
    if (!studentExists) {
      return undefined;
    }
    
    const results = await db
      .update(students)
      .set(data)
      .where(eq(students.id, id))
      .returning();
    
    return results[0];
  }

  async deleteStudent(id: number): Promise<boolean> {
    // Verificar se o aluno existe
    const studentExists = await this.getStudent(id);
    if (!studentExists) {
      return false;
    }
    
    // Verificar se existem registros de presença para este aluno
    const attendanceCount = await db
      .select({ count: count() })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.studentId, id));
    
    // Se houver registros de presença, não permitir excluir o aluno
    if (attendanceCount[0].count > 0) {
      throw new Error("Não é possível excluir um aluno com registros de presença");
    }
    
    // Excluir o aluno
    await db
      .delete(students)
      .where(eq(students.id, id));
    
    return true;
  }
  
  // Attendance operations
  async getAttendanceRecords(classId?: number): Promise<(AttendanceRecord & { studentName: string })[]> {
    if (classId) {
      // Buscar registros com nome do aluno filtrando por classe
      return await db
        .select({
          id: attendanceRecords.id,
          studentId: attendanceRecords.studentId,
          present: attendanceRecords.present,
          date: attendanceRecords.date,
          recordDate: attendanceRecords.recordDate,
          studentName: students.name
        })
        .from(attendanceRecords)
        .innerJoin(students, eq(attendanceRecords.studentId, students.id))
        .innerJoin(classes, eq(students.classId, classes.id))
        .where(eq(classes.id, classId));
    } else {
      // Buscar todos os registros com nome do aluno
      return await db
        .select({
          id: attendanceRecords.id,
          studentId: attendanceRecords.studentId,
          present: attendanceRecords.present,
          date: attendanceRecords.date,
          recordDate: attendanceRecords.recordDate,
          studentName: students.name
        })
        .from(attendanceRecords)
        .innerJoin(students, eq(attendanceRecords.studentId, students.id));
    }
  }
  
  async createAttendanceRecord(data: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const results = await db.insert(attendanceRecords).values(data).returning();
    return results[0];
  }
  
  // Missionary activity operations
  async getMissionaryActivities(classId?: number): Promise<(MissionaryActivity & { className: string })[]> {
    if (classId) {
      // Buscar atividades filtrando por classe
      return await db
        .select({
          id: missionaryActivities.id,
          classId: missionaryActivities.classId,
          date: missionaryActivities.date,
          qtdContatosMissionarios: missionaryActivities.qtdContatosMissionarios,
          literaturasDistribuidas: missionaryActivities.literaturasDistribuidas,
          visitasMissionarias: missionaryActivities.visitasMissionarias,
          estudosBiblicos: missionaryActivities.estudosBiblicos,
          ministrados: missionaryActivities.ministrados,
          pessoasAuxiliadas: missionaryActivities.pessoasAuxiliadas,
          pessoasTrazidasIgreja: missionaryActivities.pessoasTrazidasIgreja,
          recordDate: missionaryActivities.recordDate,
          className: classes.name
        })
        .from(missionaryActivities)
        .innerJoin(classes, eq(missionaryActivities.classId, classes.id))
        .where(eq(missionaryActivities.classId, classId));
    } else {
      // Buscar todas as atividades
      return await db
        .select({
          id: missionaryActivities.id,
          classId: missionaryActivities.classId,
          date: missionaryActivities.date,
          qtdContatosMissionarios: missionaryActivities.qtdContatosMissionarios,
          literaturasDistribuidas: missionaryActivities.literaturasDistribuidas,
          visitasMissionarias: missionaryActivities.visitasMissionarias,
          estudosBiblicos: missionaryActivities.estudosBiblicos,
          ministrados: missionaryActivities.ministrados,
          pessoasAuxiliadas: missionaryActivities.pessoasAuxiliadas,
          pessoasTrazidasIgreja: missionaryActivities.pessoasTrazidasIgreja,
          recordDate: missionaryActivities.recordDate,
          className: classes.name
        })
        .from(missionaryActivities)
        .innerJoin(classes, eq(missionaryActivities.classId, classes.id));
    }
  }
  
  async createMissionaryActivity(data: InsertMissionaryActivity): Promise<MissionaryActivity> {
    // Garantir que todos os campos tenham um valor (mesmo que seja 0)
    const completeData = {
      ...data,
      qtdContatosMissionarios: data.qtdContatosMissionarios ?? 0,
      literaturasDistribuidas: data.literaturasDistribuidas ?? 0,
      visitasMissionarias: data.visitasMissionarias ?? 0,
      estudosBiblicos: data.estudosBiblicos ?? 0,
      ministrados: data.ministrados ?? 0,
      pessoasAuxiliadas: data.pessoasAuxiliadas ?? 0,
      pessoasTrazidasIgreja: data.pessoasTrazidasIgreja ?? 0,
    };
    
    const results = await db.insert(missionaryActivities).values(completeData).returning();
    return results[0];
  }
  
  // Método para inicializar o banco com um professor de teste
  async seedTestTeacher(): Promise<void> {
    try {
      // Verificar se o professor de teste já existe
      const existingTeacher = await this.getTeacherByCpf("123456789");
      if (!existingTeacher) {
        // Criar professor de teste
        const teacher = await this.createTeacher({
          name: "Jones",
          cpf: "123456789",
          password: "123456",
          isAdmin: false
        });
        
        // Criar classe de teste
        const classObj = await this.createClass({
          name: "Escola Sabatina - Classe Adultos"
        });
        
        // Associar professor à classe
        await this.assignTeacherToClass({
          teacherId: teacher.id,
          classId: classObj.id
        });
        
        // Criar alguns alunos de exemplo
        const studentNames = [
          "Ana Silva",
          "Carlos Oliveira",
          "Maria Santos",
          "João Pereira",
          "Juliana Costa",
          "Roberto Almeida",
          "Fernanda Lima",
          "Paulo Souza"
        ];
        
        for (const name of studentNames) {
          await this.createStudent({
            name,
            classId: classObj.id
          });
        }
        
        console.log("Test data seeded successfully");
      }
    } catch (error) {
      console.error("Error seeding test data:", error);
    }
  }
}