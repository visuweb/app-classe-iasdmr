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
  Pencil
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

  const goToWizard = async (classObj: Class) => {
    // Determinar se estamos editando ou iniciando um novo registro
    const hasExistingRecords = await checkTodayRecords(classObj.id);
    console.log(`Indo para chamada na classe ${classObj.id}, com registros existentes: ${hasExistingRecords}`);
    
    // Ao navegar para o wizard, passamos o parâmetro de edição
    setLocation(`/wizard?classId=${classObj.id}&className=${encodeURIComponent(classObj.name)}&isEditing=${hasExistingRecords}`);
  };

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

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
                onClick={() => setLocation(`/classes/${classObj.id}`)}
              >
                <PenSquare className="h-3.5 w-3.5 mr-1.5" />
                {isMobile ? "Editar" : "Gerenciar"}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
                onClick={() => setLocation(`/teacher-records/${classObj.id}`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isMobile ? "Registros" : "Ver Registros"}
              </Button>
              <Button 
                variant={classesTodayRecords[classObj.id] ? "default" : "default"}
                size="sm" 
                className={`flex items-center ${classesTodayRecords[classObj.id] 
                  ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                onClick={() => goToWizard(classObj)}
              >
                {classesTodayRecords[classObj.id] 
                  ? <Pencil className="h-4 w-4 mr-2" /> 
                  : <CheckSquare className="h-4 w-4 mr-2" />
                }
                {isMobile 
                  ? "Chamada" 
                  : classesTodayRecords[classObj.id] 
                    ? "Editar Chamada" 
                    : "Iniciar Chamada"
                }
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