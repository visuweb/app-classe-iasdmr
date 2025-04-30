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
import { eq, and } from "drizzle-orm";
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
  // Se o formato não for compatível (não contém o delimitador)
  if (!stored.includes('.')) {
    return supplied === stored; // Comparação básica para senhas legadas
  }
  
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
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
  
  async createTeacher(data: InsertTeacher): Promise<Teacher> {
    const results = await db.insert(teachers).values(data).returning();
    return results[0];
  }
  
  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    return comparePasswords(supplied, stored);
  }
  
  async validateTeacher(cpf: string, password: string): Promise<Teacher | null> {
    const teacher = await this.getTeacherByCpf(cpf);
    
    if (!teacher) return null;
    
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
        // Criar o usuário administrador
        const hashedPassword = await hashPassword("admincei2025");
        await this.createTeacher({
          name: "Administrador",
          cpf: "admin",
          password: hashedPassword,
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
          createdAt: classes.createdAt
        })
        .from(teacherClasses)
        .innerJoin(classes, eq(teacherClasses.classId, classes.id))
        .where(eq(teacherClasses.teacherId, teacherId));
      
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
        createdAt: teachers.createdAt
      })
      .from(teacherClasses)
      .innerJoin(teachers, eq(teacherClasses.teacherId, teachers.id))
      .where(eq(teacherClasses.classId, classId));
  }
  
  // Class operations
  async getAllClasses(): Promise<Class[]> {
    return await db.select().from(classes);
  }
  
  async getClass(id: number): Promise<Class | undefined> {
    const results = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createClass(data: InsertClass): Promise<Class> {
    const results = await db.insert(classes).values(data).returning();
    return results[0];
  }
  
  // Student operations
  async getStudentsByClassId(classId: number): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.classId, classId));
  }
  
  async getStudent(id: number): Promise<Student | undefined> {
    const results = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createStudent(data: InsertStudent): Promise<Student> {
    const results = await db.insert(students).values(data).returning();
    return results[0];
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