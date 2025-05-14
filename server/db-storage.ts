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
import { eq, and, count, inArray, sql } from "drizzle-orm";
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
    try {
      // Garantir que o CPF é uma string e remover qualquer espaço em branco
      const cpfClean = String(cpf).trim();
      console.log(`Buscando professor pelo CPF: "${cpfClean}"`);
      
      // Primeira tentativa: consulta direta
      const results = await db.select().from(teachers).where(eq(teachers.cpf, cpfClean)).limit(1);
      
      if (results.length > 0) {
        console.log(`Professor encontrado pelo CPF: "${cpfClean}"`);
        return results[0];
      }

      // Se não encontrou, tenta remover a formatação (pontos, traços)
      if (/[^\d]/.test(cpfClean)) {
        const cpfNumeric = cpfClean.replace(/\D/g, '');
        console.log(`Tentando buscar novamente com CPF numérico: "${cpfNumeric}"`);
        
        const results2 = await db.select().from(teachers).where(eq(teachers.cpf, cpfNumeric)).limit(1);
        if (results2.length > 0) {
          console.log(`Professor encontrado pelo CPF numérico: "${cpfNumeric}"`);
          return results2[0];
        }
      }
      
      console.log(`Nenhum professor encontrado para o CPF: "${cpfClean}"`);
      return undefined;
    } catch (error) {
      console.error(`Erro ao buscar professor pelo CPF "${cpf}":`, error);
      throw error;
    }
  }
  
  async getAllTeachers(): Promise<Teacher[]> {
    // Retornar todos os professores, incluindo ativos e inativos
    // Isso permite que administradores vejam e possam reativar professores
    return await db.select().from(teachers);
  }
  
  async createTeacher(data: InsertTeacher): Promise<Teacher> {
    // Aplicar hash na senha antes de salvar no banco (exceto para o admin)
    if (data.password 
      //&& data.cpf !== "admin"
    ) {
      data.password = await hashPassword(data.password);
    }
    
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
  
  async removeTeacherFromClass(teacherId: number, classId: number): Promise<boolean> {
    // Verificar se a atribuição existe
    const existingAssignment = await db.select()
      .from(teacherClasses)
      .where(
        and(
          eq(teacherClasses.teacherId, teacherId),
          eq(teacherClasses.classId, classId)
        )
      ).limit(1);
    
    if (existingAssignment.length === 0) {
      return false;
    }
    
    // Remover a atribuição
    await db.delete(teacherClasses)
      .where(
        and(
          eq(teacherClasses.teacherId, teacherId),
          eq(teacherClasses.classId, classId)
        )
      );
    
    return true;
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
      .where(eq(students.classId, classId));
  }
  
  async getAllStudents(): Promise<(Student & { className: string | undefined })[]> {
    // Buscar todos os alunos com o nome da classe
    const results = await db.select({
      id: students.id,
      name: students.name,
      classId: students.classId,
      active: students.active,
      createdAt: students.createdAt,
      className: classes.name
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id));
    
    // Converter null para undefined no className para satisfazer o tipo
    return results.map(student => ({
      ...student,
      className: student.className || undefined
    }));
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
    
    // Em vez de excluir, alteramos o status active do aluno
    await db
      .update(students)
      .set({ active: !studentExists.active })
      .where(eq(students.id, id));
    
    return true;
  }
  
  // Attendance operations
  async getAttendanceRecords(classId?: number): Promise<(AttendanceRecord & { studentName: string, className: string })[]> {
    // Buscar todos os registros agrupando por studentId e date para evitar duplicações
    // Isso vai pegar sempre o registro mais recente para cada combinação de aluno e data
    
    if (classId) {
      // Subconsulta para obter o ID mais recente para cada combinação de aluno e data
      const latestRecords = db
        .select({
          maxId: sql<number>`max(${attendanceRecords.id})`.as('maxId'),
          studentId: attendanceRecords.studentId,
          date: attendanceRecords.date
        })
        .from(attendanceRecords)
        .innerJoin(students, eq(attendanceRecords.studentId, students.id))
        .innerJoin(classes, eq(students.classId, classes.id))
        .where(eq(classes.id, classId))
        .groupBy(attendanceRecords.studentId, attendanceRecords.date)
        .as('latestRecords');
      
      // Usar a subconsulta para obter apenas os registros mais recentes
      return await db
        .select({
          id: attendanceRecords.id,
          studentId: attendanceRecords.studentId,
          present: attendanceRecords.present,
          date: attendanceRecords.date,
          recordDate: attendanceRecords.recordDate,
          studentName: students.name,
          className: classes.name
        })
        .from(attendanceRecords)
        .innerJoin(students, eq(attendanceRecords.studentId, students.id))
        .innerJoin(classes, eq(students.classId, classes.id))
        .innerJoin(latestRecords, eq(attendanceRecords.id, latestRecords.maxId));
    } else {
      // Subconsulta para obter o ID mais recente para cada combinação de aluno e data
      const latestRecords = db
        .select({
          maxId: sql<number>`max(${attendanceRecords.id})`.as('maxId'),
          studentId: attendanceRecords.studentId,
          date: attendanceRecords.date
        })
        .from(attendanceRecords)
        .groupBy(attendanceRecords.studentId, attendanceRecords.date)
        .as('latestRecords');
      
      // Usar a subconsulta para obter apenas os registros mais recentes
      return await db
        .select({
          id: attendanceRecords.id,
          studentId: attendanceRecords.studentId,
          present: attendanceRecords.present,
          date: attendanceRecords.date,
          recordDate: attendanceRecords.recordDate,
          studentName: students.name,
          className: classes.name
        })
        .from(attendanceRecords)
        .innerJoin(students, eq(attendanceRecords.studentId, students.id))
        .innerJoin(classes, eq(students.classId, classes.id))
        .innerJoin(latestRecords, eq(attendanceRecords.id, latestRecords.maxId));
    }
  }
  
  async getAttendanceRecordsForClassAndDate(classId: number, date: string): Promise<(AttendanceRecord & { studentName: string, className: string })[]> {
    // Subconsulta para obter o ID mais recente para cada aluno nesta data
    const latestRecords = db
      .select({
        maxId: sql<number>`max(${attendanceRecords.id})`.as('maxId'),
        studentId: attendanceRecords.studentId
      })
      .from(attendanceRecords)
      .innerJoin(students, eq(attendanceRecords.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(
        and(
          eq(classes.id, classId),
          eq(attendanceRecords.date, date)
        )
      )
      .groupBy(attendanceRecords.studentId)
      .as('latestRecords');
    
    // Usar a subconsulta para obter apenas os registros mais recentes
    return await db
      .select({
        id: attendanceRecords.id,
        studentId: attendanceRecords.studentId,
        present: attendanceRecords.present,
        date: attendanceRecords.date,
        recordDate: attendanceRecords.recordDate,
        studentName: students.name,
        className: classes.name
      })
      .from(attendanceRecords)
      .innerJoin(students, eq(attendanceRecords.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .innerJoin(latestRecords, eq(attendanceRecords.id, latestRecords.maxId));
  }
  
  async createAttendanceRecord(data: InsertAttendanceRecord): Promise<AttendanceRecord> {
    // Usar o objeto data diretamente e adicionar recordDate
    const results = await db.insert(attendanceRecords).values({
      ...data,
      recordDate: new Date()
    }).returning();
    
    return results[0];
  }
  
  async deleteAttendanceRecordsForClassAndDate(classId: number, date: string): Promise<boolean> {
    try {
      // Primeiro, obtemos os IDs dos alunos desta classe
      const studentsResult = await db.select({ id: students.id })
        .from(students)
        .where(eq(students.classId, classId));
      
      if (studentsResult.length === 0) {
        return false;
      }
      
      // Extrair os IDs dos alunos
      const studentIds = studentsResult.map(student => student.id);
      
      // Excluir todos os registros de presença destes alunos para a data especificada
      await db.delete(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.date, date),
            inArray(attendanceRecords.studentId, studentIds)
          )
        );
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir registros de frequência:', error);
      return false;
    }
  }
  
  // Missionary activity operations
  async getMissionaryActivities(classId?: number): Promise<(MissionaryActivity & { className: string })[]> {
    if (classId) {
      // Para missões, usamos uma subconsulta para pegar apenas o registro mais recente para cada combinação de classe e data
      const latestRecords = db
        .select({
          maxId: sql<number>`max(${missionaryActivities.id})`.as('maxId'),
          classId: missionaryActivities.classId,
          date: missionaryActivities.date
        })
        .from(missionaryActivities)
        .where(eq(missionaryActivities.classId, classId))
        .groupBy(missionaryActivities.classId, missionaryActivities.date)
        .as('latestRecords');
      
      // Buscar atividades filtrando por classe, usando apenas os IDs mais recentes
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
        .innerJoin(latestRecords, eq(missionaryActivities.id, latestRecords.maxId));
    } else {
      // Para todas as classes, fazer o mesmo mas sem filtrar por classId
      const latestRecords = db
        .select({
          maxId: sql<number>`max(${missionaryActivities.id})`.as('maxId'),
          classId: missionaryActivities.classId,
          date: missionaryActivities.date
        })
        .from(missionaryActivities)
        .groupBy(missionaryActivities.classId, missionaryActivities.date)
        .as('latestRecords');
        
      // Buscar todas as atividades, usando apenas os IDs mais recentes
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
        .innerJoin(latestRecords, eq(missionaryActivities.id, latestRecords.maxId));
    }
  }
  
  async getMissionaryActivitiesForClassAndDate(classId: number, date: string): Promise<MissionaryActivity[]> {
    // Subconsulta para obter o ID mais recente para esta classe e data
    const latestRecords = db
      .select({
        maxId: sql<number>`max(${missionaryActivities.id})`.as('maxId')
      })
      .from(missionaryActivities)
      .where(
        and(
          eq(missionaryActivities.classId, classId),
          eq(missionaryActivities.date, date)
        )
      )
      .as('latestRecords');
    
    // Usar a subconsulta para obter apenas o registro mais recente
    const results = await db
      .select()
      .from(missionaryActivities)
      .innerJoin(latestRecords, eq(missionaryActivities.id, latestRecords.maxId));
    
    if (results.length === 0) {
      // Se não encontrou com a subconsulta (pode acontecer em alguns casos),
      // voltar ao método original por segurança
      return await db
        .select()
        .from(missionaryActivities)
        .where(
          and(
            eq(missionaryActivities.classId, classId),
            eq(missionaryActivities.date, date)
          )
        );
    }
    
    return results;
  }
  
  async createMissionaryActivity(data: InsertMissionaryActivity): Promise<MissionaryActivity> {
    // Garantir que todos os campos tenham um valor (mesmo que seja 0)
    // Adicionar timestamp atual como objeto Date
    const results = await db.insert(missionaryActivities).values({
      ...data,
      qtdContatosMissionarios: data.qtdContatosMissionarios ?? 0,
      literaturasDistribuidas: data.literaturasDistribuidas ?? 0,
      visitasMissionarias: data.visitasMissionarias ?? 0,
      estudosBiblicos: data.estudosBiblicos ?? 0,
      ministrados: data.ministrados ?? 0,
      pessoasAuxiliadas: data.pessoasAuxiliadas ?? 0,
      pessoasTrazidasIgreja: data.pessoasTrazidasIgreja ?? 0,
      recordDate: new Date()
    }).returning();
    
    return results[0];
  }
  
  async deleteMissionaryActivitiesForClassAndDate(classId: number, date: string): Promise<boolean> {
    try {
      // Excluir atividades missionárias para a classe e data específicas
      await db.delete(missionaryActivities)
        .where(
          and(
            eq(missionaryActivities.classId, classId),
            eq(missionaryActivities.date, date)
          )
        );
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir atividades missionárias:', error);
      return false;
    }
  }
  
  // Método para atualizar um registro de presença
  async updateAttendanceRecord(id: number, data: { present: boolean }): Promise<AttendanceRecord | undefined> {
    try {
      // Verificar se o registro existe
      const records = await db.select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.id, id))
        .limit(1);
      
      if (records.length === 0) {
        return undefined;
      }
      
      // Atualizar o registro
      const results = await db
        .update(attendanceRecords)
        .set(data)
        .where(eq(attendanceRecords.id, id))
        .returning();
      
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error('Erro ao atualizar registro de presença:', error);
      return undefined;
    }
  }
  
  // Método para atualizar uma atividade missionária
  async updateMissionaryActivity(id: number, data: Partial<Record<string, number>>): Promise<MissionaryActivity | undefined> {
    try {
      // Verificar se o registro existe
      const activities = await db.select()
        .from(missionaryActivities)
        .where(eq(missionaryActivities.id, id))
        .limit(1);
      
      if (activities.length === 0) {
        return undefined;
      }
      
      // Atualizar o registro
      const results = await db
        .update(missionaryActivities)
        .set(data)
        .where(eq(missionaryActivities.id, id))
        .returning();
      
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error('Erro ao atualizar atividade missionária:', error);
      return undefined;
    }
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

  async getStudentCountsByClass(): Promise<Record<number, number>> {
    // Agrupar por classId e contar os alunos
    const counts = await db
      .select({
        classId: students.classId,
        count: sql<number>`count(*)::int`
      })
      .from(students)
      .groupBy(students.classId);
    
    // Converter para um objeto onde a chave é o classId e o valor é a contagem
    const result: Record<number, number> = {};
    counts.forEach(item => {
      result[item.classId] = item.count;
    });
    
    return result;
  }
}