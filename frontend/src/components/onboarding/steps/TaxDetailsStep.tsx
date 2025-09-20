import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';
import { Button } from '@/components/ui';

interface TaxDetailsStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
}

export const TaxDetailsStep = ({ form }: TaxDetailsStepProps) => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Tax Details
      </h1>
      <p className="text-gray-600 text-lg mb-12">
        Provide your tax registration and compliance details.
      </p>
      <div className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-[1fr_120px] gap-2 items-end">
          <FormField
            control={form.control}
            name="gstin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                  GSTIN Number *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                    placeholder="Enter GSTIN number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className="max-w-full" variant="outline">
            Verify GSTIN
          </Button>
        </div>
        <FormField
          control={form.control}
          name="incorporationState"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Incorporation State *
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                  placeholder="Enter incorporation state"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* <FormField
          control={form.control}
          name="taxDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Tax Details *
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400 resize-none"
                  placeholder="Describe your tax registration details, exemptions, or special considerations"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        <FormField
          control={form.control}
          name="billingAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Billing Address *
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400 resize-none"
                  placeholder="Enter your company's billing address"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
