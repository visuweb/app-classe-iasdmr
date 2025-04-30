import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Classes table
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  classId: integer("class_id").notNull(),
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
export const insertClassSchema = createInsertSchema(classes).pick({
  name: true,
});

export const insertStudentSchema = createInsertSchema(students).pick({
  name: true,
  classId: true,
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
  { id: "estudosBiblicos", label: "Estudos Bíblicos" },
  { id: "ministrados", label: "Ministrados" },
  { id: "pessoasAuxiliadas", label: "Pessoas Auxiliadas" },
  { id: "pessoasTrazidasIgreja", label: "Pessoas Trazidas à Igreja" }
] as const;

export type MissionaryActivityType = typeof missionaryActivityDefinitions[number]['id'];
