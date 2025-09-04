import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Building2, MapPin, User, Settings, Globe, DollarSign, Info, CheckCircle, AlertCircle, Save, ArrowRight, ArrowLeft, Home, Mail, Phone, Globe2, CreditCard } from 'lucide-react';

// Form sections
const FORM_SECTIONS = [
  {
    id: 'company-profile',
    title: 'Company Profile',
    icon: Building2,
    description: 'Basic company information and identification'
  },
  {
    id: 'contact-address',
    title: 'Contact & Address',
    icon: MapPin,
    description: 'Business location and contact details'
  },
  {
    id: 'localization',
    title: 'Localization & Regional',
    icon: Globe,
    description: 'Language, currency, and timezone settings'
  },
  {
    id: 'admin-setup',
    title: 'Administrator Setup',
    icon: User,
    description: 'Primary admin account configuration'
  }
];

// Industry options
const INDUSTRY_OPTIONS = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education',
  'Real Estate', 'Consulting', 'Media', 'Transportation', 'Energy', 'Non-Profit',
  'Government', 'Other'
];

// Company type options
const COMPANY_TYPE_OPTIONS = [
  'Prospect', 'Customer', 'Partner', 'Vendor', 'Competitor', 'Other'
];

// Ownership options
const OWNERSHIP_OPTIONS = [
  'Public', 'Private', 'Subsidiary', 'Joint Venture', 'Franchise', 'Other'
];

// Language options
const LANGUAGE_OPTIONS = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Other'
];

// Currency options
const CURRENCY_OPTIONS = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL', 'Other'
];

// Timezone options
const TIMEZONE_OPTIONS = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Other'
];

// Role options
const ROLE_OPTIONS = [
  'System Administrator', 'Standard User', 'Read Only', 'Custom Role'
];

interface OnboardingFormData {
  // Company Profile
  companyName: string;
  legalCompanyName: string;
  gstin: string;
  dunsNumber: string;
  industry: string;
  companyType: string;
  ownership: string;
  annualRevenue: string;
  numberOfEmployees: string;
  tickerSymbol: string;
  website: string;
  description: string;
  foundedDate: string;
  
  // Contact & Address
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  phone: string;
  fax: string;
  
  // Localization
  defaultLanguage: string;
  defaultLocale: string;
  defaultCurrency: string;
  multiCurrencyEnabled: boolean;
  advancedCurrencyManagement: boolean;
  defaultTimeZone: string;
  firstDayOfWeek: string; // Will be converted to number when sending to backend
  
  // Administrator Setup
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminUsername: string;
  adminAlias: string;
  adminPhone: string;
  adminMobile: string;
  adminTitle: string;
  adminDepartment: string;
  adminManager: string;
  adminRole: string;
  adminProfile: string;
}

const CompanyOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useKindeAuth();
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>({
    // Company Profile
    companyName: '',
    legalCompanyName: '',
    gstin: '',
    dunsNumber: '',
    industry: '',
    companyType: '',
    ownership: '',
    annualRevenue: '',
    numberOfEmployees: '',
    tickerSymbol: '',
    website: '',
    description: '',
    foundedDate: '',
    
    // Contact & Address
    billingStreet: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    billingCountry: '',
    shippingStreet: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    shippingCountry: '',
    phone: '',
    fax: '',
    
    // Localization
    defaultLanguage: 'English',
    defaultLocale: 'en_US',
    defaultCurrency: 'USD',
    multiCurrencyEnabled: false,
    advancedCurrencyManagement: false,
    defaultTimeZone: 'UTC',
    firstDayOfWeek: '1',
    
    // Administrator Setup
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminUsername: '',
    adminAlias: '',
    adminPhone: '',
    adminMobile: '',
    adminTitle: '',
    adminDepartment: '',
    adminManager: '',
    adminRole: 'System Administrator',
    adminProfile: 'System Administrator'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showGSTINModal, setShowGSTINModal] = useState(false);
  const [gstinValidationResult, setGstinValidationResult] = useState<any>(null);



  // Load saved form data on component mount
  useEffect(() => {
    loadFormProgress();
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        adminEmail: user.email || '',
        adminUsername: user.email || ''
      }));
    }
  }, [user]);

  // Calculate progress
  useEffect(() => {
    const totalFields = Object.keys(formData).length;
    const filledFields = Object.values(formData).filter(value => 
      value !== '' && value !== false
    ).length;
    setProgress((filledFields / totalFields) * 100);
  }, [formData]);

  // Debug: Log form data changes
  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);

  const loadFormProgress = () => {
    try {
      const saved = localStorage.getItem('company-onboarding-progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(parsed.formData || formData);
        setCurrentSection(parsed.currentSection || 0);
      }
    } catch (error) {
      console.error('Error loading form progress:', error);
    }
  };

  const saveFormProgress = () => {
    try {
      localStorage.setItem('company-onboarding-progress', JSON.stringify({
        formData,
        currentSection,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error saving form progress:', error);
    }
  };

  const validateGSTIN = async (gstin: string) => {
    if (!gstin || gstin.length !== 15) {
      toast.error('Please enter a valid 15-digit GSTIN');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/onboarding/validate-gstin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gstin: gstin.toUpperCase() }),
      });

      const result = await response.json();

      if (result.success && result.data.isValid) {
        toast.success('GSTIN validated successfully!');
        
        // Store the validation result and show modal
        setGstinValidationResult(result.data);
        setShowGSTINModal(true);
        
        // Auto-fill company details if available
        if (result.data.companyDetails) {
          const details = result.data.companyDetails;
          
          // Safely parse the date
          let parsedDate = '';
          if (details.registrationDate) {
            try {
              // Handle DD/MM/YYYY format
              const dateParts = details.registrationDate.split('/');
              if (dateParts.length === 3) {
                const day = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
                const year = parseInt(dateParts[2]);
                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) {
                  parsedDate = date.toISOString().split('T')[0];
                }
              }
            } catch (dateError) {
              console.warn('Could not parse registration date:', details.registrationDate);
            }
          }
          
          const updatedFormData = {
            ...formData,
            companyName: details.companyName || formData.companyName,
            legalCompanyName: details.legalCompanyName || formData.legalCompanyName,
            companyType: details.businessType || formData.companyType,
            billingStreet: details.address.street || formData.billingStreet,
            billingCity: details.address.city || formData.billingCity,
            billingState: details.address.state || formData.billingState,
            billingZip: details.address.pincode || formData.billingZip,
            foundedDate: parsedDate || formData.foundedDate,

          };

          console.log('Current form data:', formData);
          console.log('Updated form data:', updatedFormData);
          
          setFormData(updatedFormData);

          // Debug log to see what's being set
          console.log('Auto-filling form with GSTIN data:', {
            companyName: details.companyName,
            legalCompanyName: details.legalCompanyName,
            companyType: details.businessType,
            foundedDate: parsedDate,
            address: details.address
          });
          
          toast.success('Company details auto-filled from GSTIN!');
        }
      } else {
        toast.error(result.data?.error || 'GSTIN validation failed');
      }
    } catch (error) {
      console.error('GSTIN validation error:', error);
      toast.error('Failed to validate GSTIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof OnboardingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Auto-save progress
    setTimeout(saveFormProgress, 500);
  };

  const handleNext = () => {
    if (currentSection < FORM_SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
      saveFormProgress();
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      saveFormProgress();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Validate required fields
      const requiredFields = [
        'companyName', 'industry', 'companyType', 'defaultLanguage',
        'defaultCurrency', 'defaultTimeZone', 'adminFirstName', 'adminLastName',
        'adminEmail', 'adminUsername', 'adminRole', 'adminProfile'
      ];

      const missingFields = requiredFields.filter(field => !formData[field as keyof OnboardingFormData]);
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Submit form data to backend
      const response = await fetch('/api/onboarding/company-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Clear saved progress
        localStorage.removeItem('company-onboarding-progress');
        toast.success('Company setup completed successfully!');
        navigate('/dashboard');
      } else {
        throw new Error('Failed to submit company setup');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit company setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCompanyProfileSection = () => (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Fill in your company's basic information. Required fields are marked with an asterisk (*).
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="companyName" className="flex items-center gap-2">
            Company Name <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Input
            id="companyName"
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            placeholder="Enter company name"
            maxLength={80}
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            3-80 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="legalCompanyName" className="flex items-center gap-2">
            Legal Company Name <Info className="h-3 w-3 text-gray-400" />
          </Label>
          <Input
            id="legalCompanyName"
            value={formData.legalCompanyName}
            onChange={(e) => handleInputChange('legalCompanyName', e.target.value)}
            placeholder="Legal entity name"
            maxLength={255}
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Used for contracts and legal documents</p>
        </div>



        <div className="space-y-2">
          <Label htmlFor="gstin" className="flex items-center gap-2">
            GSTIN <Info className="h-3 w-3 text-gray-400" />
          </Label>
          <div className="flex gap-2">
            <Input
              id="gstin"
              value={formData.gstin}
              onChange={(e) => handleInputChange('gstin', e.target.value)}
              placeholder="15-digit GSTIN"
              maxLength={15}
              className="focus:ring-2 focus:ring-blue-500 font-mono uppercase"
              style={{ textTransform: 'uppercase' }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => validateGSTIN(formData.gstin)}
              disabled={!formData.gstin || formData.gstin.length !== 15}
              className="whitespace-nowrap"
            >
              Validate
            </Button>
          </div>
          <p className="text-xs text-gray-500">15-digit GST identification number</p>
          {formData.gstin && formData.gstin.length === 15 && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Ready to validate
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dunsNumber" className="flex items-center gap-2">
            D-U-N-S Number <Info className="h-3 w-3 text-gray-400" />
          </Label>
          <Input
            id="dunsNumber"
            value={formData.dunsNumber}
            onChange={(e) => handleInputChange('dunsNumber', e.target.value)}
            placeholder="9-digit format"
            pattern="[0-9]{9}"
            className="focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <p className="text-xs text-gray-500">9-digit business verification number</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry" className="flex items-center gap-2">
            Industry <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
            <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((industry) => (
                <SelectItem key={industry} value={industry}>{industry}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyType" className="flex items-center gap-2">
            Company Type <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Select value={formData.companyType} onValueChange={(value) => handleInputChange('companyType', value)}>
            <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Select company type" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownership" className="flex items-center gap-2">
            Ownership <Info className="h-3 w-3 text-gray-400" />
          </Label>
          <Select value={formData.ownership} onValueChange={(value) => handleInputChange('ownership', value)}>
            <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Select ownership structure" />
            </SelectTrigger>
            <SelectContent>
              {OWNERSHIP_OPTIONS.map((ownership) => (
                <SelectItem key={ownership} value={ownership}>{ownership}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Company ownership structure</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="annualRevenue" className="flex items-center gap-2">
            Annual Revenue <DollarSign className="h-3 w-3 text-green-600" />
          </Label>
          <Input
            id="annualRevenue"
            type="number"
            value={formData.annualRevenue}
            onChange={(e) => handleInputChange('annualRevenue', e.target.value)}
            placeholder="Enter annual revenue"
            min="0"
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Annual revenue in USD</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="numberOfEmployees" className="flex items-center gap-2">
            Number of Employees <User className="h-3 w-3 text-blue-600" />
          </Label>
          <Input
            id="numberOfEmployees"
            type="number"
            value={formData.numberOfEmployees}
            onChange={(e) => handleInputChange('numberOfEmployees', e.target.value)}
            placeholder="1-999999"
            min="1"
            max="999999"
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Total number of employees</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tickerSymbol" className="flex items-center gap-2">
            Ticker Symbol <Building2 className="h-3 w-3 text-purple-600" />
          </Label>
          <Input
            id="tickerSymbol"
            value={formData.tickerSymbol}
            onChange={(e) => handleInputChange('tickerSymbol', e.target.value)}
            placeholder="Stock exchange symbol"
            className="focus:ring-2 focus:ring-blue-500 font-mono uppercase"
          />
          <p className="text-xs text-gray-500">Stock exchange ticker symbol</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website" className="flex items-center gap-2">
            Website <Globe className="h-3 w-3 text-blue-600" />
          </Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="https://example.com"
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Company website URL</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="foundedDate" className="flex items-center gap-2">
            Founded Date <CalendarIcon className="h-3 w-3 text-orange-600" />
          </Label>
          <Input
            id="foundedDate"
            type="date"
            value={formData.foundedDate}
            onChange={(e) => handleInputChange('foundedDate', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">When the company was established</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="flex items-center gap-2">
          Company Description <Info className="h-3 w-3 text-gray-400" />
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Brief company overview, mission, and key highlights..."
          maxLength={32000}
          rows={4}
          className="focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Brief company overview and mission</span>
          <span>{formData.description.length}/32,000 characters</span>
        </div>
      </div>
    </div>
  );

  const renderContactAddressSection = () => (
    <div className="space-y-6">
      <Alert className="border-green-200 bg-green-50">
        <Home className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Provide your business address information for billing and shipping purposes.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Billing Address</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="billingStreet">Billing Street</Label>
            <Textarea
              id="billingStreet"
              value={formData.billingStreet}
              onChange={(e) => handleInputChange('billingStreet', e.target.value)}
              placeholder="Street address"
              maxLength={255}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingCity">Billing City</Label>
            <Input
              id="billingCity"
              value={formData.billingCity}
              onChange={(e) => handleInputChange('billingCity', e.target.value)}
              placeholder="City"
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingState">Billing State/Province</Label>
            <Input
              id="billingState"
              value={formData.billingState}
              onChange={(e) => handleInputChange('billingState', e.target.value)}
              placeholder="State/Province"
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingZip">Billing Zip/Postal Code</Label>
            <Input
              id="billingZip"
              value={formData.billingZip}
              onChange={(e) => handleInputChange('billingZip', e.target.value)}
              placeholder="Zip/Postal Code"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingCountry">Billing Country</Label>
            <Input
              id="billingCountry"
              value={formData.billingCountry}
              onChange={(e) => handleInputChange('billingCountry', e.target.value)}
              placeholder="Country"
              maxLength={80}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="shippingStreet">Shipping Street</Label>
            <Textarea
              id="shippingStreet"
              value={formData.shippingStreet}
              onChange={(e) => handleInputChange('shippingStreet', e.target.value)}
              placeholder="Street address"
              maxLength={255}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingCity">Shipping City</Label>
            <Input
              id="shippingCity"
              value={formData.shippingCity}
              onChange={(e) => handleInputChange('shippingCity', e.target.value)}
              placeholder="City"
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingState">Shipping State/Province</Label>
            <Input
              id="shippingState"
              value={formData.shippingState}
              onChange={(e) => handleInputChange('shippingState', e.target.value)}
              placeholder="State/Province"
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingZip">Shipping Zip/Postal Code</Label>
            <Input
              id="shippingZip"
              value={formData.shippingZip}
              onChange={(e) => handleInputChange('shippingZip', e.target.value)}
              placeholder="Zip/Postal Code"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingCountry">Shipping Country</Label>
            <Input
              id="shippingCountry"
              value={formData.shippingCountry}
              onChange={(e) => handleInputChange('shippingCountry', e.target.value)}
              placeholder="Country"
              maxLength={80}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            Phone <Phone className="h-3 w-3 text-green-600" />
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Primary business phone number</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fax" className="flex items-center gap-2">
            Fax <Phone className="h-3 w-3 text-gray-600" />
          </Label>
          <Input
            id="fax"
            type="tel"
            value={formData.fax}
            onChange={(e) => handleInputChange('fax', e.target.value)}
            placeholder="+1 (555) 123-4568"
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Business fax number</p>
        </div>
      </div>
    </div>
  );

  const renderLocalizationSection = () => (
    <div className="space-y-6">
      <Alert className="border-purple-200 bg-purple-50">
        <Globe2 className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          Configure your company's regional settings for language, currency, and timezone preferences.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="defaultLanguage">Default Language *</Label>
          <Select value={formData.defaultLanguage} onValueChange={(value) => handleInputChange('defaultLanguage', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((language) => (
                <SelectItem key={language} value={language}>{language}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultLocale">Default Locale *</Label>
          <Select value={formData.defaultLocale} onValueChange={(value) => handleInputChange('defaultLocale', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select locale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en_US">English (US)</SelectItem>
              <SelectItem value="en_GB">English (UK)</SelectItem>
              <SelectItem value="es_ES">Spanish (Spain)</SelectItem>
              <SelectItem value="fr_FR">French (France)</SelectItem>
              <SelectItem value="de_DE">German (Germany)</SelectItem>
              <SelectItem value="it_IT">Italian (Italy)</SelectItem>
              <SelectItem value="pt_BR">Portuguese (Brazil)</SelectItem>
              <SelectItem value="ja_JP">Japanese (Japan)</SelectItem>
              <SelectItem value="ko_KR">Korean (Korea)</SelectItem>
              <SelectItem value="zh_CN">Chinese (Simplified)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultCurrency">Default Currency *</Label>
          <Select value={formData.defaultCurrency} onValueChange={(value) => handleInputChange('defaultCurrency', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((currency) => (
                <SelectItem key={currency} value={currency}>{currency}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultTimeZone">Default Time Zone *</Label>
          <Select value={formData.defaultTimeZone} onValueChange={(value) => handleInputChange('defaultTimeZone', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
                              {TIMEZONE_OPTIONS.map((timezone) => (
                  <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="firstDayOfWeek">First Day of Week</Label>
          <Select value={formData.firstDayOfWeek} onValueChange={(value) => handleInputChange('firstDayOfWeek', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select first day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="7">Sunday</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="multiCurrencyEnabled"
            checked={formData.multiCurrencyEnabled}
            onCheckedChange={(checked) => handleInputChange('multiCurrencyEnabled', checked)}
          />
          <Label htmlFor="multiCurrencyEnabled">Enable Multi-Currency</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="advancedCurrencyManagement"
            checked={formData.advancedCurrencyManagement}
            onCheckedChange={(checked) => handleInputChange('advancedCurrencyManagement', checked)}
            disabled={!formData.multiCurrencyEnabled}
          />
          <Label htmlFor="advancedCurrencyManagement">Advanced Currency Management</Label>
        </div>
      </div>
    </div>
  );


  const renderAdminSetupSection = () => (
    <div className="space-y-6">
      <Alert className="border-orange-200 bg-orange-50">
        <User className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          Set up your primary administrator account with appropriate permissions and access levels.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="adminFirstName" className="flex items-center gap-2">
            First Name <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Input
            id="adminFirstName"
            value={formData.adminFirstName}
            onChange={(e) => handleInputChange("adminFirstName", e.target.value)}
            placeholder="First name"
            maxLength={40}
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Administrator's first name</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminLastName" className="flex items-center gap-2">
            Last Name <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Input
            id="adminLastName"
            value={formData.adminLastName}
            onChange={(e) => handleInputChange("adminLastName", e.target.value)}
            placeholder="Last name"
            maxLength={80}
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Administrator's last name</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminEmail" className="flex items-center gap-2">
            Email <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Input
            id="adminEmail"
            type="email"
            value={formData.adminEmail}
            onChange={(e) => handleInputChange("adminEmail", e.target.value)}
            placeholder="admin@company.com"
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Primary contact email</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminUsername" className="flex items-center gap-2">
            Username <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Input
            id="adminUsername"
            value={formData.adminUsername}
            onChange={(e) => handleInputChange("adminUsername", e.target.value)}
            placeholder="Username (email format)"
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Login username</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminAlias" className="flex items-center gap-2">
            Alias <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Input
            id="adminAlias"
            value={formData.adminAlias}
            onChange={(e) => handleInputChange("adminAlias", e.target.value)}
            placeholder="8 characters max"
            maxLength={8}
            className="focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <p className="text-xs text-gray-500">Short identifier (max 8 chars)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminPhone" className="flex items-center gap-2">
            Phone <Phone className="h-3 w-3 text-gray-600" />
          </Label>
          <Input
            id="adminPhone"
            type="tel"
            value={formData.adminPhone}
            onChange={(e) => handleInputChange("adminPhone", e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Office phone number</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminMobile" className="flex items-center gap-2">
            Mobile <Phone className="h-3 w-3 text-green-600" />
          </Label>
          <Input
            id="adminMobile"
            type="tel"
            value={formData.adminMobile}
            onChange={(e) => handleInputChange("adminMobile", e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Mobile phone number</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminTitle" className="flex items-center gap-2">
            Title <User className="h-3 w-3 text-blue-600" />
          </Label>
          <Input
            id="adminTitle"
            value={formData.adminTitle}
            onChange={(e) => handleInputChange("adminTitle", e.target.value)}
            placeholder="Job title"
            maxLength={80}
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Administrator's job title</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminDepartment" className="flex items-center gap-2">
            Department <Building2 className="h-3 w-3 text-purple-600" />
          </Label>
          <Input
            id="adminDepartment"
            value={formData.adminDepartment}
            onChange={(e) => handleInputChange("adminDepartment", e.target.value)}
            placeholder="Department"
            maxLength={80}
            className="focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Department or division</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminRole" className="flex items-center gap-2">
            Role <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Select value={formData.adminRole} onValueChange={(value) => handleInputChange("adminRole", value)}>
            <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Administrator's role in the system</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminProfile" className="flex items-center gap-2">
            Profile <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Select value={formData.adminProfile} onValueChange={(value) => handleInputChange("adminProfile", value)}>
            <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="System Administrator">System Administrator</SelectItem>
              <SelectItem value="Standard User">Standard User</SelectItem>
              <SelectItem value="Read Only">Read Only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Access level and permissions</p>
        </div>
      </div>
    </div>
  );
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return renderCompanyProfileSection();
      case 1:
        return renderContactAddressSection();
      case 2:
        return renderLocalizationSection();
      case 3:
        return renderAdminSetupSection();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Company Onboarding</h1>
          </div>
          <p className="text-xl text-gray-600 mb-4">Complete your company profile to get started</p>
          
          {/* Completion Status */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}% Complete
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-semibold text-gray-700">Form Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Completion</span>
              <Badge variant="outline" className="text-sm font-medium">
                {Math.round(progress)}%
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="h-3 bg-gray-200" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Started</span>
            <span>In Progress</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Section Navigation */}
        <Tabs value={currentSection.toString()} onValueChange={(value) => setCurrentSection(parseInt(value))} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            {FORM_SECTIONS.map((section, index) => (
              <TabsTrigger 
                key={section.id} 
                value={index.toString()}
                className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <section.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{section.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Current Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {React.createElement(FORM_SECTIONS[currentSection].icon, { className: "w-6 h-4" })}
              <span>{FORM_SECTIONS[currentSection].title}</span>
            </CardTitle>
            <CardDescription>{FORM_SECTIONS[currentSection].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderCurrentSection()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSection === 0}
            className="px-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={() => {
                saveFormProgress();
                toast.success('Progress saved! You can continue later.');
              }}
              className="px-6 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Progress
            </Button>

            {currentSection === FORM_SECTIONS.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-8 bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="px-6 bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1">
              Step {currentSection + 1} of {FORM_SECTIONS.length}
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            {FORM_SECTIONS[currentSection].title} • {FORM_SECTIONS[currentSection].description}
          </p>
        </div>
      </div>

      {/* GSTIN Validation Modal */}
      {showGSTINModal && gstinValidationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  GSTIN Validation Results
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGSTINModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-3">Company Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Trade Name:</span>
                      <p className="text-gray-900">{gstinValidationResult.companyDetails?.companyName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Legal Name:</span>
                      <p className="text-gray-900">{gstinValidationResult.companyDetails?.legalCompanyName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Business Type:</span>
                      <p className="text-gray-900">{gstinValidationResult.companyDetails?.businessType}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        {gstinValidationResult.companyDetails?.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Registration Date:</span>
                      <p className="text-gray-900">{gstinValidationResult.companyDetails?.registrationDate}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">GSTIN:</span>
                      <p className="text-gray-900 font-mono">{gstinValidationResult.companyDetails?.gstin}</p>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                {gstinValidationResult.companyDetails?.address && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-3">Registered Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Street:</span>
                        <p className="text-gray-900">{gstinValidationResult.companyDetails.address.street}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">City:</span>
                        <p className="text-gray-900">{gstinValidationResult.companyDetails.address.city}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">State:</span>
                        <p className="text-gray-900">{gstinValidationResult.companyDetails.address.state}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Pincode:</span>
                        <p className="text-gray-900">{gstinValidationResult.companyDetails.address.pincode}</p>
                      </div>
                      {gstinValidationResult.companyDetails.address.building && (
                        <div>
                          <span className="font-medium text-gray-700">Building:</span>
                          <p className="text-gray-900">{gstinValidationResult.companyDetails.address.building}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Nature of Business */}
                {gstinValidationResult.companyDetails?.nature && gstinValidationResult.companyDetails.nature.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-800 mb-3">Nature of Business</h3>
                    <div className="flex flex-wrap gap-2">
                      {gstinValidationResult.companyDetails.nature.map((nature: string, index: number) => (
                        <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                          {nature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tax Information */}
                {gstinValidationResult.validationDetails?.taxType && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-800 mb-3">Tax Information</h3>
                    <p className="text-sm text-gray-900">{gstinValidationResult.validationDetails.taxType}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => setShowGSTINModal(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowGSTINModal(false);
                      toast.success('Company details have been auto-filled!');
                    }}
                    className="flex-1"
                  >
                    Use These Details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  // GSTIN Validation Modal
  const renderGSTINModal = () => {
    if (!showGSTINModal || !gstinValidationResult) return null;

    const details = gstinValidationResult.companyDetails;
    const validation = gstinValidationResult.validationDetails;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                GSTIN Validation Results
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGSTINModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-6">
              {/* Company Information */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Trade Name:</span>
                    <p className="text-gray-900">{details.tradeName || details.companyName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Legal Name:</span>
                    <p className="text-gray-900">{details.legalCompanyName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Business Type:</span>
                    <p className="text-gray-900">{details.businessType}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      details.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {details.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Registration Date:</span>
                    <p className="text-gray-900">{details.registrationDate}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">GSTIN:</span>
                    <p className="text-gray-900 font-mono">{details.gstin}</p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              {details.address && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Registered Address
                  </h3>
                  <div className="text-sm space-y-2">
                    <p className="text-gray-900">
                      {details.address.street && `${details.address.street}, `}
                      {details.address.building && `${details.address.building}, `}
                      {details.address.city && `${details.address.city}, `}
                      {details.address.state && `${details.address.state} `}
                      {details.address.pincode && `${details.address.pincode}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Nature of Business */}
              {details.nature && details.nature.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Nature of Business
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {details.nature.map((nature: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                        {nature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tax Information */}
              {validation.taxType && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Tax Information
                  </h3>
                  <p className="text-sm text-gray-900">{validation.taxType}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => setShowGSTINModal(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGSTINModal(false);
                    toast.success('Company details have been auto-filled!');
                  }}
                  className="flex-1"
                >
                  Use These Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default CompanyOnboarding;
