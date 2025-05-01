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
  InsertTeacherClass
} from "@shared/schema";
import session from "express-session";
import { DatabaseStorage } from './db-storage';

// Interface for storage operations
export interface IStorage {
  // Teacher operations
  getTeacherById(id: number): Promise<Teacher | undefined>;
  getTeacherByCpf(cpf: string): Promise<Teacher | undefined>;
  getAllTeachers(): Promise<Teacher[]>;
  createTeacher(data: InsertTeacher): Promise<Teacher>;
  updateTeacher(id: number, data: Partial<InsertTeacher>): Promise<Teacher | undefined>;
  validateTeacher(cpf: string, password: string): Promise<Teacher | null>;
  comparePasswords(supplied: string, stored: string): Promise<boolean>;
  createAdminUser(): Promise<void>;
  
  // Teacher-Class operations
  assignTeacherToClass(data: InsertTeacherClass): Promise<TeacherClass>;
  getClassesByTeacherId(teacherId: number): Promise<(Class & { role?: string })[]>;
  getTeachersByClassId(classId: number): Promise<Teacher[]>;
  
  // Class operations
  getAllClasses(): Promise<Class[]>;
  getClass(id: number): Promise<Class | undefined>;
  createClass(data: InsertClass): Promise<Class>;
  
  // Student operations
  getStudentsByClassId(classId: number): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  createStudent(data: InsertStudent): Promise<Student>;
  updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  
  // Attendance operations
  getAttendanceRecords(classId?: number): Promise<(AttendanceRecord & { studentName: string })[]>;
  createAttendanceRecord(data: InsertAttendanceRecord): Promise<AttendanceRecord>;
  
  // Missionary activity operations
  getMissionaryActivities(classId?: number): Promise<(MissionaryActivity & { className: string })[]>;
  createMissionaryActivity(data: InsertMissionaryActivity): Promise<MissionaryActivity>;
  
  // Session store
  sessionStore: session.Store;
}

// Instanciar e exportar o DatabaseStorage
export const storage = new DatabaseStorage();