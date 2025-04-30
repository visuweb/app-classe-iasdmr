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
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // Teacher operations
  getTeacherById(id: number): Promise<Teacher | undefined>;
  getTeacherByCpf(cpf: string): Promise<Teacher | undefined>;
  createTeacher(data: InsertTeacher): Promise<Teacher>;
  validateTeacher(cpf: string, password: string): Promise<Teacher | null>;
  
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
  
  // Attendance operations
  getAttendanceRecords(classId?: number): Promise<(AttendanceRecord & { studentName: string })[]>;
  createAttendanceRecord(data: InsertAttendanceRecord): Promise<AttendanceRecord>;
  
  // Missionary activity operations
  getMissionaryActivities(classId?: number): Promise<(MissionaryActivity & { className: string })[]>;
  createMissionaryActivity(data: InsertMissionaryActivity): Promise<MissionaryActivity>;
  
  // Session store
  sessionStore: session.Store;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private classes: Map<number, Class>;
  private students: Map<number, Student>;
  private attendanceRecords: Map<number, AttendanceRecord>;
  private missionaryActivities: Map<number, MissionaryActivity>;
  private teachers: Map<number, Teacher>;
  private teacherClasses: Map<string, TeacherClass>; // Using composite key teacherId:classId
  
  private classCounter: number;
  private studentCounter: number;
  private attendanceCounter: number;
  private activityCounter: number;
  private teacherCounter: number;
  
  public sessionStore: session.SessionStore;
  
  constructor() {
    this.classes = new Map();
    this.students = new Map();
    this.attendanceRecords = new Map();
    this.missionaryActivities = new Map();
    this.teachers = new Map();
    this.teacherClasses = new Map();
    
    this.classCounter = 1;
    this.studentCounter = 1;
    this.attendanceCounter = 1;
    this.activityCounter = 1;
    this.teacherCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Add some sample data
    this.seedData();
  }
  
  private seedData() {
    // Add a sample teacher
    const sampleTeacher: Teacher = {
      id: this.teacherCounter++,
      name: "Jones",
      cpf: "123456789",
      password: "123456", // Normalmente armazenaríamos um hash da senha
      createdAt: new Date(),
    };
    this.teachers.set(sampleTeacher.id, sampleTeacher);
    
    // Add a sample class
    const sampleClass: Class = {
      id: this.classCounter++,
      name: "Escola Sabatina - Classe Adultos",
      createdAt: new Date(),
    };
    this.classes.set(sampleClass.id, sampleClass);
    
    // Assign teacher to class
    const teacherClassKey = `${sampleTeacher.id}:${sampleClass.id}`;
    this.teacherClasses.set(teacherClassKey, {
      teacherId: sampleTeacher.id,
      classId: sampleClass.id
    });
    
    // Add sample students
    const sampleStudents = [
      "Ana Silva",
      "Carlos Oliveira",
      "Maria Santos",
      "João Pereira",
      "Juliana Costa",
      "Roberto Almeida",
      "Fernanda Lima",
      "Paulo Souza"
    ];
    
    sampleStudents.forEach(name => {
      const student: Student = {
        id: this.studentCounter++,
        name,
        classId: sampleClass.id,
        createdAt: new Date(),
      };
      this.students.set(student.id, student);
    });
  }
  
  // Teacher operations
  async getTeacherById(id: number): Promise<Teacher | undefined> {
    return this.teachers.get(id);
  }
  
  async getTeacherByCpf(cpf: string): Promise<Teacher | undefined> {
    return Array.from(this.teachers.values()).find(teacher => teacher.cpf === cpf);
  }
  
  async createTeacher(data: InsertTeacher): Promise<Teacher> {
    const id = this.teacherCounter++;
    const newTeacher: Teacher = {
      id,
      ...data,
      createdAt: new Date(),
    };
    this.teachers.set(id, newTeacher);
    return newTeacher;
  }
  
  async validateTeacher(cpf: string, password: string): Promise<Teacher | null> {
    const teacher = await this.getTeacherByCpf(cpf);
    if (teacher && teacher.password === password) {
      return teacher;
    }
    return null;
  }
  
  // Teacher-Class operations
  async assignTeacherToClass(data: InsertTeacherClass): Promise<TeacherClass> {
    // Check if class already has 2 teachers
    const classTeachers = await this.getTeachersByClassId(data.classId);
    if (classTeachers.length >= 2) {
      throw new Error("Class already has the maximum of 2 teachers");
    }
    
    const teacherClassKey = `${data.teacherId}:${data.classId}`;
    
    // Check if this assignment already exists
    if (this.teacherClasses.has(teacherClassKey)) {
      throw new Error("Teacher is already assigned to this class");
    }
    
    const teacherClass: TeacherClass = {
      teacherId: data.teacherId,
      classId: data.classId
    };
    
    this.teacherClasses.set(teacherClassKey, teacherClass);
    return teacherClass;
  }
  
  async getClassesByTeacherId(teacherId: number): Promise<(Class & { role?: string })[]> {
    const classIds = Array.from(this.teacherClasses.values())
      .filter(tc => tc.teacherId === teacherId)
      .map(tc => tc.classId);
    
    return classIds.map(classId => {
      const classObj = this.classes.get(classId);
      if (classObj) {
        return {
          ...classObj,
          role: 'professor' // Could add a role in the future if needed
        };
      }
      return null;
    }).filter(Boolean) as (Class & { role?: string })[];
  }
  
  async getTeachersByClassId(classId: number): Promise<Teacher[]> {
    const teacherIds = Array.from(this.teacherClasses.values())
      .filter(tc => tc.classId === classId)
      .map(tc => tc.teacherId);
    
    return teacherIds.map(teacherId => this.teachers.get(teacherId))
      .filter(Boolean) as Teacher[];
  }
  
  // Class operations
  async getAllClasses(): Promise<Class[]> {
    return Array.from(this.classes.values());
  }
  
  async getClass(id: number): Promise<Class | undefined> {
    return this.classes.get(id);
  }
  
  async createClass(data: InsertClass): Promise<Class> {
    const id = this.classCounter++;
    const newClass: Class = {
      id,
      ...data,
      createdAt: new Date(),
    };
    this.classes.set(id, newClass);
    return newClass;
  }
  
  // Student operations
  async getStudentsByClassId(classId: number): Promise<Student[]> {
    return Array.from(this.students.values()).filter(
      student => student.classId === classId
    );
  }
  
  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }
  
  async createStudent(data: InsertStudent): Promise<Student> {
    const id = this.studentCounter++;
    const newStudent: Student = {
      id,
      ...data,
      createdAt: new Date(),
    };
    this.students.set(id, newStudent);
    return newStudent;
  }
  
  // Attendance operations
  async getAttendanceRecords(classId?: number): Promise<(AttendanceRecord & { studentName: string })[]> {
    const records = Array.from(this.attendanceRecords.values());
    
    // If classId is provided, filter by students in that class
    const filteredRecords = classId 
      ? records.filter(record => {
          const student = this.students.get(record.studentId);
          return student && student.classId === classId;
        })
      : records;
    
    // Add student name to each record
    return filteredRecords.map(record => {
      const student = this.students.get(record.studentId);
      return {
        ...record,
        studentName: student ? student.name : 'Unknown Student',
      };
    });
  }
  
  async createAttendanceRecord(data: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const id = this.attendanceCounter++;
    const newRecord: AttendanceRecord = {
      id,
      ...data,
      recordDate: new Date(),
    };
    this.attendanceRecords.set(id, newRecord);
    return newRecord;
  }
  
  // Missionary activity operations
  async getMissionaryActivities(classId?: number): Promise<(MissionaryActivity & { className: string })[]> {
    const activities = Array.from(this.missionaryActivities.values());
    
    // If classId is provided, filter by that class
    const filteredActivities = classId 
      ? activities.filter(activity => activity.classId === classId)
      : activities;
    
    // Add class name to each activity
    return filteredActivities.map(activity => {
      const classObj = this.classes.get(activity.classId);
      return {
        ...activity,
        className: classObj ? classObj.name : 'Unknown Class',
      };
    });
  }
  
  async createMissionaryActivity(data: InsertMissionaryActivity): Promise<MissionaryActivity> {
    const id = this.activityCounter++;
    const newActivity: MissionaryActivity = {
      id,
      ...data,
      qtdContatosMissionarios: data.qtdContatosMissionarios ?? 0,
      literaturasDistribuidas: data.literaturasDistribuidas ?? 0,
      visitasMissionarias: data.visitasMissionarias ?? 0,
      estudosBiblicos: data.estudosBiblicos ?? 0,
      ministrados: data.ministrados ?? 0,
      pessoasAuxiliadas: data.pessoasAuxiliadas ?? 0,
      pessoasTrazidasIgreja: data.pessoasTrazidasIgreja ?? 0,
      recordDate: new Date(),
    };
    this.missionaryActivities.set(id, newActivity);
    return newActivity;
  }
}

// Export storage instance
export const storage = new MemStorage();
