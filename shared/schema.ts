import { pgTable, text, serial, integer, boolean, date, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Teachers table
export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cpf: text("cpf").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Classes table
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Teacher-Class relationship (up to 2 teachers per class)
export const teacherClasses = pgTable("teacher_classes", {
  teacherId: integer("teacher_id").notNull().references(() => teachers.id),
  classId: integer("class_id").notNull().references(() => classes.id),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.teacherId, table.classId] }),
  };
});

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  classId: integer("class_id").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Attendance records table
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  present: boolean("present").notNull(),
  date: date("date").notNull(),
  recordDate: timestamp("record_date").defaultNow().notNull(),
});

// Missionary activities table
export const missionaryActivities = pgTable("missionary_activities", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull(),
  date: date("date").notNull(),
  qtdContatosMissionarios: integer("qtd_contatos_missionarios").default(0),
  literaturasDistribuidas: integer("literaturas_distribuidas").default(0),
  visitasMissionarias: integer("visitas_missionarias").default(0),
  estudosBiblicos: integer("estudos_biblicos").default(0),
  ministrados: integer("ministrados").default(0),
  pessoasAuxiliadas: integer("pessoas_auxiliadas").default(0),
  pessoasTrazidasIgreja: integer("pessoas_trazidas_igreja").default(0),
  recordDate: timestamp("record_date").defaultNow().notNull(),
});

// Insert schemas
export const insertTeacherSchema = createInsertSchema(teachers).pick({
  name: true,
  cpf: true,
  password: true,
  isAdmin: true,
  active: true,
});

export const insertTeacherClassSchema = createInsertSchema(teacherClasses).pick({
  teacherId: true,
  classId: true,
});

export const insertClassSchema = createInsertSchema(classes).pick({
  name: true,
  active: true,
});

export const insertStudentSchema = createInsertSchema(students).pick({
  name: true,
  classId: true,
  active: true,
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).pick({
  studentId: true,
  present: true,
  date: true,
});

export const insertMissionaryActivitySchema = createInsertSchema(missionaryActivities).pick({
  classId: true,
  date: true,
  qtdContatosMissionarios: true,
  literaturasDistribuidas: true,
  visitasMissionarias: true,
  estudosBiblicos: true,
  ministrados: true,
  pessoasAuxiliadas: true,
  pessoasTrazidasIgreja: true,
});

// Types
export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;

export type TeacherClass = typeof teacherClasses.$inferSelect;
export type InsertTeacherClass = z.infer<typeof insertTeacherClassSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;

export type MissionaryActivity = typeof missionaryActivities.$inferSelect;
export type InsertMissionaryActivity = z.infer<typeof insertMissionaryActivitySchema>;

// Activity definition for the wizard
export const missionaryActivityDefinitions = [
  { id: "qtdContatosMissionarios", label: "Contatos Missionários" },
  { id: "literaturasDistribuidas", label: "Literaturas Distribuídas" },
  { id: "visitasMissionarias", label: "Visitas Missionárias" },
  { id: "estudosBiblicos", label: "Estudos Bíblicos Ministrados" },
  { id: "pessoasAuxiliadas", label: "Pessoas Auxiliadas" },
  { id: "pessoasTrazidasIgreja", label: "Pessoas Trazidas à Igreja" }
] as const;

export type MissionaryActivityType = typeof missionaryActivityDefinitions[number]['id'];
