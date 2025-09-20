import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  MapPin, 
  Users, 
  User, 
  FileText, 
  CreditCard, 
  Mail, 
  Phone, 
  Globe,
  CheckCircle,
  Edit
} from 'lucide-react';
import { newBusinessData, existingBusinessData } from '../schemas';

interface ReviewStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  onEditStep?: (stepNumber: number) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ form, onEditStep }) => {
  const values = form.getValues();
  const isExistingBusiness = 'gstin' in values;

  const handleEditStep = (stepNumber: number) => {
    if (onEditStep) {
      onEditStep(stepNumber);
    }
  };

  const renderSection = (title: string, icon: React.ComponentType<any>, children: React.ReactNode, stepNumber?: number) => (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
          </div>
          {stepNumber && onEditStep && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditStep(stepNumber)}
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Information</h2>
        <p className="text-gray-600">
          Please review all the information you've provided. You can edit any section by clicking the "Edit" button.
        </p>
      </div>

      <div className="space-y-6">
        {/* Company Type & State */}
        {renderSection(
          "Company Information",
          Building2,
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Company Type</label>
              <p className="text-gray-900 capitalize">{values.companyType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">State</label>
              <p className="text-gray-900 capitalize">{values.state}</p>
            </div>
          </div>,
          1
        )}

        {/* Business Details */}
        {renderSection(
          "Business Details",
          FileText,
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Company Name</label>
              <p className="text-gray-900 font-medium">{values.businessDetails.companyName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Business Type</label>
              <p className="text-gray-900">{values.businessDetails.businessType}</p>
            </div>
            {values.businessDetails.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{values.businessDetails.description}</p>
              </div>
            )}
          </div>,
          3
        )}

        {/* Tax Details - Only for Existing Business */}
        {isExistingBusiness && (
          renderSection(
            "Tax Details",
            CreditCard,
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">GSTIN</label>
                  <p className="text-gray-900 font-mono">{values.gstin}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Incorporation State</label>
                  <p className="text-gray-900 capitalize">{values.incorporationState}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tax Details</label>
                <p className="text-gray-900">{values.taxDetails}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Billing Address</label>
                <p className="text-gray-900">{values.billingAddress}</p>
              </div>
            </div>,
            4
          )
        )}

        {/* Team Members */}
        {values.team && values.team.length > 0 && (
          renderSection(
            "Team Members",
            Users,
            <div className="space-y-3">
              {values.team.map((member, index) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>,
            isExistingBusiness ? 5 : 4
          )
        )}

        {/* Admin Details - Only for Existing Business */}
        {isExistingBusiness && (
          renderSection(
            "Administrator Details",
            User,
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Admin Email</label>
                  <p className="text-gray-900">{values.adminEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Admin Mobile</label>
                  <p className="text-gray-900">{values.adminMobile}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Website</label>
                <p className="text-gray-900">{values.website}</p>
              </div>
            </div>,
            6
          )
        )}

        {/* Personal Details */}
        {renderSection(
          "Personal Details",
          User,
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">First Name</label>
                <p className="text-gray-900">{values.personalDetails.firstName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Name</label>
                <p className="text-gray-900">{values.personalDetails.lastName}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{values.personalDetails.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900">{values.personalDetails.phone}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-gray-900">{values.personalDetails.address}</p>
            </div>
          </div>,
          isExistingBusiness ? 7 : 5
        )}

        {/* Summary Badge */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Ready to Submit</h3>
          </div>
          <p className="text-blue-700 text-sm">
            All required information has been provided. Click "Submit" to complete your {isExistingBusiness ? 'existing business' : 'new business'} onboarding.
          </p>
        </div>
      </div>
    </div>
  );
};
