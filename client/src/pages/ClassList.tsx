import React, { useState } from 'react';
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
  UserPlus, 
  Users,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Class, insertClassSchema, insertStudentSchema } from '@shared/schema';
import Header from '@/components/Header';
import { useIsMobile } from '@/hooks/use-mobile';

// Form schemas with validation
const classFormSchema = insertClassSchema.extend({
  name: z.string().min(2, { message: 'O nome da classe deve ter pelo menos 2 caracteres' })
});

const studentFormSchema = insertStudentSchema.extend({
  name: z.string().min(2, { message: 'O nome do aluno deve ter pelo menos 2 caracteres' })
});

const ClassList: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { teacher } = useAuth();
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  
  // Fetch classes
  const { data: classes, isLoading } = useQuery<Class[]>({
    queryKey: ['/api/classes'],
  });
  
  // Forms
  const classForm = useForm<z.infer<typeof classFormSchema>>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
    },
  });
  
  const studentForm = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: '',
      classId: 0,
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
  
  const createStudentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof studentFormSchema>) => {
      const response = await apiRequest('POST', '/api/students', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      toast({
        title: 'Aluno adicionado com sucesso',
        description: 'O novo aluno foi adicionado à classe',
      });
      setIsAddStudentOpen(false);
      studentForm.reset();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar aluno',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Submit handlers
  const onSubmitClass = (data: z.infer<typeof classFormSchema>) => {
    createClassMutation.mutate(data);
  };
  
  const onSubmitStudent = (data: z.infer<typeof studentFormSchema>) => {
    if (selectedClass) {
      createStudentMutation.mutate({
        ...data,
        classId: selectedClass.id,
      });
    }
  };
  
  const handleSelectClass = (classObj: Class) => {
    setSelectedClass(classObj);
    setIsAddStudentOpen(true);
    studentForm.reset({
      name: '',
      classId: classObj.id,
    });
  };
  
  const goToWizard = (classObj: Class) => {
    setLocation(`/wizard?classId=${classObj.id}&className=${encodeURIComponent(classObj.name)}`);
  };
  
  // Render class list
  const renderClasses = () => {
    if (isLoading) {
      return Array(3).fill(0).map((_, i) => (
        <Card key={i} className="mb-4">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-9 w-1/3 mr-2" />
            <Skeleton className="h-9 w-1/3" />
          </CardFooter>
        </Card>
      ));
    }
    
    if (!classes || classes.length === 0) {
      return (
        <Card className="text-center p-8">
          <CardContent>
            <School className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Nenhuma classe cadastrada. Crie sua primeira classe!</p>
          </CardContent>
        </Card>
      );
    }
    
    return classes.map(classObj => (
      <Card key={classObj.id} className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{classObj.name}</CardTitle>
              <CardDescription>
                <div className="flex items-center mt-1">
                  <Users className="h-4 w-4 mr-1" />
                  <span>Alunos cadastrados: 0</span>
                </div>
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleSelectClass(classObj)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={() => setLocation(`/classes/${classObj.id}`)}
          >
            <PenSquare className="h-4 w-4 mr-2" />
            Editar
          </Button>
          
          {!teacher?.isAdmin && (
            <Button 
              size="sm" 
              className="flex items-center"
              onClick={() => goToWizard(classObj)}
            >
              Iniciar Registro
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>
    ));
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Classes</h1>
        
        {teacher?.isAdmin && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <School className="h-4 w-4 mr-2" />
                Nova Classe
              </Button>
            </DialogTrigger>
            <DialogContent>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderClasses()}
      </div>
      
      {/* Add Student Dialog */}
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Aluno</DialogTitle>
            <DialogDescription>
              {selectedClass && `Adicionar aluno à classe: ${selectedClass.name}`}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...studentForm}>
            <form onSubmit={studentForm.handleSubmit(onSubmitStudent)} className="space-y-4">
              <FormField
                control={studentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Aluno</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo do aluno" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createStudentMutation.isPending}>
                  {createStudentMutation.isPending ? 'Adicionando...' : 'Adicionar Aluno'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassList;
