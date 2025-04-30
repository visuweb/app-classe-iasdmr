import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClassSchema, 
  insertStudentSchema, 
  insertAttendanceRecordSchema, 
  insertMissionaryActivitySchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Classes routes
  app.get("/api/classes", async (req, res) => {
    try {
      const classes = await storage.getAllClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.post("/api/classes", async (req, res) => {
    try {
      const parsed = insertClassSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid class data" });
      }
      
      const newClass = await storage.createClass(parsed.data);
      res.status(201).json(newClass);
    } catch (error) {
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  // Students routes
  app.get("/api/classes/:classId/students", async (req, res) => {
    try {
      const classId = parseInt(req.params.classId, 10);
      const students = await storage.getStudentsByClassId(classId);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const parsed = insertStudentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid student data" });
      }
      
      const newStudent = await storage.createStudent(parsed.data);
      res.status(201).json(newStudent);
    } catch (error) {
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", async (req, res) => {
    try {
      const classId = req.query.classId ? parseInt(req.query.classId as string, 10) : undefined;
      const records = await storage.getAttendanceRecords(classId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const parsed = insertAttendanceRecordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid attendance data" });
      }
      
      const newRecord = await storage.createAttendanceRecord(parsed.data);
      res.status(201).json(newRecord);
    } catch (error) {
      res.status(500).json({ message: "Failed to create attendance record" });
    }
  });

  // Missionary activities routes
  app.get("/api/missionary-activities", async (req, res) => {
    try {
      const classId = req.query.classId ? parseInt(req.query.classId as string, 10) : undefined;
      const activities = await storage.getMissionaryActivities(classId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch missionary activities" });
    }
  });

  app.post("/api/missionary-activities", async (req, res) => {
    try {
      const parsed = insertMissionaryActivitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid missionary activity data" });
      }
      
      const newActivity = await storage.createMissionaryActivity(parsed.data);
      res.status(201).json(newActivity);
    } catch (error) {
      res.status(500).json({ message: "Failed to create missionary activity" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
