import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  School, 
  PenSquare, 
  Users,
  ChevronRight,
  Plus,
  ClipboardList,
  FileText,
  CheckSquare,
  Pencil,
  User
} from 'lucide-react';
import { Class, insertClassSchema } from '@shared/schema';
import Header from '@/components/Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCurrentDateBRT } from '@/lib/date-utils';

// Form schemas with validation
const classFormSchema = insertClassSchema.extend({
  name: z.string().min(2, { message: 'O nome da classe deve ter pelo menos 2 caracteres' })
});

const ClassList: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { teacher } = useAuth();
  const [classesTodayRecords, setClassesTodayRecords] = useState<Record<number, boolean>>({});

  // Fetch classes
  const { data: classes = [], isLoading, refetch: refetchClasses } = useQuery<Class[]>({
    queryKey: ['/api/classes'],
  });

  // Fetch students count for each class
  const classStudentCounts = useQuery({
    queryKey: ['/api/classes-students-count'],
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

  // Forms
  const classForm = useForm<z.infer<typeof classFormSchema>>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
    },
  });

  // Mutations
  const createClassMutation = useMutation({
    mutationFn: async (data: z.infer<typeof classFormSchema>) => {
      const response = await apiRequest('POST', '/api/classes', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      toast({
        title: 'Classe criada com sucesso',
        description: 'A nova classe foi adicionada ao sistema',
      });
      classForm.reset();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar classe',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Submit handlers
  const onSubmitClass = (data: z.infer<typeof classFormSchema>) => {
    createClassMutation.mutate(data);
  };

  // Função para verificar se a classe já tem registro para o dia atual - versão melhorada que verifica a data atual precisamente
  const checkTodayRecords = async (classId: number) => {
    try {
      // Obter a data atual no formato yyyy-mm-dd usando nossa função utilitária
      const todayFormatted = getCurrentDateBRT();
      
      console.log(`Verificando registros para classe ${classId} na data ${todayFormatted}`);
      
      // Consultar registros especificamente para a classe e data atual
      const response = await apiRequest(
        'GET', 
        `/api/check-today-records/${classId}?date=${todayFormatted}`
      );
      
      if (!response.ok) {
        throw new Error(`Erro ao verificar registros: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Verificar especificamente se há registros para hoje
      const hasRecordsToday = data.hasRecords || false;
      
      console.log(`Registros para classe ${classId} hoje (${todayFormatted}): ${hasRecordsToday ? 'Sim' : 'Não'}`);
      
      return hasRecordsToday;
    } catch (error) {
      console.error('Erro ao verificar registros:', error);
      return false;
    }
  };

  // Verificar se cada classe tem registro para hoje quando as classes forem carregadas
  useEffect(() => {
    if (classes && classes.length > 0) {
      const fetchRecordsStatus = async () => {
        const recordsMap: Record<number, boolean> = {};
        
        // Verificar todas as classes em paralelo
        await Promise.all(
          classes.map(async (classObj) => {
            const hasRecords = await checkTodayRecords(classObj.id);
            recordsMap[classObj.id] = hasRecords;
          })
        );
        
        setClassesTodayRecords(recordsMap);
      };
      
      fetchRecordsStatus();
    }
  }, [classes]);

  // Função para navegar para o wizard
  const goToWizard = async (classObj: Class) => {
    // Determinar se estamos editando ou iniciando um novo registro
    const hasExistingRecords = await checkTodayRecords(classObj.id);
    console.log(`Indo para chamada na classe ${classObj.id}, com registros existentes: ${hasExistingRecords}`);
    
    // Ao navegar para o wizard, passamos o parâmetro de edição
    setLocation(`/wizard?classId=${classObj.id}&className=${encodeURIComponent(classObj.name)}&isEditing=${hasExistingRecords}`);
  };

  // Navegar para a página de alunos filtrada por classe
  const goToClassStudents = (classId: number) => {
    setLocation(`/students?classId=${classId}`);
  };
  
  // Buscar professores para cada classe
  const classTeachers = useQuery({
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
  
  // Render class list
  const renderClasses = () => {
    const isMobile = useIsMobile();

    if (isLoading) {
      return Array(3).fill(0).map((_, i) => (
        <Card key={i} className="mb-3 shadow-sm">
          <div className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <div className="flex items-center justify-between mt-2">
              <Skeleton className="h-8 w-20 mr-2" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        </Card>
      ));
    }

    if (!classes || classes.length === 0) {
      return (
        <Card className="text-center p-6 shadow-sm">
          <CardContent>
            <School className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500 text-sm">
              {teacher?.isAdmin 
                ? "Nenhuma classe cadastrada. Crie sua primeira classe!" 
                : "Você não possui classes atribuídas."}
            </p>
          </CardContent>
        </Card>
      );
    }

    return classes.map(classObj => (
      <Card key={classObj.id} className="mb-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-base">{classObj.name}</h3>
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <Users className="h-3.5 w-3.5 mr-1" />
                {classStudentCounts.isLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <span>
                    Alunos cadastrados: {(classStudentCounts.data && classStudentCounts.data[classObj.id]) || 0}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col mt-4 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={classesTodayRecords[classObj.id] ? "outline" : "default"}
                size="sm" 
                onClick={() => goToWizard(classObj)}
                className={classesTodayRecords[classObj.id] ? "border-orange-500 text-orange-600 hover:bg-orange-50" : "bg-green-600 hover:bg-green-700 text-white"}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                {classesTodayRecords[classObj.id] ? 'Editar Chamada' : 'Fazer Chamada'}
              </Button>
              
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => setLocation(`/classes/${classObj.id}`)}
              >
                <PenSquare className="h-4 w-4 mr-2" />
                Gerenciar Alunos
              </Button>
              
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => {
                  // Redireciona com base no papel do usuário
                  console.log("Botão Registros clicado, isAdmin:", teacher?.isAdmin);
                  
                  // Usar encodeURIComponent para garantir que o ID seja corretamente codificado na URL
                  const classIdParam = encodeURIComponent(classObj.id.toString());
                  
                  if (teacher?.isAdmin) {
                    // Para admin, usar setLocation em vez de window.location.href
                    console.log("Admin: Redirecionando para /records");
                    setLocation(`/records?classId=${classIdParam}`);
                  } else {
                    // Para professores, usar setLocation com invalidação explícita de cache
                    console.log("Professor: Redirecionando para /teacher-records");
                    
                    // Invalidar as queries antes da navegação
                    queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/missionary-activities'] });
                    
                    // Usar setLocation
                    setLocation(`/teacher-records/${classIdParam}`);
                  }
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Registros
              </Button>
            </div>
          </div>
        </div>
      </Card>
    ));
  };

  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 p-4">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>Minhas Classes</h1>

          <div className="flex space-x-2">
              {teacher?.isAdmin && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size={isMobile ? "sm" : "default"}>
                      {isMobile ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <>
                          <School className="h-4 w-4 mr-2" />
                          Nova Classe
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className={isMobile ? "w-[90vw] max-w-md" : ""}>
                    <DialogHeader>
                      <DialogTitle>Adicionar Nova Classe</DialogTitle>
                      <DialogDescription>
                        Digite o nome da classe para criar um novo registro.
                      </DialogDescription>
                    </DialogHeader>

                    <Form {...classForm}>
                      <form onSubmit={classForm.handleSubmit(onSubmitClass)} className="space-y-4">
                        <FormField
                          control={classForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome da Classe</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Classe Adultos" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button type="submit" disabled={createClassMutation.isPending}>
                            {createClassMutation.isPending ? 'Criando...' : 'Criar Classe'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
          </div>
        </div>

        <div className="max-w-lg mx-auto">
          {renderClasses()}
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Apenas classes atribuídas a você são mostradas</p>
        </div>
      </main>
    </div>
  );
};

export default ClassList;