import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatBrazilianDate } from '@/lib/date-utils';
import { startOfYear, setMonth, setDate, endOfMonth, format } from "date-fns";
import { LogOut, School, User, Book, BarChart, Plus, UserPlus, Calendar, Filter, Trash2, Check, Pencil, MinusCircle, Search, CalendarIcon } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Teacher, Class, Student, AttendanceRecord, MissionaryActivity } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const AdminHome = () => {
  const { teacher, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newTeacherData, setNewTeacherData] = useState({
    name: '',
    cpf: '',
    password: '',
    isAdmin: false,
  });
  const [teacherClassAssignment, setTeacherClassAssignment] = useState({
    teacherId: 0,
    classId: 0,
  });
  const [selectedClassForReports, setSelectedClassForReports] = useState<number | null>(null);
  const [selectedDateForReports, setSelectedDateForReports] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedTrimester, setSelectedTrimester] = useState<string | null>(null);
  const [reportsTabActive, setReportsTabActive] = useState<string>("attendance");
  const [teacherToToggle, setTeacherToToggle] = useState<Teacher | null>(null);
  const [isToggleTeacherOpen, setIsToggleTeacherOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [teacherNameFilter, setTeacherNameFilter] = useState('');
  const [editTeacherData, setEditTeacherData] = useState({
    name: '',
    cpf: '',
    password: '',
    isAdmin: false,
  });
  const [classToToggle, setClassToToggle] = useState<Class | null>(null);
  const [isToggleClassOpen, setIsToggleClassOpen] = useState(false);
  
  // Estado para edição de nome de classe
  const [classToEdit, setClassToEdit] = useState<Class | null>(null);
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [editClassName, setEditClassName] = useState('');
  
  // Estado para edição de nome de aluno
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [editStudentName, setEditStudentName] = useState('');
  
  // Estado para adicionar aluno
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentToToggle, setStudentToToggle] = useState<Student | null>(null);
  const [isToggleStudentOpen, setIsToggleStudentOpen] = useState(false);
  
  // Fetch attendance records
  const {
    data: attendanceRecords = [],
    isLoading: attendanceLoading,
  } = useQuery<(AttendanceRecord & { studentName: string, className: string })[]>({
    queryKey: ['/api/attendance', selectedClassForReports, selectedDateForReports, selectedTrimester],
    queryFn: async () => {
      let url = '/api/attendance';
      const params = new URLSearchParams();
      
      if (selectedClassForReports) {
        params.append('classId', selectedClassForReports.toString());
      }
      
      if (selectedDateForReports) {
        params.append('date', selectedDateForReports);
      }
      
      // Se tiver um trimestre selecionado, poderia adicionar parâmetros de consulta
      // para a API filtrar por intervalo de datas, mas isso exigiria mudanças no backend
      // Por enquanto, o filtro de trimestre é aplicado apenas localmente
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await apiRequest('GET', url);
      return res.json();
    }
  });
  
  // Extrair datas únicas quando os dados de frequência mudarem
  useEffect(() => {
    if (attendanceRecords && attendanceRecords.length > 0) {
      // Criar um conjunto de datas únicas e convertê-lo em array
      const dateSet = new Set<string>();
      attendanceRecords.forEach(record => dateSet.add(record.date));
      const uniqueDates = Array.from(dateSet).sort().reverse();
      setAvailableDates(uniqueDates);
    }
  }, [attendanceRecords]);
  
  // Fetch missionary activities
  const {
    data: missionaryActivities = [],
    isLoading: activitiesLoading,
  } = useQuery<(MissionaryActivity & { className: string })[]>({
    queryKey: ['/api/missionary-activities', selectedClassForReports, selectedDateForReports, selectedTrimester],
    queryFn: async () => {
      let url = '/api/missionary-activities';
      const params = new URLSearchParams();
      
      if (selectedClassForReports) {
        params.append('classId', selectedClassForReports.toString());
      }
      
      if (selectedDateForReports) {
        params.append('date', selectedDateForReports);
      }
      
      // Se tiver um trimestre selecionado, poderia adicionar parâmetros de consulta
      // para a API filtrar por intervalo de datas, mas isso exigiria mudanças no backend
      // Por enquanto, o filtro de trimestre é aplicado apenas localmente
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await apiRequest('GET', url);
      return res.json();
    }
  });
  
  // Atualizamos as datas disponíveis a partir das atividades missionárias
  useEffect(() => {
    if (missionaryActivities && missionaryActivities.length > 0) {
      // Extrair datas únicas das atividades missionárias usando array e filtro
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
  const getActivitiesGridData = () => {
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
    
    // Calcular os totais gerais para cada tipo de atividade
    const totalsByActivity = activityTypes.reduce((totals, activityType) => {
      totals[activityType.id] = Array.from(classActivityTotals.values())
        .reduce((sum, classData) => sum + classData[activityType.id], 0);
      return totals;
    }, {} as Record<string, number>);
    
    return {
      activityTypes,
      classes: Array.from(classActivityTotals.values()),
      totals: totalsByActivity
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

  // Fetch teachers for a class
  const {
    data: classTeachers = [],
    isLoading: classTeachersLoading,
    refetch: refetchClassTeachers
  } = useQuery<Teacher[]>({
    queryKey: ['/api/classes', selectedClassId, 'teachers'],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const res = await apiRequest('GET', `/api/classes/${selectedClassId}/teachers`);
      return res.json();
    },
    enabled: !!selectedClassId,
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (className: string) => {
      const res = await apiRequest('POST', '/api/classes', { name: className });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      toast({
        title: 'Sucesso',
        description: 'Classe criada com sucesso',
      });
      setNewClassName('');
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar classe',
        variant: 'destructive',
      });
    },
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async ({ name, classId }: { name: string; classId: number }) => {
      const res = await apiRequest('POST', '/api/students', { name, classId });
      return res.json();
    },
    onSuccess: () => {
      refetchStudents();
      toast({
        title: 'Sucesso',
        description: 'Aluno adicionado com sucesso',
      });
      setNewStudentName('');
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar aluno',
        variant: 'destructive',
      });
    },
  });

  // Create teacher mutation
  const createTeacherMutation = useMutation({
    mutationFn: async (teacherData: typeof newTeacherData) => {
      const res = await apiRequest('POST', '/api/teachers', teacherData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      toast({
        title: 'Sucesso',
        description: 'Professor criado com sucesso',
      });
      setNewTeacherData({ name: '', cpf: '', password: '', isAdmin: false });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar professor',
        variant: 'destructive',
      });
    },
  });

  // Assign teacher to class mutation
  const assignTeacherMutation = useMutation({
    mutationFn: async (data: typeof teacherClassAssignment) => {
      const res = await apiRequest('POST', '/api/teacher-classes', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClassId, 'teachers'] });
      toast({
        title: 'Sucesso',
        description: 'Professor atribuído à classe com sucesso',
      });
      setTeacherClassAssignment({ teacherId: 0, classId: 0 });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atribuir professor à classe',
        variant: 'destructive',
      });
    },
  });

  // Edit teacher mutation
  const editTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!teacherToEdit) throw new Error("Nenhum professor selecionado para edição");
      
      const data: any = {};
      if (editTeacherData.name) data.name = editTeacherData.name;
      if (editTeacherData.cpf) data.cpf = editTeacherData.cpf;
      if (editTeacherData.password) data.password = editTeacherData.password;
      data.isAdmin = editTeacherData.isAdmin;
      
      const res = await apiRequest('PUT', `/api/teachers/${teacherToEdit.id}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao editar professor");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Professor atualizado',
        description: 'O professor foi atualizado com sucesso',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      setTeacherToEdit(null);
      setEditTeacherData({ name: '', cpf: '', password: '', isAdmin: false });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar professor',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Edit student name mutation
  const editStudentMutation = useMutation({
    mutationFn: async () => {
      if (!studentToEdit) throw new Error("Nenhum aluno selecionado para edição");
      
      const res = await apiRequest('PUT', `/api/students/${studentToEdit.id}`, {
        name: editStudentName
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao editar nome do aluno");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Aluno atualizado',
        description: 'O nome do aluno foi atualizado com sucesso',
      });
      
      // Atualizar a lista de alunos da classe
      if (selectedClassId) {
        queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClassId, 'students'] });
      }
      
      setStudentToEdit(null);
      setEditStudentName('');
      setIsEditStudentOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar aluno',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Toggle student status mutation
  const toggleStudentStatusMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const newStatus = !studentToToggle?.active;
      const res = await apiRequest('PUT', `/api/students/${studentId}`, {
        active: newStatus
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Erro ao ${newStatus ? 'reativar' : 'desativar'} aluno`);
      }
      return { success: true, active: newStatus };
    },
    onSuccess: (data) => {
      toast({
        title: data.active ? 'Aluno reativado' : 'Aluno desativado',
        description: data.active
          ? 'O aluno foi reativado com sucesso.'
          : 'O aluno foi desativado com sucesso.',
      });
      
      // Atualizar a lista de alunos da classe
      if (selectedClassId) {
        queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClassId, 'students'] });
      }
      
      // Fechar o diálogo
      setIsToggleStudentOpen(false);
      setStudentToToggle(null);
    },
    onError: (error: Error) => {
      toast({
        title: studentToToggle?.active ? 'Erro ao desativar aluno' : 'Erro ao reativar aluno',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Edit class name mutation
  const editClassMutation = useMutation({
    mutationFn: async () => {
      if (!classToEdit) throw new Error("Nenhuma classe selecionada para edição");
      
      const res = await apiRequest('PUT', `/api/classes/${classToEdit.id}`, {
        name: editClassName
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao editar nome da classe");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Classe atualizada',
        description: 'O nome da classe foi atualizado com sucesso',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      setClassToEdit(null);
      setEditClassName('');
      setIsEditClassOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar classe',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Toggle class status mutation
  const toggleClassStatusMutation = useMutation({
    mutationFn: async (classId: number) => {
      const newStatus = !classToToggle?.active;
      const res = await apiRequest('PUT', `/api/classes/${classId}`, {
        active: newStatus
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Erro ao ${newStatus ? 'reativar' : 'desativar'} classe`);
      }
      return { success: true, active: newStatus };
    },
    onSuccess: (data) => {
      toast({
        title: data.active ? 'Classe reativada' : 'Classe desativada',
        description: data.active
          ? 'A classe foi reativada com sucesso.'
          : 'A classe foi desativada com sucesso.',
      });
      
      // Atualizar a lista de classes
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      
      // Atualizar as relações
      if (selectedClassId) {
        queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClassId, 'teachers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClassId, 'students'] });
      }
      
      // Fechar o diálogo
      setIsToggleClassOpen(false);
      setClassToToggle(null);
    },
    onError: (error: Error) => {
      toast({
        title: classToToggle?.active ? 'Erro ao desativar classe' : 'Erro ao reativar classe',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Remove teacher assignment mutation
  const removeTeacherAssignmentMutation = useMutation({
    mutationFn: async ({ teacherId, classId }: { teacherId: number, classId: number }) => {
      const res = await apiRequest('DELETE', `/api/teacher-classes/${teacherId}/${classId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao remover atribuição do professor');
      }
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Atribuição removida',
        description: 'O professor foi removido da classe com sucesso',
      });
      
      // Atualizar a lista de professores da classe
      if (selectedClassId) {
        queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClassId, 'teachers'] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover atribuição',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Toggle teacher status mutation
  const toggleTeacherStatusMutation = useMutation({
    mutationFn: async (teacherId: number) => {
      // Em vez de excluir, vamos atualizar o status para o oposto
      const newStatus = !teacherToToggle?.active;
      const res = await apiRequest('PUT', `/api/teachers/${teacherId}`, { 
        active: newStatus 
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Erro ao ${newStatus ? 'reativar' : 'desativar'} professor`);
      }
      return { success: true, active: newStatus };
    },
    onSuccess: (data) => {
      toast({
        title: data.active ? 'Professor reativado' : 'Professor desativado',
        description: data.active 
          ? 'O professor foi reativado com sucesso.' 
          : 'O professor foi desativado com sucesso.',
      });
      // Atualizar a lista de professores
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      
      // Atualizar a lista de classes, pois professores inativos não devem aparecer nas classes
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      
      // Atualizar as listas de professores por classe
      if (selectedClassId) {
        queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClassId, 'teachers'] });
      }
      
      // Fechar o diálogo
      setIsToggleTeacherOpen(false);
      setTeacherToToggle(null);
    },
    onError: (error: Error) => {
      toast({
        title: teacherToToggle?.active ? 'Erro ao desativar professor' : 'Erro ao reativar professor',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Handle class selection
  const handleClassSelection = (classId: number) => {
    setSelectedClassId(classId);
  };
  
  // Handle class selection for reports
  const handleClassSelectionForReports = (classId: number | null) => {
    setSelectedClassForReports(classId);
  };
  
  // Handle date selection for reports
  const handleDateSelectionForReports = (date: string | null) => {
    setSelectedDateForReports(date);
    // Ao selecionar uma data, limpa o filtro de trimestre
    if (date) {
      setSelectedTrimester(null);
    }
  };
  
  // Função para verificar se uma data está dentro de um trimestre
  const isDateInTrimester = (dateStr: string, trimester: string): boolean => {
    if (!dateStr || !trimester) return false;
    
    const date = new Date(dateStr);
    const month = date.getMonth(); // 0-indexed (0 = Janeiro, 11 = Dezembro)
    const currentYear = new Date().getFullYear();
    
    // Verifica se o ano da data corresponde ao ano atual
    if (date.getFullYear() !== currentYear) return false;
    
    // Verifica se o mês está dentro do trimestre
    switch (trimester) {
      case "1": // 1º Trimestre (Jan-Mar)
        return month >= 0 && month <= 2;
      case "2": // 2º Trimestre (Abr-Jun)
        return month >= 3 && month <= 5;
      case "3": // 3º Trimestre (Jul-Set)
        return month >= 6 && month <= 8;
      case "4": // 4º Trimestre (Out-Dez)
        return month >= 9 && month <= 11;
      default:
        return false;
    }
  };
  
  // Função para gerar dados de presença agrupados por classe para visualização em grid
  const getAttendanceGridData = () => {
    if (!selectedTrimester || !attendanceRecords) return null;
    
    // Usamos um mapa com nome da classe como chave em vez de ID para evitar problemas de tipo
    const classTotals = new Map<string, { 
      className: string, 
      presentCount: number, 
      absentCount: number,
      totalCount: number
    }>();
    
    // Se temos uma classe específica selecionada, apenas inicializamos ela
    if (selectedClassForReports) {
      const classItem = classes.find(c => c.id === selectedClassForReports);
      
      if (classItem) {
        classTotals.set(classItem.name, {
          className: classItem.name,
          presentCount: 0,
          absentCount: 0,
          totalCount: 0
        });
      }
    } else {
      // Caso contrário, inicializamos todas as classes conhecidas
      classes.forEach(classItem => {
        classTotals.set(classItem.name, {
          className: classItem.name,
          presentCount: 0,
          absentCount: 0,
          totalCount: 0
        });
      });
    }
    
    // Processamos todos os registros de presença no período do trimestre
    attendanceRecords
      .filter(record => isDateInTrimester(record.date, selectedTrimester))
      .forEach(record => {
        const className = record.className;
        
        // Se ainda não temos esta classe no mapa (provavelmente porque ela foi adicionada após inicialização),
        // criamos uma entrada para ela agora
        if (!classTotals.has(className)) {
          classTotals.set(className, {
            className,
            presentCount: 0,
            absentCount: 0,
            totalCount: 0
          });
        }
        
        // Atualizamos os totais para esta classe
        const classSummary = classTotals.get(className)!;
        
        if (record.present) {
          classSummary.presentCount += 1;
        } else {
          classSummary.absentCount += 1;
        }
        classSummary.totalCount += 1;
      });
    
    // Convertemos o mapa para um array e filtramos classes sem registros
    const gridData = Array.from(classTotals.values())
      .filter(summary => summary.totalCount > 0);
    
    // Calculamos o total geral para todas as classes
    const totalSummary = {
      className: 'Total Geral',
      presentCount: gridData.reduce((sum, item) => sum + item.presentCount, 0),
      absentCount: gridData.reduce((sum, item) => sum + item.absentCount, 0),
      totalCount: gridData.reduce((sum, item) => sum + item.totalCount, 0)
    };
    
    return {
      classes: gridData,
      totals: totalSummary
    };
  };

  // Handle trimester selection for reports
  const handleTrimesterSelection = (trimester: string | null) => {
    setSelectedTrimester(trimester);
    
    // Ao selecionar um trimestre, limpa o filtro de data específica
    if (trimester) {
      setSelectedDateForReports(null);
      
      // Define as datas do trimestre selecionado
      const currentYear = new Date().getFullYear();
      let startMonth: number, endMonth: number;
      
      switch (trimester) {
        case "1":
          startMonth = 0; // Janeiro (0-indexed)
          endMonth = 2;   // Março
          break;
        case "2":
          startMonth = 3; // Abril
          endMonth = 5;   // Junho
          break;
        case "3":
          startMonth = 6; // Julho
          endMonth = 8;   // Setembro
          break;
        case "4":
          startMonth = 9; // Outubro
          endMonth = 11;  // Dezembro
          break;
        default:
          return;
      }
      
      // Atualiza as consultas com o filtro de trimestre
      const startDate = format(setDate(setMonth(startOfYear(new Date(currentYear, 0)), startMonth), 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(currentYear, endMonth)), 'yyyy-MM-dd');
      
      console.log(`Filtrando por trimestre ${trimester}: ${startDate} até ${endDate}`);
      
      // Como não temos filtro de trimestre no backend, invalidamos as queries para forçar a atualização
      // dos dados. O filtro será aplicado localmente no frontend.
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/missionary-activities'] });
    } else {
      // Se nenhum trimestre foi selecionado, limpa o filtro
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/missionary-activities'] });
    }
  };

  // Handle create class
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      createClassMutation.mutate(newClassName);
    }
  };

  // Handle create student
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentName.trim() && selectedClassId) {
      createStudentMutation.mutate({
        name: newStudentName,
        classId: selectedClassId,
      }, {
        onSuccess: () => {
          setIsAddStudentOpen(false);
        }
      });
    }
  };

  // Handle create teacher
  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeacherData.name && newTeacherData.cpf && newTeacherData.password) {
      createTeacherMutation.mutate(newTeacherData);
    }
  };

  // Handle assign teacher to class
  const handleAssignTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherClassAssignment.teacherId && teacherClassAssignment.classId) {
      assignTeacherMutation.mutate(teacherClassAssignment);
    }
  };

  // Handle toggle teacher status
  const toggleTeacherStatus = (teacher: Teacher) => {
    setTeacherToToggle(teacher);
    setIsToggleTeacherOpen(true);
  };
  
  // Handle toggle class status
  const toggleClassStatus = (classObj: Class) => {
    setClassToToggle(classObj);
    setIsToggleClassOpen(true);
  };
  
  // Handle edit class
  const handleEditClass = (classObj: Class) => {
    setClassToEdit(classObj);
    setEditClassName(classObj.name);
    setIsEditClassOpen(true);
  };
  
  // Handle toggle student status
  const toggleStudentStatus = (student: Student) => {
    setStudentToToggle(student);
    setIsToggleStudentOpen(true);
  };
  
  // Handle edit student
  const handleEditStudent = (student: Student) => {
    setStudentToEdit(student);
    setEditStudentName(student.name);
    setIsEditStudentOpen(true);
  };
  
  // Handle edit teacher
  const handleEditTeacher = (teacher: Teacher) => {
    setEditTeacherData({
      name: teacher.name,
      cpf: teacher.cpf,
      password: '',
      isAdmin: teacher.isAdmin
    });
    // Define o professor para edição (isso abrirá o modal automaticamente)
    setTeacherToEdit(teacher);
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation('/auth');
      },
    });
  };

  // Redirect if not admin or not logged in
  useEffect(() => {
    if (!teacher) {
      setLocation('/auth');
    } else if (!teacher.isAdmin) {
      setLocation('/');
    }
  }, [teacher, setLocation]);

  if (!teacher || !teacher.isAdmin) {
    return null;
  }

  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>Administração</h1>
          <p className="text-xs text-white">Bem-vindo, {teacher.name}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout} 
          className="flex items-center gap-1 bg-white text-gray-600 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          {!isMobile && "Sair"}
        </Button>
      </header>

      <main className="py-4 px-4 max-w-5xl mx-auto">
        <Tabs defaultValue="classes">
          <TabsList className={`mb-4 ${isMobile ? 'w-full' : ''}`}>
            <TabsTrigger value="classes" className={isMobile ? "text-xs" : ""}>
              {isMobile ? <School className="h-4 w-4 mr-1" /> : null}
              Classes
            </TabsTrigger>
            <TabsTrigger value="teachers" className={isMobile ? "text-xs" : ""}>
              {isMobile ? <User className="h-4 w-4 mr-1" /> : null}
              Professores
            </TabsTrigger>
            <TabsTrigger value="reports" className={isMobile ? "text-xs" : ""}>
              {isMobile ? <BarChart className="h-4 w-4 mr-1" /> : null}
              Registros
            </TabsTrigger>
          </TabsList>
          
          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Classes List */}
              <Card>
                <CardHeader>
                  <CardTitle>Classes ({classes.length})</CardTitle>
                  <CardDescription>
                    Selecione uma classe para gerenciar alunos e professores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {classesLoading ? (
                    <div className="text-center py-4">Carregando classes...</div>
                  ) : classes.length === 0 ? (
                    <div className="text-center py-4">Nenhuma classe encontrada</div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {classes.map((classObj) => (
                          <div
                            key={classObj.id}
                            className={`p-3 border rounded-md hover:bg-gray-100 ${
                              selectedClassId === classObj.id ? 'bg-primary-100 border-primary-500' : ''
                            } ${classObj.active ? '' : 'opacity-50'}`}
                          >
                            <div className="flex justify-between items-center">
                              <h3 
                                className="font-medium cursor-pointer" 
                                onClick={() => handleClassSelection(classObj.id)}
                              >
                                {classObj.name}
                              </h3>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  classObj.active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {classObj.active ? 'Ativa' : 'Inativa'}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-6 w-6 text-blue-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClass(classObj);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className={`h-6 w-6 ${classObj.active ? 'text-red-600' : 'text-green-600'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleClassStatus(classObj);
                                  }}
                                >
                                  {classObj.active ? (
                                    <Trash2 className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Adicionar Nova Classe</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Nova Classe</DialogTitle>
                        <DialogDescription>
                          Insira o nome para criar uma nova classe
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateClass}>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="className">Nome da Classe</Label>
                            <Input
                              id="className"
                              value={newClassName}
                              onChange={(e) => setNewClassName(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createClassMutation.isPending}>
                            {createClassMutation.isPending ? 'Adicionando...' : 'Adicionar Classe'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>

              {/* Class Details */}
              {selectedClassId && (
                <div className="space-y-6">
                  {/* Students */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Alunos da Classe ({students.length})</CardTitle>
                      <CardDescription>
                        {classes.find(c => c.id === selectedClassId)?.name || ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {studentsLoading ? (
                        <div className="text-center py-4">Carregando alunos...</div>
                      ) : students.length === 0 ? (
                        <div className="text-center py-4">Nenhum aluno encontrado</div>
                      ) : (
                        <ScrollArea className="h-[200px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-12 text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.map((student) => (
                                <TableRow key={student.id} className={student.active ? "" : "opacity-50"}>
                                  <TableCell>{student.name}</TableCell>
                                  <TableCell>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      student.active 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {student.active ? 'Ativo' : 'Inativo'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-1">
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-8 w-8 text-blue-600"
                                        onClick={() => handleEditStudent(student)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className={`h-8 w-8 ${student.active ? 'text-red-600' : 'text-green-600'}`}
                                        onClick={() => toggleStudentStatus(student)}
                                        disabled={toggleStudentStatusMutation.isPending}
                                      >
                                        {student.active ? (
                                          <Trash2 className="h-4 w-4" />
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                        <DialogTrigger asChild>
                          <Button>Adicionar Novo Aluno</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adicionar Novo Aluno</DialogTitle>
                            <DialogDescription>
                              Insira o nome para adicionar um novo aluno à classe
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleCreateStudent}>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="studentName">Nome do Aluno</Label>
                                <Input
                                  id="studentName"
                                  value={newStudentName}
                                  onChange={(e) => setNewStudentName(e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="submit" disabled={createStudentMutation.isPending}>
                                {createStudentMutation.isPending ? 'Adicionando...' : 'Adicionar Aluno'}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </Card>

                  {/* Teachers */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Professores da Classe ({classTeachers.length})</CardTitle>
                      <CardDescription>Máximo de 2 professores por classe</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {classTeachersLoading ? (
                        <div className="text-center py-4">Carregando professores...</div>
                      ) : classTeachers.length === 0 ? (
                        <div className="text-center py-4">Nenhum professor atribuído</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>CPF</TableHead>
                              <TableHead className="w-12 text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classTeachers.map((teacher) => (
                              <TableRow key={teacher.id}>
                                <TableCell>{teacher.name}</TableCell>
                                <TableCell>{teacher.cpf}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600"
                                    onClick={() => {
                                      if (selectedClassId) {
                                        removeTeacherAssignmentMutation.mutate({
                                          teacherId: teacher.id,
                                          classId: selectedClassId
                                        });
                                      }
                                    }}
                                    title="Remover atribuição"
                                    disabled={removeTeacherAssignmentMutation.isPending}
                                  >
                                    <MinusCircle className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                    <CardFooter>
                      {classTeachers && classTeachers.length < 2 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button>Atribuir Professor</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Atribuir Professor à Classe</DialogTitle>
                              <DialogDescription>
                                Selecione um professor para atribuir a esta classe
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAssignTeacher}>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="teacherId">Professor</Label>
                                  <select
                                    id="teacherId"
                                    className="w-full p-2 border rounded"
                                    value={teacherClassAssignment.teacherId || ''}
                                    onChange={(e) => setTeacherClassAssignment({
                                      ...teacherClassAssignment,
                                      teacherId: Number(e.target.value),
                                      classId: selectedClassId
                                    })}
                                    required
                                  >
                                    <option value="">Selecione um professor</option>
                                    {teachers.map((teacher) => (
                                      <option key={teacher.id} value={teacher.id}>
                                        {teacher.name} - {teacher.cpf}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="submit" disabled={assignTeacherMutation.isPending}>
                                  {assignTeacherMutation.isPending ? 'Atribuindo...' : 'Atribuir Professor'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardFooter>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Professores ({teacherNameFilter 
                    ? teachers.filter(teacher => teacher.name.toLowerCase().includes(teacherNameFilter.toLowerCase())).length 
                    : teachers.length})
                </CardTitle>
                <CardDescription>Lista de todos os professores cadastrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Filtrar por nome..."
                      className="pl-8"
                      value={teacherNameFilter}
                      onChange={(e) => setTeacherNameFilter(e.target.value)}
                    />
                    {teacherNameFilter && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setTeacherNameFilter('')}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
                {teachersLoading ? (
                  <div className="text-center py-4">Carregando professores...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Administrador</TableHead>
                        <TableHead className="w-24 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers
                        .filter(teacher => 
                          teacherNameFilter === '' || 
                          teacher.name.toLowerCase().includes(teacherNameFilter.toLowerCase())
                        )
                        .map((teacher) => (
                        <TableRow key={teacher.id} className={teacher.active ? "" : "opacity-50"}>
                          <TableCell>{teacher.name}</TableCell>
                          <TableCell>{teacher.cpf}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              teacher.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {teacher.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </TableCell>
                          <TableCell>{teacher.isAdmin ? 'Sim' : 'Não'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600"
                                onClick={() => handleEditTeacher(teacher)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className={`h-8 w-8 ${teacher.active ? 'text-red-600' : 'text-green-600'}`}
                                onClick={() => {
                                  toggleTeacherStatus(teacher);
                                }}
                              >
                                {teacher.active ? (
                                  <Trash2 className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Adicionar Novo Professor</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Professor</DialogTitle>
                      <DialogDescription>
                        Preencha os dados para criar um novo professor
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTeacher}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="teacherName">Nome</Label>
                          <Input
                            id="teacherName"
                            value={newTeacherData.name}
                            onChange={(e) => setNewTeacherData({ ...newTeacherData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="teacherCpf">CPF</Label>
                          <Input
                            id="teacherCpf"
                            value={newTeacherData.cpf}
                            onChange={(e) => setNewTeacherData({ ...newTeacherData, cpf: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="teacherPassword">Senha</Label>
                          <Input
                            id="teacherPassword"
                            type="password"
                            value={newTeacherData.password}
                            onChange={(e) => setNewTeacherData({ ...newTeacherData, password: e.target.value })}
                            required
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="teacherIsAdmin"
                            checked={newTeacherData.isAdmin}
                            onCheckedChange={(checked) => setNewTeacherData({ ...newTeacherData, isAdmin: checked })}
                          />
                          <Label htmlFor="teacherIsAdmin">É administrador</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={createTeacherMutation.isPending}>
                          {createTeacherMutation.isPending ? 'Adicionando...' : 'Adicionar Professor'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {/* Filter Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
                <CardDescription>Selecione filtros para os registros de presença e atividades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="classFilter">Filtrar por Classe</Label>
                    <select
                      id="classFilter"
                      className="w-full p-2 border rounded mt-1"
                      value={selectedClassForReports || ''}
                      onChange={(e) => handleClassSelectionForReports(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Todas as Classes</option>
                      {classes.map((classObj) => (
                        <option key={classObj.id} value={classObj.id}>
                          {classObj.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="dateFilter">Filtrar por Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between mt-1 bg-white text-left font-normal"
                          disabled={selectedTrimester !== null}
                        >
                          {selectedDateForReports ? formatBrazilianDate(selectedDateForReports) : "Selecione uma data"}
                          <CalendarIcon className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-52 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar data..." />
                          <CommandEmpty>Nenhuma data encontrada</CommandEmpty>
                          <CommandGroup>
                            <CommandItem 
                              onSelect={() => handleDateSelectionForReports(null)}
                              className="justify-between"
                            >
                              Todas as datas
                              {!selectedDateForReports && <Check className="h-4 w-4" />}
                            </CommandItem>
                            {availableDates.map((date) => (
                              <CommandItem 
                                key={date} 
                                value={date}
                                onSelect={() => handleDateSelectionForReports(date)}
                                className="justify-between"
                              >
                                {formatBrazilianDate(date)}
                                {selectedDateForReports === date && <Check className="h-4 w-4" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="trimesterFilter">Filtrar por Trimestre</Label>
                    <select
                      id="trimesterFilter"
                      className="w-full p-2 border rounded mt-1"
                      value={selectedTrimester || ''}
                      onChange={(e) => handleTrimesterSelection(e.target.value || null)}
                      disabled={selectedDateForReports !== null}
                    >
                      <option value="">Todos os Trimestres</option>
                      <option value="1">1º Trimestre (Janeiro - Março)</option>
                      <option value="2">2º Trimestre (Abril - Junho)</option>
                      <option value="3">3º Trimestre (Julho - Setembro)</option>
                      <option value="4">4º Trimestre (Outubro - Dezembro)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Tabs for Reports */}
            <Card>
              <CardHeader className="pb-0">
                <Tabs 
                  defaultValue="attendance" 
                  className="w-full" 
                  value={reportsTabActive}
                  onValueChange={(value) => setReportsTabActive(value)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="attendance">Registros de Frequência</TabsTrigger>
                    <TabsTrigger value="activities">Atividades Missionárias</TabsTrigger>
                  </TabsList>
                
                  {/* Attendance Records Tab */}
                  <TabsContent value="attendance" className="mt-4">
                    <div className="pb-4">
                      <h3 className="text-lg font-medium">
                        Registros de Frequência ({
                          selectedTrimester
                            ? attendanceRecords.filter(record => isDateInTrimester(record.date, selectedTrimester)).length
                            : attendanceRecords.length
                        })
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
                      <div className="text-center py-4">Carregando registros de frequência...</div>
                    ) : attendanceRecords.length === 0 ? (
                      <div className="text-center py-4">Nenhum registro de frequência encontrado.</div>
                    ) : selectedTrimester ? (
                      // Visualização em grid quando um trimestre está selecionado
                      (() => {
                        const gridData = getAttendanceGridData();
                        
                        if (!gridData || gridData.classes.length === 0) {
                          return (
                            <div className="text-center py-4">
                              Nenhum registro de frequência encontrado para o trimestre selecionado.
                            </div>
                          );
                        }
                        
                        return (
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
                                {gridData.classes.map((classData, index) => (
                                  <TableRow key={`class-${index}-${classData.className}`}>
                                    <TableCell className="font-medium">{classData.className}</TableCell>
                                    <TableCell className="text-center text-green-600 font-medium">{classData.presentCount}</TableCell>
                                    <TableCell className="text-center text-red-600 font-medium">{classData.absentCount}</TableCell>
                                  </TableRow>
                                ))}
                                
                                {/* Linha com totais gerais */}
                                <TableRow className="bg-muted/50 font-bold">
                                  <TableCell className="font-bold">{gridData.totals.className}</TableCell>
                                  <TableCell className="text-center text-green-600 font-bold">{gridData.totals.presentCount}</TableCell>
                                  <TableCell className="text-center text-red-600 font-bold">{gridData.totals.absentCount}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        );
                      })()
                    ) : (
                      // Visualização detalhada quando nenhum trimestre está selecionado
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Aluno</TableHead>
                              <TableHead>Classe</TableHead>
                              <TableHead>Presença</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendanceRecords.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>{formatBrazilianDate(record.date)}</TableCell>
                                <TableCell>{record.studentName}</TableCell>
                                <TableCell>
                                  {record.className || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {record.present ? (
                                    <span className="text-green-600 font-medium">Presente</span>
                                  ) : (
                                    <span className="text-red-600 font-medium">Ausente</span>
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
                  <TabsContent value="activities" className="mt-4">
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
                      (() => {
                        const gridData = getActivitiesGridData();
                        
                        if (!gridData || gridData.classes.length === 0) {
                          return (
                            <div className="text-center py-4">
                              Nenhum registro de atividade missionária encontrado para o trimestre selecionado.
                            </div>
                          );
                        }
                        
                        return (
                          <div className="overflow-auto" style={{ maxHeight: '400px' }}>
                            <div className="min-w-max">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="sticky left-0 bg-white z-10">Atividade Missionária</TableHead>
                                    {gridData.classes.map(classData => (
                                      <TableHead key={`class-header-${classData.id}`} className="text-center">
                                        {classData.name}
                                      </TableHead>
                                    ))}
                                    <TableHead className="text-center bg-muted/50 font-bold">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {gridData.activityTypes.map(activityType => (
                                    <TableRow key={`activity-${activityType.id}`}>
                                      <TableCell className="font-medium sticky left-0 bg-white z-10">
                                        {activityType.name}
                                      </TableCell>
                                      {gridData.classes.map(classData => (
                                        <TableCell 
                                          key={`value-${classData.id}-${activityType.id}`} 
                                          className="text-center"
                                        >
                                          {classData[activityType.id] || 0}
                                        </TableCell>
                                      ))}
                                      <TableCell className="text-center bg-muted/50 font-bold">
                                        {gridData.totals[activityType.id] || 0}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        );
                      })()
                    
                    ) : (
                      /* Visualização normal quando não filtrado por trimestre */
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Classe</TableHead>
                              <TableHead>Atividade</TableHead>
                              <TableHead>Quantidade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {missionaryActivities
                              .flatMap((activity) => {
                              const activityEntries = [];
                              
                              // Sempre mostrar contatos missionários, mesmo com valor 0 ou null
                              activityEntries.push(
                                <TableRow key={`${activity.id}-contatos`}>
                                  <TableCell>{formatBrazilianDate(activity.date)}</TableCell>
                                  <TableCell>{activity.className}</TableCell>
                                  <TableCell>Contatos Missionários</TableCell>
                                  <TableCell>{activity.qtdContatosMissionarios ?? 0}</TableCell>
                                </TableRow>
                              );
                              
                              // Sempre mostrar literaturas distribuídas, mesmo com valor 0 ou null
                              activityEntries.push(
                                <TableRow key={`${activity.id}-literaturas`}>
                                  <TableCell>{formatBrazilianDate(activity.date)}</TableCell>
                                  <TableCell>{activity.className}</TableCell>
                                  <TableCell>Literaturas Distribuídas</TableCell>
                                  <TableCell>{activity.literaturasDistribuidas ?? 0}</TableCell>
                                </TableRow>
                              );
                              
                              // Sempre mostrar visitas missionárias, mesmo com valor 0 ou null
                              activityEntries.push(
                                <TableRow key={`${activity.id}-visitas`}>
                                  <TableCell>{formatBrazilianDate(activity.date)}</TableCell>
                                  <TableCell>{activity.className}</TableCell>
                                  <TableCell>Visitas Missionárias</TableCell>
                                  <TableCell>{activity.visitasMissionarias ?? 0}</TableCell>
                                </TableRow>
                              );
                              
                              // Combinar "Estudos Bíblicos" e "Ministrados" em uma única linha
                              activityEntries.push(
                                <TableRow key={`${activity.id}-estudos-ministrados`}>
                                  <TableCell>{formatBrazilianDate(activity.date)}</TableCell>
                                  <TableCell>{activity.className}</TableCell>
                                  <TableCell>Estudos Bíblicos Ministrados</TableCell>
                                  <TableCell>{(activity.estudosBiblicos ?? 0) + (activity.ministrados ?? 0)}</TableCell>
                                </TableRow>
                              );
                              
                              // Sempre mostrar pessoas auxiliadas, mesmo com valor 0 ou null
                              activityEntries.push(
                                <TableRow key={`${activity.id}-auxiliadas`}>
                                  <TableCell>{formatBrazilianDate(activity.date)}</TableCell>
                                  <TableCell>{activity.className}</TableCell>
                                  <TableCell>Pessoas Auxiliadas</TableCell>
                                  <TableCell>{activity.pessoasAuxiliadas ?? 0}</TableCell>
                                </TableRow>
                              );
                              
                              // Sempre mostrar pessoas trazidas à igreja, mesmo com valor 0 ou null
                              activityEntries.push(
                                <TableRow key={`${activity.id}-trazidas`}>
                                  <TableCell>{formatBrazilianDate(activity.date)}</TableCell>
                                  <TableCell>{activity.className}</TableCell>
                                  <TableCell>Pessoas Trazidas à Igreja</TableCell>
                                  <TableCell>{activity.pessoasTrazidasIgreja ?? 0}</TableCell>
                                </TableRow>
                              );
                              
                              return activityEntries;
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Dialog de edição de classe */}
      <Dialog open={isEditClassOpen} onOpenChange={setIsEditClassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nome da Classe</DialogTitle>
            <DialogDescription>
              Insira o novo nome para a classe
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            editClassMutation.mutate();
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editClassName">Nome da Classe</Label>
                <Input
                  id="editClassName"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={editClassMutation.isPending}>
                {editClassMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Alert Dialog for toggle teacher status */}
      <AlertDialog open={isToggleTeacherOpen} onOpenChange={setIsToggleTeacherOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {teacherToToggle?.active ? 'Desativar Professor' : 'Reativar Professor'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {teacherToToggle?.active 
                ? `Tem certeza que deseja desativar o professor "${teacherToToggle?.name}"? Esse professor não poderá fazer login no sistema enquanto estiver desativado.`
                : `Tem certeza que deseja reativar o professor "${teacherToToggle?.name}"? Esse professor poderá fazer login no sistema novamente.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (teacherToToggle) {
                  toggleTeacherStatusMutation.mutate(teacherToToggle.id);
                }
              }}
              className={teacherToToggle?.active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {toggleTeacherStatusMutation.isPending 
                ? 'Processando...' 
                : teacherToToggle?.active 
                  ? 'Sim, desativar' 
                  : 'Sim, reativar'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialog de edição de professor */}
      <Dialog open={!!teacherToEdit} onOpenChange={(open) => {
        if (!open) setTeacherToEdit(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Professor</DialogTitle>
            <DialogDescription>
              Atualize os dados do professor
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            editTeacherMutation.mutate();
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editTeacherName">Nome</Label>
                <Input
                  id="editTeacherName"
                  value={editTeacherData.name}
                  onChange={(e) => setEditTeacherData({ ...editTeacherData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTeacherCpf">CPF</Label>
                <Input
                  id="editTeacherCpf"
                  value={editTeacherData.cpf}
                  onChange={(e) => setEditTeacherData({ ...editTeacherData, cpf: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTeacherPassword">Nova Senha (deixe em branco para manter a atual)</Label>
                <Input
                  id="editTeacherPassword"
                  type="password"
                  value={editTeacherData.password}
                  onChange={(e) => setEditTeacherData({ ...editTeacherData, password: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editTeacherIsAdmin"
                  checked={editTeacherData.isAdmin}
                  onCheckedChange={(checked) => setEditTeacherData({ ...editTeacherData, isAdmin: checked })}
                />
                <Label htmlFor="editTeacherIsAdmin">É administrador</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={editTeacherMutation.isPending}>
                {editTeacherMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Confirmação de ativação/desativação de classe */}
      <AlertDialog open={isToggleClassOpen} onOpenChange={setIsToggleClassOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {classToToggle?.active 
                ? 'Desativar Classe' 
                : 'Reativar Classe'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {classToToggle?.active 
                ? `Tem certeza que deseja desativar a classe "${classToToggle?.name}"? Esta classe não aparecerá no perfil dos professores enquanto estiver desativada.` 
                : `Tem certeza que deseja reativar a classe "${classToToggle?.name}"? Esta classe voltará a aparecer no perfil dos professores.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (classToToggle) {
                  toggleClassStatusMutation.mutate(classToToggle.id);
                }
              }}
              className={classToToggle?.active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {toggleClassStatusMutation.isPending 
                ? 'Processando...' 
                : classToToggle?.active 
                  ? 'Sim, desativar' 
                  : 'Sim, reativar'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de ativação/desativação de aluno */}
      <AlertDialog open={isToggleStudentOpen} onOpenChange={setIsToggleStudentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {studentToToggle?.active 
                ? 'Desativar Aluno' 
                : 'Reativar Aluno'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {studentToToggle?.active 
                ? `Tem certeza que deseja desativar o aluno "${studentToToggle?.name}"? Este aluno não aparecerá nas listas de presença enquanto estiver desativado.` 
                : `Tem certeza que deseja reativar o aluno "${studentToToggle?.name}"? Este aluno voltará a aparecer nas listas de presença.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (studentToToggle) {
                  toggleStudentStatusMutation.mutate(studentToToggle.id);
                }
              }}
              className={studentToToggle?.active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {toggleStudentStatusMutation.isPending 
                ? 'Processando...' 
                : studentToToggle?.active 
                  ? 'Sim, desativar' 
                  : 'Sim, reativar'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de edição de aluno */}
      <Dialog open={isEditStudentOpen} onOpenChange={setIsEditStudentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>
              Altere o nome do aluno
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            editStudentMutation.mutate();
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editStudentName">Nome do Aluno</Label>
                <Input
                  id="editStudentName"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button"
                onClick={() => setIsEditStudentOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={editStudentMutation.isPending}
              >
                {editStudentMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHome;