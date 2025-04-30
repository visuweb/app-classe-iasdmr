import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, School, BookOpen, Users, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';

// Login form schema
const loginSchema = z.object({
  cpf: z.string().min(1, 'CPF é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginValues = z.infer<typeof loginSchema>;

// Register form schema
const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().min(1, 'CPF é obrigatório'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type RegisterValues = z.infer<typeof registerSchema>;

const AuthPage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<string>('login');
  const [loginError, setLoginError] = useState<string>('');
  const [registerError, setRegisterError] = useState<string>('');

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      cpf: '',
      password: '',
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      cpf: '',
      password: '',
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginValues) => {
      const response = await apiRequest('POST', '/api/login', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao entrar');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Login realizado com sucesso',
        description: 'Você está sendo redirecionado...',
      });
      setLocation('/');
    },
    onError: (error: Error) => {
      setLoginError(error.message);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterValues) => {
      const response = await apiRequest('POST', '/api/teachers', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao cadastrar');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Registro realizado com sucesso',
        description: 'Agora você pode fazer login',
      });
      setTab('login');
      loginForm.setValue('cpf', registerForm.getValues('cpf'));
      registerForm.reset();
    },
    onError: (error: Error) => {
      setRegisterError(error.message);
    },
  });

  // Login handler
  const onLoginSubmit = (values: LoginValues) => {
    setLoginError('');
    loginMutation.mutate(values);
  };

  // Register handler
  const onRegisterSubmit = (values: RegisterValues) => {
    setRegisterError('');
    registerMutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
        {/* Hero section */}
        <div className="hidden md:flex flex-col space-y-8">
          <div className="flex items-center space-x-3">
            <School className="h-10 w-10 text-primary-500" />
            <h1 className="text-3xl font-bold text-gray-900">TURMA CLASSE</h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Gerenciamento de classes e atividades missionárias
            </h2>
            <p className="text-gray-600">
              Simplifique o registro de presença dos alunos e acompanhe as atividades 
              missionárias semanais da sua classe.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-primary-100 p-2 rounded-full">
                <BookOpen className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Registros Simplificados</h3>
                <p className="text-sm text-gray-600">
                  Registre presenças e atividades missionárias em poucos cliques
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-primary-100 p-2 rounded-full">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Gestão de Classes</h3>
                <p className="text-sm text-gray-600">
                  Organize suas classes e alunos de forma intuitiva
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Auth forms */}
        <div>
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                {tab === 'login' ? 'Entrar' : 'Criar Conta'}
              </CardTitle>
              <CardDescription className="text-center">
                {tab === 'login' 
                  ? 'Entre com seu CPF e senha para acessar o sistema'
                  : 'Preencha os campos abaixo para criar sua conta'
                }
              </CardDescription>
            </CardHeader>
            
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Registrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <CardContent className="pt-6">
                  {loginError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite seu CPF" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Digite sua senha" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Entrando...
                          </>
                        ) : (
                          <>
                            Entrar
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-xs text-gray-500">
                    Não tem uma conta? 
                    <button 
                      className="text-primary-500 ml-1 hover:underline focus:outline-none"
                      onClick={() => setTab('register')}
                    >
                      Registre-se
                    </button>
                  </p>
                </CardFooter>
              </TabsContent>
              
              <TabsContent value="register">
                <CardContent className="pt-6">
                  {registerError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{registerError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite seu nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite seu CPF" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Crie uma senha" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registrando...
                          </>
                        ) : (
                          <>
                            Registrar
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-xs text-gray-500">
                    Já tem uma conta? 
                    <button 
                      className="text-primary-500 ml-1 hover:underline focus:outline-none"
                      onClick={() => setTab('login')}
                    >
                      Faça login
                    </button>
                  </p>
                </CardFooter>
              </TabsContent>
            </Tabs>
          </Card>
          
          <div className="md:hidden mt-8 text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <School className="h-5 w-5 text-primary-500" />
              <h1 className="text-lg font-bold text-gray-900">TURMA CLASSE</h1>
            </div>
            <p className="text-sm text-gray-600">
              Gerenciamento de classes e atividades missionárias
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;