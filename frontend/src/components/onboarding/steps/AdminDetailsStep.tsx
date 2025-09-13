import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';

interface AdminDetailsStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
}

export const AdminDetailsStep = ({ form }: AdminDetailsStepProps) => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Admin Details
      </h1>
      <p className="text-gray-600 text-lg mb-12">
        Provide administrator contact and account details.
      </p>
      <div className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="adminEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                    placeholder="admin@company.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="adminMobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Mobile *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                    placeholder="+1 (555) 123-4567"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Company Website *
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="url"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                  placeholder="https://www.company.com"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Important Note</h4>
          <p className="text-sm text-blue-700">
            The administrator email will be used for account management and important notifications. 
            Make sure this email is accessible and monitored regularly.
          </p>
        </div>
      </div>
    </div>
  );
};
