import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { insertUserSchema } from "@shared/schema";

const loginSchema = z.object({
  username: z.string().min(1, { message: "Benutzername ist erforderlich" }),
  password: z.string().min(1, { message: "Passwort ist erforderlich" }),
});

// Customize the user schema for registration
const registerSchema = insertUserSchema
  .extend({
    confirmPassword: z.string(),
    // Override birthDate to accept string from the date input
    birthDate: z.string().refine(val => !!val, {
      message: "Geburtsdatum ist erforderlich"
    })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      birthDate: "",
    },
  });

  const onRegisterSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  if (user) {
    return null; // Will redirect in effect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="py-6">
        <div className="container mx-auto px-4 flex justify-center">
          <Logo variant="text" size="large" />
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-8">
          {/* Left column - Auth Forms */}
          <div className="lg:w-1/2 bg-white p-8 rounded-lg shadow-md">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="register">Registrieren</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">Willkommen zurück</h2>
                    <p className="text-gray-600 mt-2">
                      Melden Sie sich an, um Ihre Einkäufe zu bestellen
                    </p>
                  </div>

                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Benutzername</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ihr Benutzername"
                                {...field}
                              />
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
                            <FormLabel>Passwort</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="link"
                          className="text-sm text-primary px-0"
                        >
                          Passwort vergessen?
                        </Button>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Anmelden..." : "Anmelden"}
                      </Button>
                    </form>
                  </Form>
                </div>
              </TabsContent>

              <TabsContent value="register">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">Neu bei uns?</h2>
                    <p className="text-gray-600 mt-2">
                      Erstellen Sie ein Konto, um loszulegen
                    </p>
                  </div>

                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vorname</FormLabel>
                              <FormControl>
                                <Input placeholder="Max" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nachname</FormLabel>
                              <FormControl>
                                <Input placeholder="Mustermann" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-Mail</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="ihre.email@beispiel.de"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Benutzername</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ihr Benutzername"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefonnummer</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="+49 123 45678"
                                  {...field}
                                  value={field.value || ''} // Sicherstellen, dass value nie null ist
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={registerForm.control}
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Geburtsdatum</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Passwort</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Passwort bestätigen</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending
                          ? "Registrieren..."
                          : "Registrieren"}
                      </Button>
                    </form>
                  </Form>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column - Hero Section */}
          <div className="lg:w-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 p-8 rounded-lg shadow-md flex flex-col justify-center text-white">
            <div className="max-w-md mx-auto">
              <h1 className="text-3xl font-bold mb-4">
                Ihr persönlicher Einkaufsservice
              </h1>
              <p className="text-lg mb-6">
                Wir erledigen Ihre Einkäufe, damit Sie mehr Zeit für die
                wichtigen Dinge im Leben haben.
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-full p-2 mr-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">Einfache Bestellung</h3>
                    <p className="text-white text-opacity-80">
                      Erstellen Sie Ihre Einkaufsliste online
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-full p-2 mr-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">Flexible Lieferung</h3>
                    <p className="text-white text-opacity-80">
                      Wählen Sie Ihren bevorzugten Liefertermin
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-full p-2 mr-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">Qualitätsgarantie</h3>
                    <p className="text-white text-opacity-80">
                      Frische Produkte und sorgfältige Auswahl
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}