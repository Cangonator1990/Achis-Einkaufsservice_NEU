import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Address } from "@shared/schema";

interface AddressFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editAddress?: Address;
}

const addressSchema = z.object({
  name: z.string().optional(),
  fullName: z.string().min(1, { message: "Vollständiger Name ist erforderlich" }),
  street: z.string().min(1, { message: "Straße ist erforderlich" }),
  houseNumber: z.string().min(1, { message: "Hausnummer ist erforderlich" }),
  postalCode: z.string().min(5, { message: "Gültige PLZ ist erforderlich" }),
  city: z.string().min(1, { message: "Stadt ist erforderlich" }),
  additionalInfo: z.string().optional(),
  isDefault: z.boolean().default(false)
});

type AddressFormValues = z.infer<typeof addressSchema>;

const AddressForm = ({ onSuccess, onCancel, editAddress }: AddressFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: editAddress ? {
      name: editAddress.name || "",
      fullName: editAddress.fullName,
      street: editAddress.street,
      houseNumber: editAddress.houseNumber,
      postalCode: editAddress.postalCode,
      city: editAddress.city,
      additionalInfo: editAddress.additionalInfo || "",
      isDefault: editAddress.isDefault
    } : {
      name: "",
      fullName: "",
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      additionalInfo: "",
      isDefault: false
    }
  });
  
  const createAddressMutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      const res = await apiRequest("/api/addresses", {
        method: "POST", 
        body: JSON.stringify(values)
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Adresse gespeichert",
        description: "Die Adresse wurde erfolgreich hinzugefügt.",
        variant: "success"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      onSuccess?.();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Die Adresse konnte nicht gespeichert werden: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  const updateAddressMutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      const res = await apiRequest(`/api/addresses/${editAddress?.id}`, {
        method: "PATCH", 
        body: JSON.stringify(values)
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Adresse aktualisiert",
        description: "Die Adresse wurde erfolgreich aktualisiert.",
        variant: "success"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Die Adresse konnte nicht aktualisiert werden: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: AddressFormValues) => {
    if (editAddress) {
      updateAddressMutation.mutate(values);
    } else {
      createAddressMutation.mutate(values);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adressname (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="z.B. Zuhause, Büro"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vollständiger Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Max Mustermann"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Straße *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Hauptstraße"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="houseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hausnummer *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PLZ *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="10115"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stadt *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Berlin"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="additionalInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Zusätzliche Informationen</FormLabel>
              <FormControl>
                <Input
                  placeholder="Etage, Zugangscode, etc."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Als Standardadresse festlegen</FormLabel>
              </div>
            </FormItem>
          )}
        />
        
        <div className="mt-6 flex justify-end space-x-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Abbrechen
            </Button>
          )}
          
          <Button
            type="submit"
            disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
          >
            {createAddressMutation.isPending || updateAddressMutation.isPending
              ? "Wird gespeichert..."
              : editAddress 
                ? "Adresse aktualisieren" 
                : "Adresse speichern"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddressForm;
