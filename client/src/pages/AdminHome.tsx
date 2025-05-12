import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatBrazilianDate } from '@/lib/date-utils';
import { startOfYear, setMonth, setDate, endOfMonth, format } from "date-fns";
import { LogOut, School, User, Book, BarChart, Plus, UserPlus, Calendar, Filter, Trash2, Check, Pencil, MinusCircle, Search, CalendarIcon } from 'lucide-react';
import MissionaryTable from './MissionaryTable';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Teacher, Class, Student, MissionaryActivity, AttendanceRecord } from '@shared/schema';

// Definir tipos para ActivityClass e ActivityType para facilitar a tipagem
type ActivityClass = {
  id: number;
  name: string;
  literaturasDistribuidas: number;
  qtdContatosMissionarios: number;
  estudosBiblicosTotal: number;
  visitasMissionarias: number;
  pessoasAuxiliadas: number;
  pessoasTrazidasIgreja: number;
  [key: string]: any;
};

type ActivityType = {
  id: string;
  name: string;
};

// Interface para dados completos
interface ActivityGridDataComplete {
  empty: false;
  activityTypes: ActivityType[];
  classes: ActivityClass[];
  totals: Record<string, number>;
}

// Interface para dados vazios
interface ActivityGridDataEmpty {
  empty: true;
}

// Union type para ambos os casos
type ActivityGridData = ActivityGridDataComplete | ActivityGridDataEmpty;

export default function AdminHome() {
  const { teacher, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [newTeacherData, setNewTeacherData] = useState({
    name: '',
    cpf: '',
    password: '',
    isAdmin: false
  });
  
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<Class | null>(null);
  const [editClassName, setEditClassName] = useState('');

  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  
  const [isToggleTeacherOpen, setIsToggleTeacherOpen] = useState(false);
  const [teacherToToggle, setTeacherToToggle] = useState<Teacher | null>(null);
  
  const [isToggleClassOpen, setIsToggleClassOpen] = useState(false);
  const [classToToggle, setClassToToggle] = useState<Class | null>(null);
  
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  
  const [isToggleStudentOpen, setIsToggleStudentOpen] = useState(false);
  const [studentToToggle, setStudentToToggle] = useState<Student | null>(null);
  
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  
  const [isEditTeacherOpen, setIsEditTeacherOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [editTeacherData, setEditTeacherData] = useState({
    name: '',
    cpf: '',
    password: '',
    isAdmin: false
  });
  
  const [isAssignTeacherOpen, setIsAssignTeacherOpen] = useState(false);
  const [selectedTeacherForAssignment, setSelectedTeacherForAssignment] = useState<number | null>(null);
  const [selectedClassForAssignment, setSelectedClassForAssignment] = useState<number | null>(null);
  
  const [selectedTab, setSelectedTab] = useState("teachers");
  
  // Attendance & Activity Filters
  const [selectedClassForReports, setSelectedClassForReports] = useState<number | null>(null);
  const [selectedDateForReports, setSelectedDateForReports] = useState<string | null>(null);
  const [selectedTrimester, setSelectedTrimester] = useState<number | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  // Determine current trimester
  const getCurrentTrimester = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // January is 0
    
    if (month >= 1 && month <= 4) return 1;
    if (month >= 5 && month <= 8) return 2;
    return 3; // September to December
  };
  
  // Determine if a date falls within a specific trimester
  const isDateInTrimester = (dateStr: string, trimester: number) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // January is 0
    
    if (trimester === 1 && month >= 1 && month <= 4) return true;
    if (trimester === 2 && month >= 5 && month <= 8) return true;
    if (trimester === 3 && month >= 9 && month <= 12) return true;
    
    return false;
  };
  
  // Get dates for a specific trimester
  const getTrimesterDateRange = (trimester: number) => {
    const currentYear = new Date().getFullYear();
    
    let startMonth, endMonth;
    if (trimester === 1) {
      startMonth = 0; // January (0-indexed)
      endMonth = 3;  // April
    } else if (trimester === 2) {
      startMonth = 4; // May
      endMonth = 7;  // August
    } else {
      startMonth = 8; // September
      endMonth = 11; // December
    }
    
    const start = new Date(currentYear, startMonth, 1);
    const end = new Date(currentYear, endMonth + 1, 0); // Last day of end month
    
    return { start, end };
  };
  
  // Group attendance records by class for trimester view
  const getAttendanceByClassAndTrimester = () => {
    if (!selectedTrimester || attendanceRecords.length === 0) return [];
    
    // Filter records that fall within the selected trimester
    const recordsInTrimester = attendanceRecords.filter(record => 
      isDateInTrimester(record.date, selectedTrimester)
    );
    
    // Group records by class
    const classSummary = new Map();
    
    // Initialize with all classes
    classes.forEach(classItem => {
      if (!classSummary.has(classItem.id)) {
        classSummary.set(classItem.id, {
          classId: classItem.id,
          className: classItem.name,
          presentCount: 0,
          absentCount: 0,
          totalRecords: 0
        });
      }
    });
    
    // Count present/absent for each class
    recordsInTrimester.forEach(record => {
      const classData = classSummary.get(record.classId);
      if (classData) {
        classData.totalRecords++;
        if (record.present) {
          classData.presentCount++;
        } else {
          classData.absentCount++;
        }
      }
    });
    
    // Calculate totals
    let totalPresent = 0;
    let totalAbsent = 0;
    
    classSummary.forEach(summary => {
      totalPresent += summary.presentCount;
      totalAbsent += summary.absentCount;
    });
    
    // Add a "total" row
    classSummary.set('total', {
      classId: 'total',
      className: 'Total',
      presentCount: totalPresent,
      absentCount: totalAbsent,
      totalRecords: totalPresent + totalAbsent
    });
    
    // Convert to array and filter if a specific class is selected
    let result = Array.from(classSummary.values());
    
    if (selectedClassForReports) {
      result = result.filter(summary => 
        summary.classId === selectedClassForReports || summary.classId === 'total'
      );
    }
    
    return result;
  };
  
  // Fetch attendance records
  const {
    data: attendanceRecords = [],
    isLoading: attendanceLoading
  } = useQuery<(AttendanceRecord & { studentName: string, className: string })[]>({
    queryKey: ['/api/attendance'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/attendance`);
      return res.json();
    },
  });
  
  // Fetch missionary activities
  const {
    data: missionaryActivities = [],
    isLoading: activitiesLoading
  } = useQuery<MissionaryActivity[]>({
    queryKey: ['/api/missionary-activities'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/missionary-activities`);
      return res.json();
    },
  });

  // Extract unique dates from attendance records
  useEffect(() => {
    if (attendanceRecords.length > 0) {
      const dates = attendanceRecords
        .map(record => record.date)
        .filter((date, index, self) => self.indexOf(date) === index);
      setAvailableDates(dates.sort().reverse());
    }
  }, [attendanceRecords]);
  
  // Update available dates when missionary activities data is loaded
  useEffect(() => {
    if (missionaryActivities.length > 0) {
      const missionaryDates = missionaryActivities
        .map(activity => activity.date)
        .filter((date, index, self) => self.indexOf(date) === index);
      
      // Combinar com datas já extraídas dos registros de frequência usando arrays 
      // Combinar os arrays e remover duplicatas
      const allDates = [...availableDates, ...missionaryDates]
        .filter((date, index, self) => self.indexOf(date) === index)
        .sort()
        .reverse();
      setAvailableDates(allDates);
    }
  }, [missionaryActivities, availableDates]);
  
  // Função para agrupar atividades por classe quando o trimestre está selecionado (versão anterior)
  const getActivitiesByClass = () => {
    if (!selectedTrimester || missionaryActivities.length === 0) return [];
    
    // Filtrar atividades do trimestre
    const activitiesInTrimester = missionaryActivities.filter(activity => 
      isDateInTrimester(activity.date, selectedTrimester)
    );
    
    // Agrupar atividades por classId
    const groupedActivities = new Map();
    
    // Percorrer todas as classes disponíveis para garantir que todas apareçam
    classes.forEach(classItem => {
      // Inicializar o grupo para esta classe
      if (!groupedActivities.has(classItem.id)) {
        groupedActivities.set(classItem.id, {
          classId: classItem.id,
          className: classItem.name,
          activities: [],
          summary: {
            literaturasDistribuidas: 0,
            qtdContatosMissionarios: 0, 
            estudosBiblicos: 0,
            ministrados: 0,
            visitasMissionarias: 0,
            pessoasAuxiliadas: 0,
            pessoasTrazidasIgreja: 0
          }
        });
      }
    });
    
    // Adicionar atividades aos grupos
    activitiesInTrimester.forEach(activity => {
      const classGroup = groupedActivities.get(activity.classId);
      if (classGroup) {
        // Adicionar atividade ao grupo
        classGroup.activities.push(activity);
        
        // Atualizar totais
        classGroup.summary.literaturasDistribuidas += (activity.literaturasDistribuidas || 0);
        classGroup.summary.qtdContatosMissionarios += (activity.qtdContatosMissionarios || 0);
        classGroup.summary.estudosBiblicos += (activity.estudosBiblicos || 0);
        classGroup.summary.ministrados += (activity.ministrados || 0);
        classGroup.summary.visitasMissionarias += (activity.visitasMissionarias || 0);
        classGroup.summary.pessoasAuxiliadas += (activity.pessoasAuxiliadas || 0);
        classGroup.summary.pessoasTrazidasIgreja += (activity.pessoasTrazidasIgreja || 0);
      }
    });
    
    // Converter o Map em Array
    return Array.from(groupedActivities.values());
  };
  
  // Nova função para gerar a tabela de atividades missionárias com uma coluna para cada classe
  const getActivitiesGridData = (): ActivityGridData | null => {
    if (!selectedTrimester || missionaryActivities.length === 0) return null;
    
    // Definir tipos de atividades missionárias
    const activityTypes = [
      { id: 'literaturasDistribuidas', name: 'Literaturas Distribuídas' },
      { id: 'qtdContatosMissionarios', name: 'Contatos Missionários' },
      { id: 'estudosBiblicosTotal', name: 'Estudos Bíblicos Ministrados' },
      { id: 'visitasMissionarias', name: 'Visitas Missionárias' },
      { id: 'pessoasAuxiliadas', name: 'Pessoas Auxiliadas' },
      { id: 'pessoasTrazidasIgreja', name: 'Pessoas Trazidas à Igreja' }
    ];
    
    // Filtrar atividades do trimestre
    const activitiesInTrimester = missionaryActivities.filter(activity => 
      isDateInTrimester(activity.date, selectedTrimester)
    );
    
    // Verificar se existem atividades no trimestre
    if (activitiesInTrimester.length === 0) {
      return { empty: true };
    }
    
    // Obter todas as classes ativas
    const activeClasses = classes.filter(c => c.active);
    
    // Criar o mapa da classe para seus totais
    const classActivityTotals = new Map();
    
    // Inicializar todos os totais como zero para todas as classes
    activeClasses.forEach(classItem => {
      classActivityTotals.set(classItem.id, {
        id: classItem.id,
        name: classItem.name,
        literaturasDistribuidas: 0,
        qtdContatosMissionarios: 0,
        estudosBiblicosTotal: 0, // Combinação de estudosBiblicos e ministrados
        visitasMissionarias: 0,
        pessoasAuxiliadas: 0,
        pessoasTrazidasIgreja: 0
      });
    });
    
    // Calcular totais por classe
    activitiesInTrimester.forEach(activity => {
      const classData = classActivityTotals.get(activity.classId);
      if (classData) {
        classData.literaturasDistribuidas += (activity.literaturasDistribuidas || 0);
        classData.qtdContatosMissionarios += (activity.qtdContatosMissionarios || 0);
        classData.estudosBiblicosTotal += ((activity.estudosBiblicos || 0) + (activity.ministrados || 0));
        classData.visitasMissionarias += (activity.visitasMissionarias || 0);
        classData.pessoasAuxiliadas += (activity.pessoasAuxiliadas || 0);
        classData.pessoasTrazidasIgreja += (activity.pessoasTrazidasIgreja || 0);
      }
    });
    
    // Filtrar as classes com base no filtro de classe selecionado
    let filteredClasses = Array.from(classActivityTotals.values());
    
    // Se uma classe específica foi selecionada, filtrar apenas essa classe
    if (selectedClassForReports) {
      filteredClasses = filteredClasses.filter(classData => classData.id === selectedClassForReports);
    }
    
    // Verificar se após a filtragem ainda temos dados para mostrar
    if (filteredClasses.length === 0) {
      return { empty: true };
    }
    
    // Verificar se o total geral de todas as atividades é zero
    const hasNonZeroValues = filteredClasses.some(classData => {
      return activityTypes.some(activityType => 
        classData[activityType.id] > 0
      );
    });
    
    if (!hasNonZeroValues) {
      return { empty: true };
    }
    
    // Calcular os totais gerais apenas para as classes filtradas
    const totalsByActivity = activityTypes.reduce((totals, activityType) => {
      totals[activityType.id] = filteredClasses
        .reduce((sum, classData) => sum + classData[activityType.id], 0);
      return totals;
    }, {} as Record<string, number>);
    
    return {
      activityTypes,
      classes: filteredClasses,
      totals: totalsByActivity,
      empty: false
    };
  };

  // Fetch classes
  const { 
    data: classes = [],
    isLoading: classesLoading 
  } = useQuery<Class[]>({
    queryKey: ['/api/classes'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/classes');
      return res.json();
    },
  });

  // Fetch teachers
  const {
    data: teachers = [],
    isLoading: teachersLoading
  } = useQuery<Teacher[]>({
    queryKey: ['/api/teachers'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/teachers');
      return res.json();
    },
  });

  // Fetch students for a class
  const {
    data: students = [],
    isLoading: studentsLoading,
    refetch: refetchStudents
  } = useQuery<Student[]>({
    queryKey: ['/api/classes', selectedClassId, 'students'],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const res = await apiRequest('GET', `/api/classes/${selectedClassId}/students`);
      return res.json();
    },
    enabled: !!selectedClassId,
  });



  // Create teacher mutation
  const createTeacherMutation = useMutation({
    mutationFn: async (data: typeof newTeacherData) => {
      const res = await apiRequest('POST', '/api/teachers', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Professor criado com sucesso",
        description: "O novo professor foi adicionado",
      });
      setIsAddTeacherOpen(false);
      setNewTeacherData({
        name: '',
        cpf: '',
        password: '',
        isAdmin: false
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar professor",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Edit teacher mutation
  const editTeacherMutation = useMutation({
    mutationFn: async (data: { id: number, updateData: Partial<Teacher> }) => {
      const res = await apiRequest('PATCH', `/api/teachers/${data.id}`, data.updateData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Professor atualizado com sucesso",
        description: "As informações do professor foram atualizadas",
      });
      setIsEditTeacherOpen(false);
      setTeacherToEdit(null);
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar professor",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Toggle teacher status mutation
  const toggleTeacherStatusMutation = useMutation({
    mutationFn: async (data: { id: number, active: boolean }) => {
      const res = await apiRequest('PATCH', `/api/teachers/${data.id}`, { active: data.active });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status do professor alterado",
        description: "O status do professor foi atualizado com sucesso",
      });
      setIsToggleTeacherOpen(false);
      setTeacherToToggle(null);
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar status do professor",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/classes', { name });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Classe criada com sucesso",
        description: "A nova classe foi adicionada",
      });
      setIsAddClassOpen(false);
      setNewClassName('');
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar classe",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Edit class mutation
  const editClassMutation = useMutation({
    mutationFn: async (data: { id: number, name: string }) => {
      const res = await apiRequest('PATCH', `/api/classes/${data.id}`, { name: data.name });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Classe atualizada com sucesso",
        description: "O nome da classe foi atualizado",
      });
      setIsEditClassOpen(false);
      setClassToEdit(null);
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar classe",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Toggle class status mutation
  const toggleClassStatusMutation = useMutation({
    mutationFn: async (data: { id: number, active: boolean }) => {
      const res = await apiRequest('PATCH', `/api/classes/${data.id}`, { active: data.active });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status da classe alterado",
        description: "O status da classe foi atualizado com sucesso",
      });
      setIsToggleClassOpen(false);
      setClassToToggle(null);
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar status da classe",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (data: { name: string, classId: number }) => {
      const res = await apiRequest('POST', '/api/students', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Aluno criado com sucesso",
        description: "O novo aluno foi adicionado",
      });
      setIsAddStudentOpen(false);
      setNewStudentName('');
      if (selectedClassId) {
        refetchStudents();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar aluno",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Edit student mutation
  const editStudentMutation = useMutation({
    mutationFn: async (data: { id: number, name: string }) => {
      const res = await apiRequest('PATCH', `/api/students/${data.id}`, { name: data.name });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Aluno atualizado com sucesso",
        description: "O nome do aluno foi atualizado",
      });
      setIsEditStudentOpen(false);
      setStudentToEdit(null);
      if (selectedClassId) {
        refetchStudents();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar aluno",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Toggle student status mutation
  const toggleStudentStatusMutation = useMutation({
    mutationFn: async (data: { id: number, active: boolean }) => {
      const res = await apiRequest('PATCH', `/api/students/${data.id}`, { active: data.active });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status do aluno alterado",
        description: "O status do aluno foi atualizado com sucesso",
      });
      setIsToggleStudentOpen(false);
      setStudentToToggle(null);
      if (selectedClassId) {
        refetchStudents();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar status do aluno",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Assign teacher to class mutation
  const assignTeacherClassMutation = useMutation({
    mutationFn: async (data: { teacherId: number, classId: number }) => {
      const res = await apiRequest('POST', '/api/teacher-classes', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Professor atribuído com sucesso",
        description: "O professor foi atribuído à classe",
      });
      setIsAssignTeacherOpen(false);
      setSelectedTeacherForAssignment(null);
      setSelectedClassForAssignment(null);
      // You might want to invalidate some queries here
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atribuir professor",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const toggleTeacherStatus = (teacher: Teacher) => {
    setTeacherToToggle(teacher);
    setIsToggleTeacherOpen(true);
  };

  const toggleClassStatus = (classObj: Class) => {
    setClassToToggle(classObj);
    setIsToggleClassOpen(true);
  };

  const handleEditClass = (classObj: Class) => {
    setClassToEdit(classObj);
    setEditClassName(classObj.name);
    setIsEditClassOpen(true);
  };

  const toggleStudentStatus = (student: Student) => {
    setStudentToToggle(student);
    setIsToggleStudentOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setStudentToEdit(student);
    setEditStudentName(student.name);
    setIsEditStudentOpen(true);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setTeacherToEdit(teacher);
    setEditTeacherData({
      name: teacher.name,
      cpf: teacher.cpf,
      password: '', // We don't send the current password for security reasons
      isAdmin: teacher.isAdmin
    });
    setIsEditTeacherOpen(true);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl md:text-2xl font-bold">CLASSE ALUNOS</h1>
        <div className="flex items-center space-x-3">
          <span className="hidden md:inline">Olá, {teacher?.name}</span>
          <button 
            onClick={() => logoutMutation.mutate()}
            className="flex items-center bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition"
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold">Painel do Administrador</h1>

        <Tabs 
          defaultValue="teachers" 
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="space-y-4"
        >
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="teachers">
              <User className="h-4 w-4 mr-1 inline" />
              <span>Professores</span>
            </TabsTrigger>
            <TabsTrigger value="classes">
              <School className="h-4 w-4 mr-1 inline" />
              <span>Classes</span>
            </TabsTrigger>
            <TabsTrigger value="records">
              <Book className="h-4 w-4 mr-1 inline" />
              <span>Registros</span>
            </TabsTrigger>
          </TabsList>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Professores</CardTitle>
                  <CardDescription>Gerenciar professores e permissões</CardDescription>
                </div>
                <Button onClick={() => setIsAddTeacherOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Professor
                </Button>
              </CardHeader>
              <CardContent>
                {teachersLoading ? (
                  <div className="text-center py-4">Carregando professores...</div>
                ) : teachers.length === 0 ? (
                  <div className="text-center py-4">Nenhum professor encontrado.</div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teachers.map((teacher) => (
                          <TableRow key={teacher.id} className={!teacher.active ? "opacity-60" : ""}>
                            <TableCell className="font-medium">{teacher.name}</TableCell>
                            <TableCell>{teacher.cpf}</TableCell>
                            <TableCell>{teacher.isAdmin ? "Administrador" : "Professor"}</TableCell>
                            <TableCell>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                teacher.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {teacher.active ? "Ativo" : "Inativo"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditTeacher(teacher)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleTeacherStatus(teacher)}
                              >
                                {teacher.active ? (
                                  <MinusCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Classes</CardTitle>
                  <CardDescription>Gerenciar classes e alunos</CardDescription>
                </div>
                <div className="space-x-2">
                  <Button onClick={() => setIsAddClassOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Classe
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAssignTeacherOpen(true)}
                    disabled={classes.length === 0 || teachers.length === 0}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Atribuir Professor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="classes" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full max-w-md mb-4">
                    <TabsTrigger value="classes">
                      <School className="h-4 w-4 mr-1 inline" />
                      <span>Classes</span>
                    </TabsTrigger>
                    <TabsTrigger value="students" disabled={!selectedClassId}>
                      <User className="h-4 w-4 mr-1 inline" />
                      <span>Alunos</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="classes">
                    {classesLoading ? (
                      <div className="text-center py-4">Carregando classes...</div>
                    ) : classes.length === 0 ? (
                      <div className="text-center py-4">Nenhuma classe encontrada.</div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome da Classe</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classes.map((classObj) => (
                              <TableRow 
                                key={classObj.id} 
                                className={cn(
                                  !classObj.active ? "opacity-60" : "",
                                  selectedClassId === classObj.id ? "bg-muted" : ""
                                )}
                                onClick={() => setSelectedClassId(classObj.id)}
                              >
                                <TableCell className="font-medium">{classObj.name}</TableCell>
                                <TableCell>
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    classObj.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                  }`}>
                                    {classObj.active ? "Ativa" : "Inativa"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditClass(classObj);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleClassStatus(classObj);
                                    }}
                                  >
                                    {classObj.active ? (
                                      <MinusCircle className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <Check className="h-4 w-4 text-green-500" />
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  <TabsContent value="students">
                    {!selectedClassId ? (
                      <div className="text-center py-4">Selecione uma classe para ver os alunos.</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold">
                            Alunos da {classes.find(c => c.id === selectedClassId)?.name}
                          </h3>
                          <Button onClick={() => setIsAddStudentOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar Aluno
                          </Button>
                        </div>
                        
                        {studentsLoading ? (
                          <div className="text-center py-4">Carregando alunos...</div>
                        ) : students.length === 0 ? (
                          <div className="text-center py-4">Nenhum aluno encontrado.</div>
                        ) : (
                          <ScrollArea className="h-[300px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {students.map((student) => (
                                  <TableRow key={student.id} className={!student.active ? "opacity-60" : ""}>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell>
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        student.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                      }`}>
                                        {student.active ? "Ativo" : "Inativo"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleEditStudent(student)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleStudentStatus(student)}
                                      >
                                        {student.active ? (
                                          <MinusCircle className="h-4 w-4 text-red-500" />
                                        ) : (
                                          <Check className="h-4 w-4 text-green-500" />
                                        )}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Records Tab */}
          <TabsContent value="records">
            <Card>
              <CardHeader className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 pb-2">
                <div>
                  <CardTitle>Registros</CardTitle>
                  <CardDescription>Visualizar registros de frequência e atividades missionárias</CardDescription>
                </div>
                <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
                  <Select
                    value={selectedClassForReports?.toString() || ""}
                    onValueChange={(value) => setSelectedClassForReports(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Filtrar por Classe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as Classes</SelectItem>
                      {classes.filter(c => c.active).map((classObj) => (
                        <SelectItem key={classObj.id} value={classObj.id.toString()}>
                          {classObj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex gap-2">
                    <Select
                      value={selectedDateForReports || ""}
                      onValueChange={(value) => {
                        setSelectedDateForReports(value || null);
                        // Reset trimester when a specific date is selected
                        if (value) {
                          setSelectedTrimester(null);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filtrar por Data" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas as Datas</SelectItem>
                        {availableDates.map((date) => (
                          <SelectItem key={date} value={date}>
                            {formatBrazilianDate(date)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={selectedTrimester?.toString() || ""}
                      onValueChange={(value) => {
                        setSelectedTrimester(value ? parseInt(value) : null);
                        // Reset specific date when a trimester is selected
                        if (value) {
                          setSelectedDateForReports(null);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filtrar por Trimestre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os Trimestres</SelectItem>
                        <SelectItem value="1">1º Trimestre</SelectItem>
                        <SelectItem value="2">2º Trimestre</SelectItem>
                        <SelectItem value="3">3º Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="attendance" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full max-w-md mb-4">
                    <TabsTrigger value="attendance">
                      <User className="h-4 w-4 mr-1 inline" />
                      <span>Registros de Presença</span>
                    </TabsTrigger>
                    <TabsTrigger value="activities">
                      <BarChart className="h-4 w-4 mr-1 inline" />
                      <span>Atividades Missionárias</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Attendance Tab */}
                  <TabsContent value="attendance">
                    <div className="pb-4">
                      <h3 className="text-lg font-medium">
                        Registros de Presença
                      </h3>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                        <span>
                          {selectedClassForReports 
                            ? `Classe: ${classes.find(c => c.id === selectedClassForReports)?.name || ''}` 
                            : 'Todas as Classes'}
                        </span>
                        {selectedDateForReports && <span>| Data: {formatBrazilianDate(selectedDateForReports)}</span>}
                        {selectedTrimester && <span>| Trimestre: {selectedTrimester}º Trimestre</span>}
                      </div>
                    </div>
                    
                    {attendanceLoading ? (
                      <div className="text-center py-4">Carregando registros de presença...</div>
                    ) : attendanceRecords.length === 0 ? (
                      <div className="text-center py-4">Nenhum registro de presença encontrado.</div>
                    ) : selectedTrimester ? (
                      /* Visualização do trimestre (resumo por classe) */
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Classe</TableHead>
                              <TableHead className="text-center">Quantidade Presença</TableHead>
                              <TableHead className="text-center">Quantidade Ausência</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getAttendanceByClassAndTrimester().map((summary) => (
                              <TableRow 
                                key={summary.classId} 
                                className={summary.classId === 'total' ? 'bg-muted font-medium' : ''}
                              >
                                <TableCell className="font-medium">{summary.className}</TableCell>
                                <TableCell className="text-center">{summary.presentCount}</TableCell>
                                <TableCell className="text-center">{summary.absentCount}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    ) : (
                      /* Visualização padrão (registros individuais) */
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Classe</TableHead>
                              <TableHead>Aluno</TableHead>
                              <TableHead className="text-center">Presente</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendanceRecords
                              .filter(record => {
                                let matchesFilters = true;
                                if (selectedClassForReports) {
                                  matchesFilters = matchesFilters && record.classId === selectedClassForReports;
                                }
                                if (selectedDateForReports) {
                                  matchesFilters = matchesFilters && record.date === selectedDateForReports;
                                }
                                return matchesFilters;
                              })
                              .map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell>{formatBrazilianDate(record.date)}</TableCell>
                                  <TableCell>{record.className}</TableCell>
                                  <TableCell>{record.studentName}</TableCell>
                                  <TableCell className="text-center">
                                    {record.present ? (
                                      <div className="flex justify-center">
                                        <Check className="h-5 w-5 text-green-500" />
                                      </div>
                                    ) : (
                                      <div className="flex justify-center">
                                        <MinusCircle className="h-5 w-5 text-red-500" />
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </TabsContent>
                  
                  {/* Missionary Activities Tab */}
                  <TabsContent value="activities">
                    <div className="pb-4">
                      <h3 className="text-lg font-medium">
                        Atividades Missionárias
                      </h3>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                        <span>
                          {selectedClassForReports
                            ? `Classe: ${classes.find(c => c.id === selectedClassForReports)?.name || ''}`
                            : 'Todas as Classes'}
                        </span>
                        {selectedDateForReports && <span>| Data: {formatBrazilianDate(selectedDateForReports)}</span>}
                        {selectedTrimester && <span>| Trimestre: {selectedTrimester}º Trimestre</span>}
                      </div>
                    </div>
                    
                    {activitiesLoading ? (
                      <div className="text-center py-4">Carregando registros de atividades...</div>
                    ) : missionaryActivities.length === 0 ? (
                      <div className="text-center py-4">Nenhum registro de atividade missionária encontrado.</div>
                    ) : selectedTrimester ? (
                      /* Nova visualização em grid com uma coluna para cada classe quando filtrado por trimestre */
                      <MissionaryTable data={getActivitiesGridData()} />
                    ) : (
                      /* Visualização normal quando não filtrado por trimestre */
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Classe</TableHead>
                              <TableHead className="text-right">Lit. Distribuídas</TableHead>
                              <TableHead className="text-right">Contatos Missionários</TableHead>
                              <TableHead className="text-right">Est. Bíblicos</TableHead>
                              <TableHead className="text-right">Ministrados</TableHead>
                              <TableHead className="text-right">Visitas</TableHead>
                              <TableHead className="text-right">Auxiliadas</TableHead>
                              <TableHead className="text-right">Trazidas à Igreja</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {missionaryActivities
                              .filter(activity => {
                                let matchesFilters = true;
                                if (selectedClassForReports) {
                                  matchesFilters = matchesFilters && activity.classId === selectedClassForReports;
                                }
                                if (selectedDateForReports) {
                                  matchesFilters = matchesFilters && activity.date === selectedDateForReports;
                                }
                                return matchesFilters;
                              })
                              .map((activity) => (
                                <TableRow key={activity.id}>
                                  <TableCell>{formatBrazilianDate(activity.date)}</TableCell>
                                  <TableCell>{classes.find(c => c.id === activity.classId)?.name}</TableCell>
                                  <TableCell className="text-right">{activity.literaturasDistribuidas || 0}</TableCell>
                                  <TableCell className="text-right">{activity.qtdContatosMissionarios || 0}</TableCell>
                                  <TableCell className="text-right">{activity.estudosBiblicos || 0}</TableCell>
                                  <TableCell className="text-right">{activity.ministrados || 0}</TableCell>
                                  <TableCell className="text-right">{activity.visitasMissionarias || 0}</TableCell>
                                  <TableCell className="text-right">{activity.pessoasAuxiliadas || 0}</TableCell>
                                  <TableCell className="text-right">{activity.pessoasTrazidasIgreja || 0}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Teacher Dialog */}
      <Dialog open={isAddTeacherOpen} onOpenChange={setIsAddTeacherOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Professor</DialogTitle>
            <DialogDescription>
              Preencha as informações do novo professor abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                value={newTeacherData.name}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cpf" className="text-right">
                CPF
              </Label>
              <Input
                id="cpf"
                value={newTeacherData.cpf}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, cpf: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={newTeacherData.password}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, password: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isAdmin" className="text-right">
                Administrador
              </Label>
              <Switch
                id="isAdmin"
                checked={newTeacherData.isAdmin}
                onCheckedChange={(checked) => setNewTeacherData({ ...newTeacherData, isAdmin: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => createTeacherMutation.mutate(newTeacherData)}
              disabled={createTeacherMutation.isPending}
            >
              {createTeacherMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditTeacherOpen} onOpenChange={setIsEditTeacherOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Professor</DialogTitle>
            <DialogDescription>
              Atualize as informações do professor abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Nome
              </Label>
              <Input
                id="edit-name"
                value={editTeacherData.name}
                onChange={(e) => setEditTeacherData({ ...editTeacherData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-cpf" className="text-right">
                CPF
              </Label>
              <Input
                id="edit-cpf"
                value={editTeacherData.cpf}
                onChange={(e) => setEditTeacherData({ ...editTeacherData, cpf: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-password" className="text-right">
                Nova Senha
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={editTeacherData.password}
                onChange={(e) => setEditTeacherData({ ...editTeacherData, password: e.target.value })}
                className="col-span-3"
                placeholder="Deixe em branco para manter a senha atual"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-isAdmin" className="text-right">
                Administrador
              </Label>
              <Switch
                id="edit-isAdmin"
                checked={editTeacherData.isAdmin}
                onCheckedChange={(checked) => setEditTeacherData({ ...editTeacherData, isAdmin: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (teacherToEdit) {
                  const updateData: Partial<Teacher> = { ...editTeacherData };
                  if (!updateData.password) {
                    delete updateData.password;
                  }
                  editTeacherMutation.mutate({ id: teacherToEdit.id, updateData });
                }
              }}
              disabled={editTeacherMutation.isPending}
            >
              {editTeacherMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Teacher Status Dialog */}
      <AlertDialog open={isToggleTeacherOpen} onOpenChange={setIsToggleTeacherOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {teacherToToggle?.active ? "Desativar Professor" : "Ativar Professor"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {teacherToToggle?.active 
                ? `Tem certeza que deseja desativar o professor "${teacherToToggle?.name}"? Professores desativados não poderão mais acessar o sistema.`
                : `Tem certeza que deseja ativar o professor "${teacherToToggle?.name}"? Professores ativos podem acessar o sistema.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (teacherToToggle) {
                  toggleTeacherStatusMutation.mutate({
                    id: teacherToToggle.id,
                    active: !teacherToToggle.active
                  });
                }
              }}
            >
              {teacherToToggle?.active ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Class Dialog */}
      <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Classe</DialogTitle>
            <DialogDescription>
              Insira o nome da nova classe abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="className" className="text-right">
                Nome
              </Label>
              <Input
                id="className"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => createClassMutation.mutate(newClassName)}
              disabled={createClassMutation.isPending || !newClassName.trim()}
            >
              {createClassMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isEditClassOpen} onOpenChange={setIsEditClassOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Classe</DialogTitle>
            <DialogDescription>
              Atualize o nome da classe abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editClassName" className="text-right">
                Nome
              </Label>
              <Input
                id="editClassName"
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (classToEdit) {
                  editClassMutation.mutate({
                    id: classToEdit.id,
                    name: editClassName
                  });
                }
              }}
              disabled={editClassMutation.isPending || !editClassName.trim()}
            >
              {editClassMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Class Status Dialog */}
      <AlertDialog open={isToggleClassOpen} onOpenChange={setIsToggleClassOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {classToToggle?.active ? "Desativar Classe" : "Ativar Classe"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {classToToggle?.active 
                ? `Tem certeza que deseja desativar a classe "${classToToggle?.name}"? Classes desativadas não aparecerão nas listas de seleção.`
                : `Tem certeza que deseja ativar a classe "${classToToggle?.name}"? Classes ativas aparecerão nas listas de seleção.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (classToToggle) {
                  toggleClassStatusMutation.mutate({
                    id: classToToggle.id,
                    active: !classToToggle.active
                  });
                }
              }}
            >
              {classToToggle?.active ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Student Dialog */}
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Aluno</DialogTitle>
            <DialogDescription>
              Insira o nome do novo aluno para a classe {classes.find(c => c.id === selectedClassId)?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="studentName" className="text-right">
                Nome
              </Label>
              <Input
                id="studentName"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (selectedClassId) {
                  createStudentMutation.mutate({
                    name: newStudentName,
                    classId: selectedClassId
                  });
                }
              }}
              disabled={createStudentMutation.isPending || !newStudentName.trim() || !selectedClassId}
            >
              {createStudentMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Student Status Dialog */}
      <AlertDialog open={isToggleStudentOpen} onOpenChange={setIsToggleStudentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {studentToToggle?.active ? "Desativar Aluno" : "Ativar Aluno"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {studentToToggle?.active 
                ? `Tem certeza que deseja desativar o aluno "${studentToToggle?.name}"? Alunos desativados não aparecerão nas listas de chamada.`
                : `Tem certeza que deseja ativar o aluno "${studentToToggle?.name}"? Alunos ativos aparecerão nas listas de chamada.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (studentToToggle) {
                  toggleStudentStatusMutation.mutate({
                    id: studentToToggle.id,
                    active: !studentToToggle.active
                  });
                }
              }}
            >
              {studentToToggle?.active ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditStudentOpen} onOpenChange={setIsEditStudentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>
              Atualize o nome do aluno abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editStudentName" className="text-right">
                Nome
              </Label>
              <Input
                id="editStudentName"
                value={editStudentName}
                onChange={(e) => setEditStudentName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (studentToEdit) {
                  editStudentMutation.mutate({
                    id: studentToEdit.id,
                    name: editStudentName
                  });
                }
              }}
              disabled={editStudentMutation.isPending || !editStudentName.trim()}
            >
              {editStudentMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Teacher to Class Dialog */}
      <Dialog open={isAssignTeacherOpen} onOpenChange={setIsAssignTeacherOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Atribuir Professor à Classe</DialogTitle>
            <DialogDescription>
              Selecione o professor e a classe para fazer a atribuição.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teacherSelect" className="text-right">
                Professor
              </Label>
              <Select
                value={selectedTeacherForAssignment?.toString() || ""}
                onValueChange={(value) => setSelectedTeacherForAssignment(parseInt(value))}
              >
                <SelectTrigger className="col-span-3" id="teacherSelect">
                  <SelectValue placeholder="Selecione um professor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers
                    .filter(t => t.active)
                    .map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="classSelect" className="text-right">
                Classe
              </Label>
              <Select
                value={selectedClassForAssignment?.toString() || ""}
                onValueChange={(value) => setSelectedClassForAssignment(parseInt(value))}
              >
                <SelectTrigger className="col-span-3" id="classSelect">
                  <SelectValue placeholder="Selecione uma classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes
                    .filter(c => c.active)
                    .map((classObj) => (
                      <SelectItem key={classObj.id} value={classObj.id.toString()}>
                        {classObj.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (selectedTeacherForAssignment && selectedClassForAssignment) {
                  assignTeacherClassMutation.mutate({
                    teacherId: selectedTeacherForAssignment,
                    classId: selectedClassForAssignment
                  });
                }
              }}
              disabled={
                assignTeacherClassMutation.isPending || 
                !selectedTeacherForAssignment || 
                !selectedClassForAssignment
              }
            >
              {assignTeacherClassMutation.isPending ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}