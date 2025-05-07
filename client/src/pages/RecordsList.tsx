import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfMonth, endOfMonth, parse, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, BarChart3, ClipboardList, ChevronLeft, ChevronRight, Filter, Edit, Pencil } from 'lucide-react';
import { Class, AttendanceRecord, MissionaryActivity, missionaryActivityDefinitions } from '@shared/schema';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Calendar as CalendarComponent 
} from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

type AttendanceRecordWithStudent = AttendanceRecord & { studentName: string };
type MissionaryActivityWithClass = MissionaryActivity & { className: string };

// Esquema de validação para edição de presença
const attendanceEditSchema = z.object({
  present: z.enum(['true', 'false']),
});

type AttendanceEditFormValues = z.infer<typeof attendanceEditSchema>;

// Esquema de validação para edição de atividade missionária
const missionaryActivityEditSchema = z.object({
  activityValue: z.coerce.number().nonnegative(),
});

type MissionaryActivityEditFormValues = z.infer<typeof missionaryActivityEditSchema>;

const RecordsList: React.FC = () => {
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  // Estado para filtro de data
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Estados para os modais de edição
  const [attendanceEditDialogOpen, setAttendanceEditDialogOpen] = useState(false);
  const [missionaryActivityEditDialogOpen, setMissionaryActivityEditDialogOpen] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<AttendanceRecordWithStudent | null>(null);
  const [selectedMissionaryActivity, setSelectedMissionaryActivity] = useState<MissionaryActivity | null>(null);
  const [selectedActivityField, setSelectedActivityField] = useState<string>('');
  const [selectedActivityLabel, setSelectedActivityLabel] = useState<string>('');
  
  // Calcular o início e fim do mês selecionado
  const startOfSelectedMonth = startOfMonth(selectedMonth);
  const endOfSelectedMonth = endOfMonth(selectedMonth);
  
  // Formatar datas para exibição
  const formattedMonth = format(selectedMonth, 'MMMM yyyy', { locale: ptBR });
  
  // Funções para navegação entre meses
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };
  
  const goToNextMonth = () => {
    setSelectedMonth(prev => {
      const nextMonth = new Date(prev);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    });
  };
  
  // Queries
  const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ['/api/classes'],
  });
  
  // Carregar todos os registros de presença
  const { data: allAttendanceRecords = [], isLoading: isLoadingAllAttendance } = useQuery<AttendanceRecordWithStudent[]>({
    queryKey: ['/api/attendance'],
    enabled: !!selectedClassId,
  });
  
  // Filtrar registros por classe e mês
  const attendanceRecords = selectedClassId
    ? allAttendanceRecords.filter((record) => {
        // Converter para número para comparação
        const studentClassId = parseInt(selectedClassId, 10);
        const recordDate = new Date(record.date);
        
        // Verificar se o record pertence à classe selecionada
        // Como o record não tem classId diretamente, precisamos verificar nos estudantes
        // ou confiar que a API já filtrou corretamente
        return recordDate >= startOfSelectedMonth && 
               recordDate <= endOfSelectedMonth;
      })
    : [];
  
  // Indicador de carregamento para registros combinados
  const isLoadingAttendance = isLoadingAllAttendance;
  
  // Carregar atividades missionárias
  const { data: allMissionaryActivities = [], isLoading: isLoadingAllActivities } = useQuery<MissionaryActivityWithClass[]>({
    queryKey: ['/api/missionary-activities'],
    enabled: !!selectedClassId,
  });
  
  // Filtrar atividades por classe e mês
  const missionaryActivities = selectedClassId
    ? allMissionaryActivities.filter((activity) => {
        const classId = parseInt(selectedClassId, 10);
        const activityDate = new Date(activity.date);
        
        return activity.classId === classId && 
               activityDate >= startOfSelectedMonth && 
               activityDate <= endOfSelectedMonth;
      })
    : [];
  
  // Indicador de carregamento para atividades combinadas
  const isLoadingActivities = isLoadingAllActivities;
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM, yyyy", { locale: ptBR });
  };
  
  // Mutação para atualizar presença
  const updateAttendanceMutation = useMutation({
    mutationFn: async (data: { id: number, present: boolean }) => {
      const response = await apiRequest('PATCH', `/api/attendance/${data.id}`, { present: data.present });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Presença atualizada",
        description: "O registro de presença foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      setAttendanceEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar presença",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutação para atualizar atividade missionária
  const updateMissionaryActivityMutation = useMutation({
    mutationFn: async (data: { id: number, field: string, value: number }) => {
      const payload = { [data.field]: data.value };
      const response = await apiRequest('PATCH', `/api/missionary-activities/${data.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Atividade atualizada",
        description: "O registro de atividade missionária foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/missionary-activities'] });
      setMissionaryActivityEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar atividade",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Form para edição de presença
  const attendanceForm = useForm<AttendanceEditFormValues>({
    resolver: zodResolver(attendanceEditSchema),
    defaultValues: {
      present: 'true',
    },
  });
  
  // Form para edição de atividade missionária
  const missionaryActivityForm = useForm<MissionaryActivityEditFormValues>({
    resolver: zodResolver(missionaryActivityEditSchema),
    defaultValues: {
      activityValue: 0,
    },
  });
  
  // Lidar com a abertura do modal de edição de presença
  const handleEditAttendance = (record: AttendanceRecordWithStudent) => {
    setSelectedAttendanceRecord(record);
    attendanceForm.reset({
      present: record.present ? 'true' : 'false',
    });
    setAttendanceEditDialogOpen(true);
  };
  
  // Lidar com a submissão do form de edição de presença
  const onAttendanceEditSubmit = (values: AttendanceEditFormValues) => {
    if (!selectedAttendanceRecord) return;
    
    updateAttendanceMutation.mutate({
      id: selectedAttendanceRecord.id,
      present: values.present === 'true',
    });
  };
  
  // Lidar com a abertura do modal de edição de atividade missionária
  const handleEditMissionaryActivity = (activity: MissionaryActivity, field: string, label: string) => {
    setSelectedMissionaryActivity(activity);
    setSelectedActivityField(field);
    setSelectedActivityLabel(label);
    
    const value = parseInt((activity as any)[field]?.toString() || '0', 10);
    missionaryActivityForm.reset({
      activityValue: value,
    });
    
    setMissionaryActivityEditDialogOpen(true);
  };
  
  // Lidar com a submissão do form de edição de atividade missionária
  const onMissionaryActivityEditSubmit = (values: MissionaryActivityEditFormValues) => {
    if (!selectedMissionaryActivity || !selectedActivityField) return;
    
    updateMissionaryActivityMutation.mutate({
      id: selectedMissionaryActivity.id,
      field: selectedActivityField,
      value: values.activityValue,
    });
  };
  
  // Contar presentes e ausentes nos registros
  const getPresentStudentsCount = (records: AttendanceRecordWithStudent[]) => {
    return records.filter(record => record.present).length;
  };
  
  const getAbsentStudentsCount = (records: AttendanceRecordWithStudent[]) => {
    return records.filter(record => !record.present).length;
  };
  
  // Render attendance records
  const renderAttendanceRecords = () => {
    if (isLoadingAttendance) {
      return (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }
    
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return (
        <div className="text-center py-8">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Não há registros de presença para esta classe.</p>
        </div>
      );
    }
    
    // Group attendance records by date
    const recordsByDate = attendanceRecords.reduce((acc, record) => {
      const dateKey = record.date.toString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(record);
      return acc;
    }, {} as Record<string, AttendanceRecordWithStudent[]>);
    
    return Object.entries(recordsByDate).map(([date, records]) => {
      const presentCount = getPresentStudentsCount(records);
      const absentCount = getAbsentStudentsCount(records);
      
      return (
        <Card key={date} className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-primary-500" />
                <CardTitle className="text-base">{formatDate(date)}</CardTitle>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-green-600 font-medium">Presentes ({presentCount})</span>
              <span className="text-red-600 font-medium">Ausentes ({absentCount})</span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.studentName}</TableCell>
                    <TableCell className="text-center">
                      <span 
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.present 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {record.present ? 'Presente' : 'Ausente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditAttendance(record)}
                        className="h-8 px-2"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs">Editar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      );
    });
  };
  
  // Render missionary activities
  const renderMissionaryActivities = () => {
    if (isLoadingActivities) {
      return (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      );
    }
    
    if (!missionaryActivities || missionaryActivities.length === 0) {
      return (
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Não há registros de atividades missionárias para esta classe.</p>
        </div>
      );
    }
    
    return missionaryActivities.map((activity) => (
      <Card key={activity.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary-500" />
            <CardTitle className="text-base">{formatDate(activity.date.toString())}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atividade</TableHead>
                <TableHead className="text-center">Quantidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Contatos Missionários</TableCell>
                <TableCell className="text-center">{activity.qtdContatosMissionarios}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditMissionaryActivity(activity, 'qtdContatosMissionarios', 'Contatos Missionários')}
                    className="h-8 px-2"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Editar</span>
                  </Button>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell>Literaturas Distribuídas</TableCell>
                <TableCell className="text-center">{activity.literaturasDistribuidas}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditMissionaryActivity(activity, 'literaturasDistribuidas', 'Literaturas Distribuídas')}
                    className="h-8 px-2"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Editar</span>
                  </Button>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell>Visitas Missionárias</TableCell>
                <TableCell className="text-center">{activity.visitasMissionarias}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditMissionaryActivity(activity, 'visitasMissionarias', 'Visitas Missionárias')}
                    className="h-8 px-2"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Editar</span>
                  </Button>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell>Estudos Bíblicos Ministrados</TableCell>
                <TableCell className="text-center">{(activity.estudosBiblicos || 0) + (activity.ministrados || 0)}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditMissionaryActivity(activity, 'estudosBiblicos', 'Estudos Bíblicos Ministrados')}
                    className="h-8 px-2"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Editar</span>
                  </Button>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell>Pessoas Auxiliadas</TableCell>
                <TableCell className="text-center">{activity.pessoasAuxiliadas}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditMissionaryActivity(activity, 'pessoasAuxiliadas', 'Pessoas Auxiliadas')}
                    className="h-8 px-2"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Editar</span>
                  </Button>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell>Pessoas Trazidas à Igreja</TableCell>
                <TableCell className="text-center">{activity.pessoasTrazidasIgreja}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditMissionaryActivity(activity, 'pessoasTrazidasIgreja', 'Pessoas Trazidas à Igreja')}
                    className="h-8 px-2"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Editar</span>
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ));
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Histórico de Registros</h1>
      
      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
        <Select 
          value={selectedClassId} 
          onValueChange={setSelectedClassId}
          disabled={isLoadingClasses}
        >
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder="Selecione uma classe" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingClasses ? (
              <SelectItem value="loading">Carregando classes...</SelectItem>
            ) : classes && classes.length > 0 ? (
              classes.map((classObj) => (
                <SelectItem key={classObj.id} value={classObj.id.toString()}>
                  {classObj.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="empty">Nenhuma classe encontrada</SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {/* Filtro de data por mês */}
        <div className="flex items-center">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="mx-2 min-w-[150px]"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {formattedMonth}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedMonth}
                onSelect={(date) => {
                  if (date) {
                    setSelectedMonth(date);
                    setDatePickerOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {selectedClassId && (
        <Tabs defaultValue="attendance">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="attendance" className="flex items-center">
              <ClipboardList className="h-4 w-4 mr-2" />
              Registro de Presença
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Atividades Missionárias
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="attendance" className="space-y-4">
            {renderAttendanceRecords()}
          </TabsContent>
          
          <TabsContent value="activities" className="space-y-4">
            {renderMissionaryActivities()}
          </TabsContent>
        </Tabs>
      )}
      
      {!selectedClassId && (
        <div className="text-center py-16">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg mb-2">Selecione uma classe para visualizar os registros</p>
          <p className="text-gray-400 text-sm">Os dados serão exibidos após a seleção</p>
        </div>
      )}
      
      {/* Modal de edição de presença */}
      <Dialog open={attendanceEditDialogOpen} onOpenChange={setAttendanceEditDialogOpen}>
        <DialogContent className="w-[400px] max-w-full">
          <DialogHeader>
            <DialogTitle>Editar Presença</DialogTitle>
            <DialogDescription>
              {selectedAttendanceRecord && (
                <span>Alterar presença do aluno <strong>{selectedAttendanceRecord.studentName}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...attendanceForm}>
            <form onSubmit={attendanceForm.handleSubmit(onAttendanceEditSubmit)} className="space-y-4">
              <FormField
                control={attendanceForm.control}
                name="present"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="true" />
                          </FormControl>
                          <FormLabel className="font-normal text-green-600">
                            Presente
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="false" />
                          </FormControl>
                          <FormLabel className="font-normal text-red-600">
                            Ausente
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex justify-end pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAttendanceEditDialogOpen(false)}
                  className="mr-2"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={updateAttendanceMutation.isPending}
                >
                  {updateAttendanceMutation.isPending ? (
                    <>Salvando...</>
                  ) : (
                    <>Salvar Alterações</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Modal de edição de atividade missionária */}
      <Dialog open={missionaryActivityEditDialogOpen} onOpenChange={setMissionaryActivityEditDialogOpen}>
        <DialogContent className="w-[400px] max-w-full">
          <DialogHeader>
            <DialogTitle>Editar Atividade Missionária</DialogTitle>
            <DialogDescription>
              {selectedActivityLabel && (
                <span>Alterar quantidade de <strong>{selectedActivityLabel}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...missionaryActivityForm}>
            <form onSubmit={missionaryActivityForm.handleSubmit(onMissionaryActivityEditSubmit)} className="space-y-4">
              <FormField
                control={missionaryActivityForm.control}
                name="activityValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        {...field}
                        onChange={(e) => {
                          // Certifique-se de que o valor é um número positivo
                          const value = parseInt(e.target.value, 10);
                          if (!isNaN(value) && value >= 0) {
                            field.onChange(value);
                          } else if (e.target.value === '') {
                            field.onChange(0);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex justify-end pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setMissionaryActivityEditDialogOpen(false)}
                  className="mr-2"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={updateMissionaryActivityMutation.isPending}
                >
                  {updateMissionaryActivityMutation.isPending ? (
                    <>Salvando...</>
                  ) : (
                    <>Salvar Alterações</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecordsList;
