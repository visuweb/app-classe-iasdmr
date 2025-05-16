import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatBrazilianDate } from '@/lib/date-utils';
import { startOfYear, setMonth, setDate, endOfMonth, format } from "date-fns";
import { LogOut, School, User, Book, BarChart, Plus, UserPlus, Calendar, Filter, Trash2, Check, Pencil, MinusCircle, Search, CalendarIcon, Users, X } from 'lucide-react';
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
import { useLocation } from 'wouter';
import { FormControlLabel } from '@/components/ui/form-control-label';
import AttendanceDetailsList from './AttendanceDetailsList';

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
  
  // Filtros para alunos
  const [studentFilter, setStudentFilter] = useState<string>('');
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<string>('all');
  
  const [, setLocation] = useLocation();
  
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
    
    // Return empty array if no records in the selected trimester
    if (recordsInTrimester.length === 0) return [];
    
    // Group records by class
    const classSummary = new Map();
    
    // Initialize with only active classes
    classes.filter(classItem => classItem.active).forEach(classItem => {
      if (!classSummary.has(classItem.id)) {
        classSummary.set(classItem.id, {
          classId: classItem.id,
          className: classItem.name,
          presentCount: 0,
          absentCount: 0,
          totalRecords: 0,
          visitorCount: 0 // Adicionando contador de visitantes
        });
      }
    });
    
    // Count present/absent for each class
    recordsInTrimester.forEach(record => {
      // Encontrar o classId pelo nome da classe
      const classObj = classes.find(c => c.name === record.className && c.active);
      if (!classObj) return; // Classe não encontrada ou inativa
      
      const classData = classSummary.get(classObj.id);
      if (classData) {
        classData.totalRecords++;
        if (record.present) {
          classData.presentCount++;
        } else {
          classData.absentCount++;
        }
      }
    });
    
    // Contar visitantes por classe durante o trimestre
    if (missionaryActivities.length > 0) {
      // Obter o intervalo de datas do trimestre
      const { start, end } = getTrimesterDateRange(selectedTrimester);
      
      // Filtrar atividades missionárias do trimestre
      const activitiesInTrimester = missionaryActivities.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate >= start && activityDate <= end;
      });
      
      // Somar visitantes para cada classe
      activitiesInTrimester.forEach(activity => {
        if (activity.classId && classSummary.has(activity.classId)) {
          const classData = classSummary.get(activity.classId);
          classData.visitorCount += (activity.visitantes || 0);
        }
      });
    }
    
    // Calculate totals
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalVisitors = 0;
    
    classSummary.forEach(summary => {
      totalPresent += summary.presentCount;
      totalAbsent += summary.absentCount;
      totalVisitors += summary.visitorCount;
    });
    
    // Add a "total" row
    classSummary.set('total', {
      classId: 'total',
      className: 'Total',
      presentCount: totalPresent,
      absentCount: totalAbsent,
      totalRecords: totalPresent + totalAbsent,
      visitorCount: totalVisitors // Adicionando total de visitantes
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
    
    // Filtrar atividades do trimestre apenas de classes ativas
    const activitiesInTrimester = missionaryActivities.filter(activity => {
      // Verificar se a classe existe e está ativa
      const classObj = classes.find(c => c.id === activity.classId);
      return isDateInTrimester(activity.date, selectedTrimester) && classObj && classObj.active;
    });
    
    // Verificar se existem atividades no trimestre
    if (activitiesInTrimester.length === 0) {
      return { empty: true };
    }
    
    // Obter todas as classes ativas
    const activeClasses = classes.filter(c => c.active);
    
    // Criar o mapa da classe para seus totais
    const classActivityTotals = new Map();
    
    // Inicializar todos os totais como zero para todas as classes ativas
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

  // Buscar professores para cada classe
  const teachersByClass = useQuery({
    queryKey: ['/api/classes-teachers'],
    queryFn: async () => {
      if (!classes || classes.length === 0) return {};

      // Criar um mapa que armazenará o ID da classe como chave e uma lista de professores como valor
      const teachersMap: Record<number, { id: number, name: string }[]> = {};

      // Buscar professores para cada classe em paralelo
      await Promise.all(
        classes.map(async (classObj) => {
          try {
            const res = await apiRequest('GET', `/api/classes/${classObj.id}/teachers`);
            const teachers = await res.json();
            teachersMap[classObj.id] = teachers;
          } catch (error) {
            teachersMap[classObj.id] = [];
          }
        })
      );

      return teachersMap;
    },
    enabled: classes.length > 0,
  });

  // Remove teacher from class mutation
  const removeTeacherFromClassMutation = useMutation({
    mutationFn: async (data: { teacherId: number, classId: number }) => {
      // Usando formato correto conforme implementado no servidor
      const res = await apiRequest('DELETE', `/api/teacher-classes/${data.teacherId}/${data.classId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Professor removido da classe",
        description: "O professor foi removido da classe com sucesso",
      });
      setIsRemoveTeacherFromClassOpen(false);
      setTeacherToRemove(null);
      setClassFromRemove(null);
      // Invalidar as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['/api/classes-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover professor",
        description: error.message,
        variant: "destructive",
      });
    }
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
      const res = await apiRequest('PUT', `/api/teachers/${data.id}`, data.updateData);
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
      const res = await apiRequest('PUT', `/api/teachers/${data.id}`, { active: data.active });
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
      // Forçar atualização do componente
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/teachers'] });
      }, 100);
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
      const res = await apiRequest('PUT', `/api/classes/${data.id}`, { name: data.name });
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
      // Também invalidar queries relacionadas a alunos
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      // Forçar atualização dos componentes
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/classes'] });
      }, 100);
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
      const res = await apiRequest('PUT', `/api/classes/${data.id}`, { active: data.active });
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
      // Também invalidar queries relacionadas a alunos e contagens
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/class-student-counts'] });
      // Forçar atualização dos componentes
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/classes'] });
      }, 100);
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
      // Invalidar a query que busca todos os alunos (usada na aba Alunos)
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      // Invalidar a query que conta alunos por classe
      queryClient.invalidateQueries({ queryKey: ['/api/class-student-counts'] });
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
      const res = await apiRequest('PUT', `/api/students/${data.id}`, { name: data.name });
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
      // Invalidar a query que busca todos os alunos (usada na aba Alunos)
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      // Invalidar a query que conta alunos por classe
      queryClient.invalidateQueries({ queryKey: ['/api/class-student-counts'] });
      // Forçar atualização do componente
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/students'] });
      }, 100);
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
      const res = await apiRequest('DELETE', `/api/students/${data.id}`);
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
      // Invalidar a query que busca todos os alunos (usada na aba Alunos)
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      // Invalidar a query que conta alunos por classe
      queryClient.invalidateQueries({ queryKey: ['/api/class-student-counts'] });
      // Forçar atualização do componente
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/students'] });
      }, 100);
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
      // Invalidar queries relacionadas às classes e suas atribuições de professores
      queryClient.invalidateQueries({ queryKey: ['/api/classes-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      
      // Forçar atualização imediata dos dados
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/classes-teachers'] });
      }, 100);
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

  // Filtro de classes
  const [classFilter, setClassFilter] = useState('');
  
  // Filtro de professores
  const [teacherFilter, setTeacherFilter] = useState('');

  // Estados para controle de exibição de registros inativos
  const [showInactiveTeachers, setShowInactiveTeachers] = useState(false);
  const [showInactiveClasses, setShowInactiveClasses] = useState(false);
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);

  // Fetch class student counts
  const classStudentCounts = useQuery({
    queryKey: ['/api/class-student-counts'],
    queryFn: async () => {
      if (!classes || classes.length === 0) return {};

      // Criar um mapa que armazenará o ID da classe como chave e a contagem de alunos como valor
      const countsMap: Record<number, number> = {};

      // Buscar alunos para cada classe em paralelo
      await Promise.all(
        classes.map(async (classObj) => {
          try {
            const res = await apiRequest('GET', `/api/classes/${classObj.id}/students`);
            const students = await res.json();
            countsMap[classObj.id] = students.length;
          } catch (error) {
            countsMap[classObj.id] = 0;
          }
        })
      );

      return countsMap;
    },
    enabled: classes.length > 0,
  });

  // Função para navegar para a página de alunos filtrada por classe
  const goToClassStudents = (classId: number) => {
    // Atualizar o estado para selecionar a aba de alunos
    setSelectedTab("students");
    // Limpar o filtro de nome de aluno
    setStudentFilter("");
    // Limpar o filtro de mostrar inativos (sempre mostrar ativos por padrão)
    setShowInactiveStudents(false);
    // Aplicar o filtro de classe
    setSelectedClassForStudents(classId.toString());
    
    // Invalidar a query de alunos para garantir que os dados estão atualizados
    queryClient.invalidateQueries({ queryKey: ['/api/students'] });
  };

  // Estado para remover professor da classe
  const [isRemoveTeacherFromClassOpen, setIsRemoveTeacherFromClassOpen] = useState(false);
  const [teacherToRemove, setTeacherToRemove] = useState<{id: number, name?: string} | null>(null);
  const [classFromRemove, setClassFromRemove] = useState<{id: number, name?: string} | null>(null);

  const handleRemoveTeacherFromClass = (teacherId: number, classId: number) => {
    setTeacherToRemove({ id: teacherId, name: teachers.find(t => t.id === teacherId)?.name });
    setClassFromRemove({ id: classId, name: classes.find(c => c.id === classId)?.name });
    setIsRemoveTeacherFromClassOpen(true);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Painel do Administrador</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </div>

      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="teachers">
            <User className="w-4 h-4 mr-2" />
            Professores
          </TabsTrigger>
          <TabsTrigger value="classes">
            <School className="w-4 h-4 mr-2" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="w-4 h-4 mr-2" />
            Alunos
          </TabsTrigger>
          <TabsTrigger value="records">
            <BarChart className="w-4 h-4 mr-2" />
            Relatórios
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
              {/* Campo de filtro de professores */}
              <div className="mb-4 flex items-center gap-4">
                <div className="relative w-auto inline-flex max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar professor por nome..."
                    className="pl-8"
                    value={teacherFilter || ''}
                    onChange={(e) => setTeacherFilter(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="inactive-teachers"
                    checked={showInactiveTeachers}
                    onCheckedChange={setShowInactiveTeachers}
                  />
                  <Label htmlFor="inactive-teachers">Mostrar Inativos</Label>
                </div>
              </div>
              
              {teachersLoading ? (
                <div className="text-center py-4">Carregando professores...</div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="border border-gray-200 rounded-md overflow-hidden">
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
                        {teachers
                          .filter(teacher => {
                            // Filtro por nome
                            const nameMatch = !teacherFilter || 
                              teacher.name.toLowerCase().includes(teacherFilter.toLowerCase());
                            
                            // Filtro por status
                            const statusMatch = showInactiveTeachers ? !teacher.active : teacher.active;
                            
                            return nameMatch && statusMatch;
                          })
                          .map((teacher) => (
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
                  </div>
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
              {/* Filtro de classes */}
              <div className="mb-4 flex items-center gap-4">
                <div className="relative w-auto inline-flex max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar classes..."
                    className="pl-8"
                    value={classFilter || ''}
                    onChange={(e) => setClassFilter(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="inactive-classes"
                    checked={showInactiveClasses}
                    onCheckedChange={setShowInactiveClasses}
                  />
                  <Label htmlFor="inactive-classes">Mostrar Inativos</Label>
                </div>
              </div>

              {classesLoading ? (
                <div className="text-center py-4">Carregando classes...</div>
              ) : classes.filter(classObj => {
                  // Filtro por nome
                  const nameMatch = !classFilter || 
                    classObj.name.toLowerCase().includes(classFilter.toLowerCase());
                  
                  // Filtro por status
                  const statusMatch = showInactiveClasses ? !classObj.active : classObj.active;
                  
                  return nameMatch && statusMatch;
                }).length === 0 ? (
                <div className="p-6 text-center">
                  <School className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-1">Nenhuma classe encontrada</h3>
                  <p className="text-sm text-muted-foreground">
                    {classFilter 
                      ? 'Tente ajustar os filtros para ver mais resultados' 
                      : 'Nenhuma classe foi cadastrada no sistema ainda'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome da Classe</TableHead>
                          <TableHead>Professor(es)</TableHead>
                          <TableHead>Qtd Alunos</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classes
                          .filter(classObj => {
                            // Filtro por nome
                            const nameMatch = !classFilter || 
                              classObj.name.toLowerCase().includes(classFilter.toLowerCase());
                            
                            // Filtro por status
                            const statusMatch = showInactiveClasses ? !classObj.active : classObj.active;
                            
                            return nameMatch && statusMatch;
                          })
                          .map((classObj) => {
                          // Usar o resultado da query de professores por classe no lugar de classIds
                          const classTeachers: {id: number, name: string}[] = 
                            teachersByClass.data && 
                            teachersByClass.data[classObj.id] ? 
                            teachersByClass.data[classObj.id] : [];
                          
                          return (
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
                                {teachersLoading ? (
                                  <div className="h-4 w-12 animate-pulse bg-muted rounded"></div>
                                ) : classTeachers.length > 0 ? (
                                  <div className="space-y-1">
                                    {classTeachers.map((t: {id: number, name: string}) => (
                                      <div key={t.id} className="flex items-center">
                                        <span>{t.name}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 ml-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveTeacherFromClass(t.id, classObj.id);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Nenhum</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {/* Contador de alunos */}
                                {classStudentCounts.isLoading ? (
                                  <div className="h-4 w-8 animate-pulse bg-muted rounded"></div>
                                ) : (
                                  classStudentCounts.data?.[classObj.id] || 0
                                )}
                              </TableCell>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    goToClassStudents(classObj.id);
                                  }}
                                >
                                  <Users className="h-4 w-4 text-blue-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Alunos</CardTitle>
                <CardDescription>Gerenciar todos os alunos cadastrados</CardDescription>
              </div>
              <Button 
                onClick={() => setIsAddStudentOpen(true)}
                disabled={classes.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Aluno
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filtros de alunos */}
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <div className="relative w-auto inline-flex max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select
                  value={selectedClassForStudents}
                  onValueChange={setSelectedClassForStudents}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as classes</SelectItem>
                    {classes.map((classObj) => (
                      <SelectItem key={classObj.id} value={classObj.id.toString()}>
                        {classObj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    id="inactive-students"
                    checked={showInactiveStudents}
                    onCheckedChange={setShowInactiveStudents}
                  />
                  <Label htmlFor="inactive-students">Mostrar Inativos</Label>
                </div>
              </div>

              {/* Query para buscar todos os alunos */}
              {(() => {
                // Usar useQuery aqui dentro para buscar todos os alunos
                const { 
                  data: allStudents = [], 
                  isLoading: allStudentsLoading,
                } = useQuery<(Student & { className?: string })[]>({
                  queryKey: ['/api/students'],
                  enabled: selectedTab === "students",
                });
                
                // Filtrar alunos
                const filteredStudents = allStudents.filter(student => {
                  const nameMatches = student.name.toLowerCase().includes(studentFilter.toLowerCase());
                  const classMatches = selectedClassForStudents === 'all' || student.classId.toString() === selectedClassForStudents;
                  
                  // Encontrar a classe do aluno
                  const studentClass = classes.find(c => c.id === student.classId);
                  
                  // Verificar se a classe está ativa
                  const isClassActive = studentClass?.active || false;
                  
                  // Status efetivo do aluno (inativo se a classe for inativa)
                  const effectiveStatus = isClassActive ? student.active : false;
                  
                  // Condição para mostrar com base no status efetivo
                  const statusMatches = showInactiveStudents ? !effectiveStatus : effectiveStatus;
                  
                  return nameMatches && classMatches && statusMatches;
                });

                return (
                  <>
                    {allStudentsLoading ? (
                      <div className="text-center py-4">Carregando alunos...</div>
                    ) : filteredStudents.length > 0 ? (
                      <ScrollArea className="h-[400px]">
                        <div className="border border-gray-200 rounded-md overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Classe</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredStudents.map((student) => {
                                // Encontrar a classe do aluno para exibir o nome
                                const studentClass = classes.find(c => c.id === student.classId);
                                
                                // Verificar se a classe está ativa
                                const isClassActive = studentClass?.active || false;
                                
                                // Status efetivo do aluno (inativo se a classe for inativa)
                                const effectiveStatus = isClassActive ? student.active : false;
                                
                                return (
                                  <TableRow key={student.id} className={!effectiveStatus ? "opacity-60" : ""}>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell>
                                      {studentClass?.name || student.className || 'Classe não encontrada'}
                                    </TableCell>
                                    <TableCell>
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        effectiveStatus ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                      }`}>
                                        {effectiveStatus ? "Ativo" : "Inativo"}
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
                                        {effectiveStatus ? (
                                          <MinusCircle className="h-4 w-4 text-red-500" />
                                        ) : (
                                          <Check className="h-4 w-4 text-green-500" />
                                        )}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="p-6 text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium mb-1">Nenhum aluno encontrado</h3>
                        <p className="text-sm text-muted-foreground">
                          {studentFilter || selectedClassForStudents !== 'all' 
                            ? 'Tente ajustar os filtros para ver mais resultados' 
                            : 'Nenhum aluno foi cadastrado no sistema ainda'}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records">
          <Card>
            <CardHeader className="pb-2">
              <div>
                <CardTitle>Registros</CardTitle>
                <CardDescription>Visualizar registros de frequência e atividades missionárias</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters now appear above the tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-semibold mb-1 text-gray-500">Classe</div>
                  <Select
                    value={selectedClassForReports?.toString() || "all_classes"}
                    onValueChange={(value) => setSelectedClassForReports(value !== "all_classes" ? parseInt(value) : null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por Classe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_classes">Todas as Classes</SelectItem>
                      {classes.filter(c => c.active).map((classObj) => (
                        <SelectItem key={classObj.id} value={classObj.id.toString()}>
                          {classObj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm font-semibold mb-1 text-gray-500">Data</div>
                  <Select
                    value={selectedDateForReports || "all_dates"}
                    onValueChange={(value) => {
                      setSelectedDateForReports(value !== "all_dates" ? value : null);
                      // Reset trimester when a specific date is selected
                      if (value !== "all_dates") {
                        setSelectedTrimester(null);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por Data" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_dates">Todas as Datas</SelectItem>
                      {availableDates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {formatBrazilianDate(date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm font-semibold mb-1 text-gray-500">Trimestre</div>
                  <Select
                    value={selectedTrimester?.toString() || "all_trimesters"}
                    onValueChange={(value) => {
                      setSelectedTrimester(value !== "all_trimesters" ? parseInt(value) : null);
                      // Reset specific date when a trimester is selected
                      if (value !== "all_trimesters") {
                        setSelectedDateForReports(null);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por Trimestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_trimesters">Todos os Trimestres</SelectItem>
                      <SelectItem value="1">1º Trimestre</SelectItem>
                      <SelectItem value="2">2º Trimestre</SelectItem>
                      <SelectItem value="3">3º Trimestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
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
                  
                  {/* Condição de carregamento */}
                  {attendanceLoading && (
                    <div className="text-center py-4">Carregando registros de presença...</div>
                  )}
                  
                  {/* Condição de nenhum registro */}
                  {!attendanceLoading && attendanceRecords.length === 0 && (
                    <div className="text-center py-4">Nenhum registro de presença encontrado.</div>
                  )}
                  
                  {/* Visualização por trimestre sem registros */}
                  {!attendanceLoading && attendanceRecords.length > 0 && selectedTrimester && getAttendanceByClassAndTrimester().length === 0 && (
                    <div className="text-center py-4">
                      Nenhum registro de presença encontrado para o trimestre selecionado.
                    </div>
                  )}
                  
                  {/* Visualização por trimestre com registros */}
                  {!attendanceLoading && attendanceRecords.length > 0 && selectedTrimester && getAttendanceByClassAndTrimester().length > 0 && (
                    <ScrollArea className="h-[400px]">
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Classe</TableHead>
                              <TableHead className="text-center">Quantidade Presença</TableHead>
                              <TableHead className="text-center">Quantidade Ausência</TableHead>
                              <TableHead className="text-center">Visitantes</TableHead>
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
                                <TableCell className="text-center">{summary.visitorCount}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  )}
                  
                  {/* Visualização padrão (sem trimestre selecionado) */}
                  {!attendanceLoading && attendanceRecords.length > 0 && !selectedTrimester && (
                    <AttendanceDetailsList 
                      attendanceRecords={attendanceRecords}
                      missionaryActivities={missionaryActivities}
                      classes={classes}
                      selectedClassForReports={selectedClassForReports}
                      selectedDateForReports={selectedDateForReports}
                    />
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
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Classe</TableHead>
                              <TableHead className="text-center">Lit. Distribuídas</TableHead>
                              <TableHead className="text-center">Contatos Missionários</TableHead>
                              <TableHead className="text-center">Est. Bíblicos Ministrados</TableHead>
                              <TableHead className="text-center">Visitas</TableHead>
                              <TableHead className="text-center">Auxiliadas</TableHead>
                              <TableHead className="text-center">Trazidas à Igreja</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {missionaryActivities
                              .filter(activity => {
                                let matchesFilters = true;
                                
                                // Verificar se a classe existe e está ativa
                                const classObj = classes.find(c => c.id === activity.classId);
                                const isClassActive = classObj && classObj.active;
                                
                                if (!isClassActive) return false;
                                
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
                                  <TableCell className="text-center">{activity.literaturasDistribuidas || 0}</TableCell>
                                  <TableCell className="text-center">{activity.qtdContatosMissionarios || 0}</TableCell>
                                  <TableCell className="text-center">{activity.estudosBiblicos || 0}</TableCell>
                                  <TableCell className="text-center">{activity.visitasMissionarias || 0}</TableCell>
                                  <TableCell className="text-center">{activity.pessoasAuxiliadas || 0}</TableCell>
                                  <TableCell className="text-center">{activity.pessoasTrazidasIgreja || 0}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais para professores */}
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
              <Label htmlFor="editTeacherName" className="text-right">
                Nome
              </Label>
              <Input
                id="editTeacherName"
                value={editTeacherData.name}
                onChange={(e) => setEditTeacherData({...editTeacherData, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editTeacherCPF" className="text-right">
                CPF
              </Label>
              <Input
                id="editTeacherCPF"
                value={editTeacherData.cpf}
                onChange={(e) => setEditTeacherData({...editTeacherData, cpf: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editTeacherPassword" className="text-right">
                Nova Senha
              </Label>
              <Input
                id="editTeacherPassword"
                type="password"
                value={editTeacherData.password}
                onChange={(e) => setEditTeacherData({...editTeacherData, password: e.target.value})}
                className="col-span-3"
                placeholder="Deixe em branco para manter a atual"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editTeacherIsAdmin" className="text-right">
                Administrador
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="editTeacherIsAdmin"
                  checked={editTeacherData.isAdmin}
                  onCheckedChange={(checked) => setEditTeacherData({...editTeacherData, isAdmin: checked})}
                />
                <Label htmlFor="editTeacherIsAdmin">
                  {editTeacherData.isAdmin ? "Sim" : "Não"}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (teacherToEdit) {
                  const updateData: Partial<Teacher> = {
                    name: editTeacherData.name,
                    cpf: editTeacherData.cpf,
                    isAdmin: editTeacherData.isAdmin,
                  };
                  
                  if (editTeacherData.password) {
                    updateData.password = editTeacherData.password;
                  }
                  
                  editTeacherMutation.mutate({
                    id: teacherToEdit.id,
                    updateData
                  });
                }
              }}
              disabled={editTeacherMutation.isPending || !editTeacherData.name || !editTeacherData.cpf}
            >
              {editTeacherMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isToggleTeacherOpen} onOpenChange={setIsToggleTeacherOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {teacherToToggle?.active ? "Desativar Professor" : "Ativar Professor"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {teacherToToggle?.active 
                ? `Tem certeza que deseja desativar o professor "${teacherToToggle?.name}"?`
                : `Tem certeza que deseja ativar o professor "${teacherToToggle?.name}"?`
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

      {/* Modais para classes */}
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

      <AlertDialog open={isToggleClassOpen} onOpenChange={setIsToggleClassOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {classToToggle?.active ? "Desativar Classe" : "Ativar Classe"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {classToToggle?.active 
                ? `Tem certeza que deseja desativar a classe "${classToToggle?.name}"?`
                : `Tem certeza que deseja ativar a classe "${classToToggle?.name}"?`
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

      {/* Modais para alunos */}
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

      {/* Modal para adicionar aluno */}
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Aluno</DialogTitle>
            <DialogDescription>
              Preencha as informações abaixo para adicionar um novo aluno.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newStudentName" className="text-right">
                Nome
              </Label>
              <Input
                id="newStudentName"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newStudentClass" className="text-right">
                Classe
              </Label>
              <Select
                value={selectedClassId?.toString() || undefined}
                onValueChange={(value) => setSelectedClassId(parseInt(value))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione uma classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.filter(c => c.active).map((classObj) => (
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
                if (selectedClassId) {
                  createStudentMutation.mutate({
                    name: newStudentName,
                    classId: selectedClassId
                  });
                }
              }}
              disabled={
                createStudentMutation.isPending || 
                !newStudentName.trim() || 
                !selectedClassId
              }
            >
              {createStudentMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para adicionar classe */}
      <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Classe</DialogTitle>
            <DialogDescription>
              Digite o nome da nova classe abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newClassName" className="text-right">
                Nome
              </Label>
              <Input
                id="newClassName"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                createClassMutation.mutate(newClassName);
              }}
              disabled={createClassMutation.isPending || !newClassName.trim()}
            >
              {createClassMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para adicionar professor */}
      <Dialog open={isAddTeacherOpen} onOpenChange={setIsAddTeacherOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Professor</DialogTitle>
            <DialogDescription>
              Preencha as informações abaixo para adicionar um novo professor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newTeacherName" className="text-right">
                Nome
              </Label>
              <Input
                id="newTeacherName"
                value={newTeacherData.name}
                onChange={(e) => setNewTeacherData({...newTeacherData, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newTeacherCPF" className="text-right">
                CPF
              </Label>
              <Input
                id="newTeacherCPF"
                value={newTeacherData.cpf}
                onChange={(e) => setNewTeacherData({...newTeacherData, cpf: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newTeacherPassword" className="text-right">
                Senha
              </Label>
              <Input
                id="newTeacherPassword"
                type="password"
                value={newTeacherData.password}
                onChange={(e) => setNewTeacherData({...newTeacherData, password: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newTeacherIsAdmin" className="text-right">
                Administrador
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="newTeacherIsAdmin"
                  checked={newTeacherData.isAdmin}
                  onCheckedChange={(checked) => setNewTeacherData({...newTeacherData, isAdmin: checked})}
                />
                <Label htmlFor="newTeacherIsAdmin">
                  {newTeacherData.isAdmin ? "Sim" : "Não"}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                createTeacherMutation.mutate(newTeacherData);
              }}
              disabled={
                createTeacherMutation.isPending || 
                !newTeacherData.name.trim() || 
                !newTeacherData.cpf.trim() || 
                !newTeacherData.password
              }
            >
              {createTeacherMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para atribuir professor a uma classe */}
      <Dialog open={isAssignTeacherOpen} onOpenChange={setIsAssignTeacherOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Atribuir Professor a uma Classe</DialogTitle>
            <DialogDescription>
              Selecione o professor e a classe para fazer a atribuição.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignTeacher" className="text-right">
                Professor
              </Label>
              <Select
                value={selectedTeacherForAssignment?.toString() || undefined}
                onValueChange={(value) => setSelectedTeacherForAssignment(parseInt(value))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um professor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.filter(t => t.active).map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignClass" className="text-right">
                Classe
              </Label>
              <Select
                value={selectedClassForAssignment?.toString() || undefined}
                onValueChange={(value) => setSelectedClassForAssignment(parseInt(value))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione uma classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.filter(c => c.active).map((classObj) => (
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

      {/* Modal para remover professor da classe */}
      <AlertDialog open={isRemoveTeacherFromClassOpen} onOpenChange={setIsRemoveTeacherFromClassOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remover Professor da Classe
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o professor "{teacherToRemove?.name}" 
              da classe "{classFromRemove?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (teacherToRemove && classFromRemove) {
                  removeTeacherFromClassMutation.mutate({
                    teacherId: teacherToRemove.id,
                    classId: classFromRemove.id
                  });
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}