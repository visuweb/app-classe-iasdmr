import { 
  Class, 
  InsertClass, 
  Student, 
  InsertStudent, 
  AttendanceRecord, 
  InsertAttendanceRecord, 
  MissionaryActivity, 
  InsertMissionaryActivity 
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
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
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private classes: Map<number, Class>;
  private students: Map<number, Student>;
  private attendanceRecords: Map<number, AttendanceRecord>;
  private missionaryActivities: Map<number, MissionaryActivity>;
  
  private classCounter: number;
  private studentCounter: number;
  private attendanceCounter: number;
  private activityCounter: number;
  
  constructor() {
    this.classes = new Map();
    this.students = new Map();
    this.attendanceRecords = new Map();
    this.missionaryActivities = new Map();
    
    this.classCounter = 1;
    this.studentCounter = 1;
    this.attendanceCounter = 1;
    this.activityCounter = 1;
    
    // Add some sample data
    this.seedData();
  }
  
  private seedData() {
    // Add a sample class
    const sampleClass: Class = {
      id: this.classCounter++,
      name: "Escola Sabatina - Classe Adultos",
      createdAt: new Date(),
    };
    this.classes.set(sampleClass.id, sampleClass);
    
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
      recordDate: new Date(),
    };
    this.missionaryActivities.set(id, newActivity);
    return newActivity;
  }
}

// Export storage instance
export const storage = new MemStorage();
