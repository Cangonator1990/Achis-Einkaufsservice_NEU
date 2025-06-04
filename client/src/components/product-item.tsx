import React from "react";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ProductItemProps {
  index: number;
  onRemove: () => void;
  disableRemove: boolean;
  register: any;
  errors: any;
  setValue: any;
  getValues: any;
}

export function ProductItem({ 
  index, 
  onRemove, 
  disableRemove,
  register, 
  errors, 
  setValue,
  getValues
}: ProductItemProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-md mb-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6">
          <FormField
            name={`products.${index}.name`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Produkt</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="z.B. Milch" 
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="md:col-span-2">
          <FormField
            name={`products.${index}.quantity`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Anzahl</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                    {...field}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1) {
                        field.onChange(value);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="md:col-span-3">
          <FormField
            name={`products.${index}.notes`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Notiz (optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="z.B. 1,5% Fett" 
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="md:col-span-1 flex items-end justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-10 w-10"
            onClick={onRemove}
            disabled={disableRemove}
          >
            <Trash2 className="h-5 w-5" />
            <span className="sr-only">Produkt entfernen</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
