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

type AttendanceRecordWithStudent = AttendanceRecord & {
  studentName: string;
  classId?: number;
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
  
  // Classe selecionada
  const [selectedClassId, setSelectedClassId] = useState<number | null>(
    params?.classId ? parseInt(params.classId, 10) : null
  );

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

  // Carregar registros de presença
  const { data: allAttendanceRecords = [], isLoading: attendanceLoading } =
    useQuery<AttendanceRecordWithStudent[]>({
      queryKey: ["/api/attendance"],
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

  // Extrair datas únicas dos registros de presença usando recordDate
  const uniqueDatesArray = teacherAttendanceRecords.map((record) =>
    extractDateFromRecord(record.recordDate, record.date)
  );
  const uniqueDatesSet = new Set(uniqueDatesArray);
  const uniqueDates = Array.from(uniqueDatesSet).sort().reverse(); // Mais recentes primeiro

  // Carregar atividades missionárias
  const { data: allMissionaryActivities = [], isLoading: activitiesLoading } =
    useQuery<MissionaryActivityWithClass[]>({
      queryKey: ["/api/missionary-activities"]
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

  // Extrair datas únicas das atividades usando recordDate ao invés de date
  const uniqueActivityDatesArray = teacherMissionaryActivities.map((activity) => {
    // Usar a função auxiliar para extrair a data do recordDate de forma segura
    return extractDateFromRecord(activity.recordDate, activity.date);
  });
  const uniqueActivityDatesSet = new Set(uniqueActivityDatesArray);
  const uniqueActivityDates = Array.from(uniqueActivityDatesSet)
    .sort()
    .reverse(); // Mais recentes primeiro

  // Combinar todas as datas únicas para o dropdown
  // Usar apenas as datas que realmente têm registros
  const todayDate = getCurrentDateBRT();
  const allUniqueDatesArray = [
    ...uniqueDatesArray,
    ...uniqueActivityDatesArray,
  ];
  const allUniqueDatesSet = new Set(allUniqueDatesArray);
  const allUniqueDates = Array.from(allUniqueDatesSet).sort().reverse();
  
  // Log das datas únicas para debug
  console.log("Datas com registros da classe:", allUniqueDates);
  
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
              Registros {selectedClass && ` → ${selectedClass.name}`}
            </h1>
            <div className="text-sm text-gray-500">
              Visualize os registros de presença e atividades
            </div>
          </div>
        </div>

        {/* Filtro por Data */}
        <div className="flex justify-between items-start gap-4 mb-6">
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
          </div>
          
          {allUniqueDates.length > 0 && selectedDate && (
            <Button 
              variant="outline" 
              size="sm"
              className="px-3"
              onClick={() => setSelectedDate(null)}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Limpar filtro
            </Button>
          )}
        </div>

        {/* Conteúdo principal */}
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="attendance">
            <TabsList className="mb-4">
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
                  {attendanceRecords.length > 0 && (
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-green-600 flex items-center">
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Presentes (
                        {
                          attendanceRecords.filter((record) => record.present)
                            .length
                        }
                        )
                      </span>
                      <span className="text-sm text-red-600 flex items-center">
                        <X className="h-3.5 w-3.5 mr-1" />
                        Ausentes (
                        {
                          attendanceRecords.filter((record) => !record.present)
                            .length
                        }
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
                            <TableHead>Presença</TableHead>
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

      {/* Modal de edição de presença */}
      <Dialog
        open={isEditAttendanceOpen}
        onOpenChange={setIsEditAttendanceOpen}
      >
        <DialogContent className="w-[500px] max-w-full">
          <DialogHeader>
            <DialogTitle>Editar Registro de Presença</DialogTitle>
          </DialogHeader>

          {selectedAttendanceRecord && (
            <div className="py-4">
              <div className="mb-4">
                <div className="text-sm font-medium mb-1">Aluno</div>
                <div className="text-base">
                  {selectedAttendanceRecord.studentName}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-1">Status Atual</div>
                <div className="text-base">
                  {selectedAttendanceRecord.present ? (
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
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Alterar Status</div>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Button
                    variant={
                      selectedAttendanceRecord.present ? "outline" : "default"
                    }
                    className={`w-full sm:flex-1 ${
                      selectedAttendanceRecord.present
                        ? ""
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    onClick={() => handleAttendanceUpdate(true)}
                    disabled={attendanceMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Marcar como Presente
                  </Button>
                  <Button
                    variant={
                      !selectedAttendanceRecord.present ? "outline" : "default"
                    }
                    className={`w-full sm:flex-1 ${
                      !selectedAttendanceRecord.present
                        ? ""
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                    onClick={() => handleAttendanceUpdate(false)}
                    disabled={attendanceMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Marcar como Ausente
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end pt-2">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edição de atividade missionária */}
      <Dialog open={isEditActivityOpen} onOpenChange={setIsEditActivityOpen}>
        <DialogContent className="w-[400px] max-w-full">
          <DialogHeader>
            <DialogTitle>Editar Atividade Missionária</DialogTitle>
          </DialogHeader>

          {selectedActivity && selectedActivityField && (
            <div className="py-4">
              <div className="mb-4">
                <div className="text-sm font-medium mb-1">Atividade</div>
                <div className="text-base">
                  {selectedActivityField === "literaturasDistribuidas" &&
                    "Literaturas Distribuídas"}
                  {selectedActivityField === "qtdContatosMissionarios" &&
                    "Contatos Missionários"}
                  {selectedActivityField === "estudosBiblicos" &&
                    "Estudos Bíblicos Ministrados"}
                  {selectedActivityField === "visitasMissionarias" &&
                    "Visitas Missionárias"}
                  {selectedActivityField === "pessoasAuxiliadas" &&
                    "Pessoas Auxiliadas"}
                  {selectedActivityField === "pessoasTrazidasIgreja" &&
                    "Pessoas Trazidas à Igreja"}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-1">Valor Atual</div>
                <div className="text-base">
                  {String(
                    selectedActivity[
                      selectedActivityField as keyof MissionaryActivityWithClass
                    ] || 0,
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Novo Valor</div>
                <input
                  type="number"
                  min="0"
                  value={editActivityValue}
                  onChange={(e) =>
                    setEditActivityValue(
                      Math.max(0, parseInt(e.target.value) || 0),
                    )
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditActivityOpen(false)}
              disabled={activityMutation.isPending}
              className="mr-2"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleActivityUpdate}
              disabled={activityMutation.isPending}
            >
              {activityMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherRecords;
