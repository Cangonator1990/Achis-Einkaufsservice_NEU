import React from "react";
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Trash2Icon } from "lucide-react";

interface AddressItemProps {
  index: number;
  addressId?: number;
  isDefault: boolean;
  onSetDefault: (id?: number) => void;
  onRemove: () => void;
  disableRemove: boolean;
  register: any;
  errors: any;
  setValue: any;
  getValues: any;
}

export function AddressItem({ 
  index, 
  addressId, 
  isDefault, 
  onSetDefault, 
  onRemove, 
  disableRemove,
  register, 
  errors, 
  setValue,
  getValues
}: AddressItemProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-md mb-4">
      <div className="flex items-center mb-2">
        <input 
          type="radio" 
          id={`address${index}`} 
          checked={isDefault}
          onChange={() => onSetDefault(addressId)}
          className="text-primary focus:ring-primary h-4 w-4"
        />
        <label htmlFor={`address${index}`} className="ml-2 block text-sm font-medium text-gray-700">
          Standardadresse
        </label>
        {!disableRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-red-500 hover:text-red-600 hover:bg-red-50 h-8"
            onClick={onRemove}
          >
            <Trash2Icon className="h-4 w-4 mr-1" />
            <span>Entfernen</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3">
          <FormField
            name={`addresses.${index}.name`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="z.B. Zuhause" 
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="md:col-span-4">
          <FormField
            name={`addresses.${index}.street`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Straße</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Straßenname" 
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="md:col-span-1">
          <FormField
            name={`addresses.${index}.houseNumber`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Nr.</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="123" 
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
            name={`addresses.${index}.postalCode`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">PLZ</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="12345" 
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
            name={`addresses.${index}.city`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Stadt</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Berlin" 
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Hidden field for ID if editing existing address */}
      {addressId && (
        <input type="hidden" {...register(`addresses.${index}.id`)} value={addressId} />
      )}
    </div>
  );
}