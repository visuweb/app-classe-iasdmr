import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { adjustDateToBRT, formatBrazilianDate, formatBrazilianDateExtended, getCurrentDateBRT, extractDateFromRecord } from "@/lib/date-utils";
import { AttendanceRecord, MissionaryActivity, Class } from "@shared/schema";
import {
  Calendar,
  ArrowLeft,
  FileText,
  Users,
  Check,
  X,
  Filter,
  Edit,
  PenSquare,
  Pencil,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";

type AttendanceRecordWithStudent = AttendanceRecord & {
  studentName: string;
  classId?: number;
  active?: boolean;
};
type MissionaryActivityWithClass = MissionaryActivity & { className: string };

const TeacherRecords: React.FC = () => {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/teacher-records/:classId?");
  const { teacher } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Estado para a data selecionada - inicializado como null (sem data selecionada por padrão)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Classe selecionada - garantir que o ID da classe seja um número válido
  const [selectedClassId, setSelectedClassId] = useState<number | null>(() => {
    if (params?.classId) {
      const parsedId = parseInt(params.classId, 10);
      return isNaN(parsedId) ? null : parsedId;
    }
    return null;
  });

  // Força uma única atualização quando a classe muda
  useEffect(() => {
    if (selectedClassId) {
      console.log("TeacherRecords - Atualizando dados para a classe:", selectedClassId);
      
      // Usar setTimeout para evitar problemas de concorrência
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/attendance", {classId: selectedClassId}],
          refetchType: "all" 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["/api/missionary-activities", {classId: selectedClassId}],
          refetchType: "all"
        });
      }, 0);
    }
  }, [selectedClassId]);

  // Estados para os modais de edição
  const [isEditAttendanceOpen, setIsEditAttendanceOpen] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] =
    useState<AttendanceRecordWithStudent | null>(null);

  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<MissionaryActivityWithClass | null>(null);
  const [selectedActivityField, setSelectedActivityField] = useState<
    string | null
  >(null);
  const [editActivityValue, setEditActivityValue] = useState<number>(0);

  // Mutação para atualizar registro de presença
  const attendanceMutation = useMutation({
    mutationFn: async (data: { id: number; present: boolean }) => {
      const res = await apiRequest("PATCH", `/api/attendance/${data.id}`, {
        present: data.present,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Registro atualizado",
        description: "O status de presença foi atualizado com sucesso",
      });
      setIsEditAttendanceOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar atividade missionária
  const activityMutation = useMutation({
    mutationFn: async (data: { id: number; field: string; value: number }) => {
      const updateData = { [data.field]: data.value };
      const res = await apiRequest(
        "PATCH",
        `/api/missionary-activities/${data.id}`,
        updateData,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/missionary-activities"],
      });
      toast({
        title: "Atividade atualizada",
        description: "O valor da atividade foi atualizado com sucesso",
      });
      setIsEditActivityOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar atividade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para abrir o modal de edição de presença
  const handleEditAttendance = (record: AttendanceRecordWithStudent) => {
    setSelectedAttendanceRecord(record);
    setIsEditAttendanceOpen(true);
  };

  // Função para atualizar o status de presença
  const handleAttendanceUpdate = (present: boolean) => {
    if (selectedAttendanceRecord) {
      attendanceMutation.mutate({
        id: selectedAttendanceRecord.id,
        present,
      });
    }
  };

  // Função para abrir o modal de edição de atividade missionária
  const handleEditActivity = (
    activity: MissionaryActivityWithClass,
    field: string,
  ) => {
    setSelectedActivity(activity);
    setSelectedActivityField(field);

    // Definir o valor atual para edição
    const currentValue =
      (activity[field as keyof MissionaryActivityWithClass] as number) || 0;
    setEditActivityValue(currentValue);

    setIsEditActivityOpen(true);
  };

  // Função para atualizar o valor da atividade missionária
  const handleActivityUpdate = () => {
    if (selectedActivity && selectedActivityField) {
      activityMutation.mutate({
        id: selectedActivity.id,
        field: selectedActivityField,
        value: editActivityValue,
      });
    }
  };

  // Carregar classes do professor
  const { data: teacherClasses = [], isLoading: isLoadingClasses } = useQuery<
    (Class & { role?: string })[]
  >({
    queryKey: ["/api/teacher/classes"],
  });

  // IDs das classes do professor
  const teacherClassIds = teacherClasses.map((cls) => cls.id);

  // Carregar registros de presença - enviar classId como parâmetro de consulta
  const { data: allAttendanceRecords = [], isLoading: attendanceLoading, refetch: refetchAttendance } =
    useQuery<AttendanceRecordWithStudent[]>({
      queryKey: ["/api/attendance", selectedClassId ? { classId: selectedClassId } : null],
      queryFn: async ({ queryKey }) => {
        const [endpoint, params] = queryKey;
        if (params && params !== null && typeof params === 'object' && 'classId' in params) {
          const response = await apiRequest('GET', `${endpoint}?classId=${params.classId}`);
          return response.json();
        }
        const response = await apiRequest('GET', endpoint as string);
        return response.json();
      },
      enabled: !!selectedClassId, // Só carregar quando tiver uma classe selecionada
      staleTime: 0, // Considerar os dados obsoletos imediatamente
      gcTime: 0, // Não manter cache
      refetchOnMount: true, // Recarregar sempre que o componente for montado
      refetchOnWindowFocus: true, // Recarregar quando a janela receber foco
    });

  // Encontrar a classe selecionada
  const selectedClass = teacherClasses.find(cls => cls.id === selectedClassId);
  
  // Filtrar registros apenas das classes do professor e apenas da classe selecionada se houver uma
  const teacherAttendanceRecords = allAttendanceRecords.filter((record) => {
    if (record.classId) {
      // Se temos uma classe selecionada, filtrar apenas para aquela classe
      if (selectedClassId) {
        return record.classId === selectedClassId;
      }
      // Caso contrário, mostrar todas as classes do professor
      return teacherClassIds.includes(record.classId);
    }
    return true; // Se não tivermos classId, assumimos que o professor tem acesso
  });

  // Usando a função utilitária para corrigir o problema do fuso horário
  // adjustDateToBRT importado de @/lib/date-utils

  // Extrair datas únicas por classe
  // 1. Para os registros de frequência, vamos filtrar apenas datas que pertencem à classe selecionada
  const uniqueDatesArray = teacherAttendanceRecords
    .filter(record => {
      // Incluir apenas registros de frequência da classe selecionada
      return selectedClassId ? record.classId === selectedClassId : true;
    })
    .map((record) => extractDateFromRecord(record.recordDate, record.date));
    
  const uniqueDatesSet = new Set(uniqueDatesArray);
  const uniqueDates = Array.from(uniqueDatesSet).sort().reverse(); // Mais recentes primeiro

  // Carregar atividades missionárias - enviar classId como parâmetro de consulta
  const { data: allMissionaryActivities = [], isLoading: activitiesLoading, refetch: refetchActivities } =
    useQuery<MissionaryActivityWithClass[]>({
      queryKey: ["/api/missionary-activities", selectedClassId ? { classId: selectedClassId } : null],
      queryFn: async ({ queryKey }) => {
        const [endpoint, params] = queryKey;
        if (params && params !== null && typeof params === 'object' && 'classId' in params) {
          const response = await apiRequest('GET', `${endpoint}?classId=${params.classId}`);
          return response.json();
        }
        const response = await apiRequest('GET', endpoint as string);
        return response.json();
      },
      enabled: !!selectedClassId, // Só carregar quando tiver uma classe selecionada
      staleTime: 0, // Considerar os dados obsoletos imediatamente
      gcTime: 0, // Não manter cache
      refetchOnMount: true, // Recarregar sempre que o componente for montado
      refetchOnWindowFocus: true, // Recarregar quando a janela receber foco
    });

  // Filtrar atividades apenas das classes do professor e apenas da classe selecionada se houver uma
  const teacherMissionaryActivities = allMissionaryActivities.filter(
    (activity) => {
      // Se temos uma classe selecionada, filtrar apenas para aquela classe
      if (selectedClassId) {
        return activity.classId === selectedClassId;
      }
      // Caso contrário, mostrar todas as classes do professor
      return teacherClassIds.includes(activity.classId);
    },
  );

  // 2. Para as atividades missionárias, vamos filtrar apenas datas que pertencem à classe selecionada
  const uniqueActivityDatesArray = teacherMissionaryActivities
    .filter(activity => {
      // Incluir apenas atividades da classe selecionada
      return selectedClassId ? activity.classId === selectedClassId : true;
    })
    .map((activity) => extractDateFromRecord(activity.recordDate, activity.date));
    
  const uniqueActivityDatesSet = new Set(uniqueActivityDatesArray);
  const uniqueActivityDates = Array.from(uniqueActivityDatesSet)
    .sort()
    .reverse(); // Mais recentes primeiro

  // Combinar todas as datas únicas para o dropdown
  const todayDate = getCurrentDateBRT();
  
  // Unir as datas filtradas de frequência e atividades
  const allUniqueDatesArray = [...uniqueDatesArray, ...uniqueActivityDatesArray];
  
  // Remover duplicatas e ordenar (mais recentes primeiro)
  const allUniqueDatesSet = new Set(allUniqueDatesArray);
  const allUniqueDates = Array.from(allUniqueDatesSet).sort().reverse();
  
  // Logs detalhados para debug
  console.log("selectedClassId:", selectedClassId);
  console.log("teacherClassIds:", teacherClassIds);
  console.log("uniqueDatesArray:", uniqueDatesArray);
  console.log("uniqueActivityDatesArray:", uniqueActivityDatesArray);
  console.log("allUniqueDates:", allUniqueDates);
  
  // Selecionar a data mais recente como padrão (se houver registros)
  useEffect(() => {
    if (!selectedDate && allUniqueDates.length > 0) {
      // allUniqueDates já está ordenado com as datas mais recentes primeiro
      setSelectedDate(allUniqueDates[0]);
    }
  }, [allUniqueDates, selectedDate]);

  // Filtrar registros pela data selecionada
  const attendanceRecords = selectedDate
    ? teacherAttendanceRecords.filter((record) => {
        const recordDateStr = extractDateFromRecord(record.recordDate, record.date);
        return recordDateStr === selectedDate;
      })
    : [];

  // Filtrar atividades pela data selecionada
  const missionaryActivities = selectedDate
    ? teacherMissionaryActivities.filter((activity) => {
        // Usar a função auxiliar para extrair a data do recordDate de forma segura
        const recordDateStr = extractDateFromRecord(activity.recordDate, activity.date);
        return recordDateStr === selectedDate;
      })
    : [];
  
  // Não precisamos mais agrupar atividades por classe/trimestre

  // Função para formatar data usando nosso utilitário centralizado
  const formatDate = (dateStr: string) => {
    return formatBrazilianDate(dateStr, "dd/MM/yyyy");
  };

  // Formatar data selecionada para exibição
  const formattedSelectedDate = selectedDate
    ? formatBrazilianDateExtended(selectedDate)
    : "Selecione uma data";

  // Estado para rastrear se já fizemos um recarregamento nesta sessão
  const [didInitialLoad, setDidInitialLoad] = useState(false);

  // Forçar recarregamento de dados quando o componente é montado, mas apenas uma vez por sessão
  useEffect(() => {
    // Verificar se já fizemos um recarregamento nesta sessão
    if (didInitialLoad) return;

    // Abordagem mais controlada para evitar loops infinitos
    const loadFreshData = async () => {
      console.log('TeacherRecords - Carregando dados iniciais');
      
      // Invalidar queries específicas sem limpar o cache inteiro
      if (selectedClassId) {
        console.log('TeacherRecords - Atualizando dados para a classe:', selectedClassId);
        try {
          await queryClient.invalidateQueries({ 
            queryKey: ['/api/attendance', {classId: selectedClassId}] 
          });
          await queryClient.invalidateQueries({ 
            queryKey: ['/api/missionary-activities', {classId: selectedClassId}] 
          });
          
          // Executar refetch apenas se necessário
          if (refetchAttendance) await refetchAttendance();
          if (refetchActivities) await refetchActivities();
        } catch (error) {
          console.error('Erro ao atualizar dados:', error);
        }
      }

      // Marcar que já fizemos o carregamento inicial
      setDidInitialLoad(true);
    };
    
    loadFreshData();
  }, [selectedClassId, didInitialLoad, refetchAttendance, refetchActivities]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 p-4">
        {/* Cabeçalho */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            className="mr-2 p-2"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <h1
              className={`${isMobile ? "text-xl" : "text-2xl"} font-bold flex items-center`}
            >
              <FileText className="h-6 w-6 mr-2 text-primary-500" />
              Registros {selectedClass && ` : ${selectedClass.name}`}
            </h1>
            <div className="text-sm text-gray-500">
              Visualize os registros de presença e atividades
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="attendance">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger 
                value="attendance" 
                className="flex items-center"
              >
                <Users className="h-4 w-4 mr-2" />
                Frequência
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Atividades Missionárias
              </TabsTrigger>
            </TabsList>

            {/* Aba de Frequência */}
            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    Registros de Frequência
                  </CardTitle>
                  <CardDescription>
                    Presença dos alunos nas aulas - {formattedSelectedDate}
                  </CardDescription>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="min-w-[220px] flex justify-between items-center text-left"
                            disabled={allUniqueDates.length === 0}
                          >
                            <div className="flex items-center truncate">
                              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate">
                                {selectedDate 
                                  ? formatBrazilianDateExtended(selectedDate)
                                  : "Selecione uma data"}
                              </span>
                            </div>
                            <Filter className="h-4 w-4 ml-2 flex-shrink-0" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="max-h-[300px] overflow-auto"
                        >
                          {allUniqueDates.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              Nenhum registro encontrado
                            </div>
                          ) : (
                            allUniqueDates.map((date) => (
                              <DropdownMenuItem
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                className="flex justify-between items-center"
                              >
                                {formatBrazilianDate(date)}
                                {date === selectedDate && (
                                  <Check className="h-4 w-4 text-primary-500" />
                                )}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {!selectedClassId && allUniqueDates.length > 0 && selectedDate && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="px-3 ml-2"
                          onClick={() => setSelectedDate(null)}
                        >
                          <X className="h-3.5 w-3.5 mr-1.5" />
                          Limpar filtro
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {attendanceRecords.length > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-green-600 flex items-center mt-2">
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Presentes (
                        {attendanceRecords.filter((record) => record.present).length}
                        )
                      </span>
                      <span className="text-sm text-red-600 flex items-center mt-2">
                        <X className="h-3.5 w-3.5 mr-1" />
                        Ausentes (
                        {attendanceRecords.filter((record) => !record.present).length}
                        )
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {attendanceLoading || isLoadingClasses ? (
                    // Estado de loading
                    <div className="space-y-3">
                      {Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center py-2"
                          >
                            <Skeleton className="h-5 w-1/3" />
                            <Skeleton className="h-5 w-1/5" />
                            <Skeleton className="h-5 w-1/6" />
                          </div>
                        ))}
                    </div>
                  ) : attendanceRecords.length === 0 ? (
                    // Sem registros
                    <div className="text-center py-10 text-gray-500">
                      <div className="mb-3 flex justify-center">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                      <h3 className="font-medium mb-1">
                        Nenhum registro encontrado
                      </h3>
                      <p className="text-sm">
                        {uniqueDates.length === 0
                          ? "Você não tem registros de frequência"
                          : selectedDate 
                            ? "Não há registros de frequência para a data selecionada"
                            : "Selecione uma data para visualizar registros"
                        }
                      </p>
                    </div>
                  ) : (
                    // Tabela de registros
                    <div className="rounded border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Aluno</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                {record.studentName}
                              </TableCell>
                              <TableCell>
                                {record.present ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <Check className="h-3 w-3 mr-1" />
                                    Presente
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <X className="h-3 w-3 mr-1" />
                                    Ausente
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600"
                                  onClick={() => handleEditAttendance(record)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Atividades Missionárias */}
            <TabsContent value="activities">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    Atividades Missionárias
                  </CardTitle>
                  <CardDescription>
                    Registros de atividades realizadas - {formattedSelectedDate}
                  </CardDescription>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="min-w-[220px] flex justify-between items-center text-left"
                            disabled={allUniqueDates.length === 0}
                          >
                            <div className="flex items-center truncate">
                              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate">
                                {selectedDate 
                                  ? formatBrazilianDateExtended(selectedDate)
                                  : "Selecione uma data"}
                              </span>
                            </div>
                            <Filter className="h-4 w-4 ml-2 flex-shrink-0" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="max-h-[300px] overflow-auto"
                        >
                          {allUniqueDates.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              Nenhum registro encontrado
                            </div>
                          ) : (
                            allUniqueDates.map((date) => (
                              <DropdownMenuItem
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                className="flex justify-between items-center"
                              >
                                {formatBrazilianDate(date)}
                                {date === selectedDate && (
                                  <Check className="h-4 w-4 text-primary-500" />
                                )}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {!selectedClassId && allUniqueDates.length > 0 && selectedDate && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="px-3 ml-2"
                          onClick={() => setSelectedDate(null)}
                        >
                          <X className="h-3.5 w-3.5 mr-1.5" />
                          Limpar filtro
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {activitiesLoading || isLoadingClasses ? (
                    // Loading State
                    <div className="space-y-3">
                      {Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center py-2"
                          >
                            <Skeleton className="h-5 w-1/4" />
                            <Skeleton className="h-5 w-1/5" />
                            <Skeleton className="h-5 w-1/6" />
                          </div>
                        ))}
                    </div>
                  ) : missionaryActivities.length === 0 ? (
                    // No Activities
                    <div className="text-center py-10 text-gray-500">
                      <div className="mb-3 flex justify-center">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                      <h3 className="font-medium mb-1">
                        Nenhum registro encontrado
                      </h3>
                      <p className="text-sm">
                        {uniqueActivityDates.length === 0
                          ? "Você não tem registros de atividades missionárias" 
                          : selectedDate 
                            ? "Não há registros de atividades para a data selecionada"
                            : "Selecione uma data para visualizar registros"
                        }
                      </p>
                    </div>
                  ) : (
                    // Activities Table
                    <div className="rounded border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Atividade Missionária</TableHead>
                            <TableHead className="text-right">Quantidade</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {missionaryActivities.map((activity) => {
                            // Sempre exibir todas as atividades, mesmo com valor 0 ou null
                            const activityKey = `activity-${activity.id}`;
                            return (
                              <React.Fragment key={activityKey}>
                                {/* Literaturas Distribuídas */}
                                <TableRow key={`${activity.id}-literaturas`}>
                                  <TableCell className="font-medium">
                                    Literaturas Distribuídas
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {activity.literaturasDistribuidas ?? 0}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600"
                                      onClick={() => handleEditActivity(activity, "literaturasDistribuidas")}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                
                                {/* Contatos Missionários */}
                                <TableRow key={`${activity.id}-contatos`}>
                                  <TableCell className="font-medium">
                                    Contatos Missionários
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {activity.qtdContatosMissionarios ?? 0}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600"
                                      onClick={() => handleEditActivity(activity, "qtdContatosMissionarios")}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                
                                {/* Estudos Bíblicos */}
                                <TableRow key={`${activity.id}-estudos`}>
                                  <TableCell className="font-medium">
                                    Estudos Bíblicos Ministrados
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {(activity.estudosBiblicos ?? 0) + (activity.ministrados ?? 0)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600"
                                      onClick={() => handleEditActivity(activity, "estudosBiblicos")}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                
                                {/* Visitas Missionárias */}
                                <TableRow key={`${activity.id}-visitas`}>
                                  <TableCell className="font-medium">
                                    Visitas Missionárias
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {activity.visitasMissionarias ?? 0}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600"
                                      onClick={() => handleEditActivity(activity, "visitasMissionarias")}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                
                                {/* Pessoas Auxiliadas */}
                                <TableRow key={`${activity.id}-auxiliadas`}>
                                  <TableCell className="font-medium">
                                    Pessoas Auxiliadas
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {activity.pessoasAuxiliadas ?? 0}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600"
                                      onClick={() => handleEditActivity(activity, "pessoasAuxiliadas")}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                
                                {/* Pessoas Trazidas à Igreja */}
                                <TableRow key={`${activity.id}-trazidas`}>
                                  <TableCell className="font-medium">
                                    Pessoas Trazidas à Igreja
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {activity.pessoasTrazidasIgreja ?? 0}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600"
                                      onClick={() => handleEditActivity(activity, "pessoasTrazidasIgreja")}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Modais de edição */}
      {/* Modal de edição de presença */}
      <Dialog open={isEditAttendanceOpen} onOpenChange={setIsEditAttendanceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Presença</DialogTitle>
            <DialogDescription>
              {selectedAttendanceRecord && (
                <span>Alterar presença de {selectedAttendanceRecord.studentName}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex w-full justify-between">
                <Button
                  onClick={() => handleAttendanceUpdate(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 mr-2"
                  variant="default"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Presente
                </Button>
                <Button
                  onClick={() => handleAttendanceUpdate(false)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  variant="default"
                >
                  <X className="mr-2 h-4 w-4" />
                  Ausente
                </Button>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* Modal de edição de atividade missionária */}
      <Dialog open={isEditActivityOpen} onOpenChange={setIsEditActivityOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Atividade Missionária</DialogTitle>
            <DialogDescription>
              {selectedActivityField && (
                <span>
                  Editar {
                    selectedActivityField === "literaturasDistribuidas" ? "Literaturas Distribuídas" :
                    selectedActivityField === "qtdContatosMissionarios" ? "Contatos Missionários" :
                    selectedActivityField === "estudosBiblicos" ? "Estudos Bíblicos" :
                    selectedActivityField === "visitasMissionarias" ? "Visitas Missionárias" :
                    selectedActivityField === "pessoasAuxiliadas" ? "Pessoas Auxiliadas" :
                    selectedActivityField === "pessoasTrazidasIgreja" ? "Pessoas Trazidas à Igreja" :
                    "Atividade"
                  }
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="activityValue" className="text-sm font-medium">
                Quantidade
              </label>
              <input
                id="activityValue"
                type="number"
                min="0"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={editActivityValue}
                onChange={(e) => setEditActivityValue(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditActivityOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleActivityUpdate}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherRecords;