import React from 'react';
import { FlowSelectorShowcase } from '@/components/forms/examples/FlowSelectorExamples';
import { FlowSelectorMultiStepExample } from '@/components/forms/examples/FlowSelectorMultiStepExample';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Grid3X3, 
  List, 
  Radio, 
  Settings, 
  Workflow,
  Code,
  BookOpen,
  Zap
} from 'lucide-react';

/**
 * Main demo page for FlowSelector component
 */
const FlowSelectorDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">FlowSelector Component</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            A flexible and accessible React component for selecting from a list of flow configurations. 
            Built with TypeScript, shadcn/ui, and modern React patterns.
          </p>
          
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Code className="w-3 h-3" />
              TypeScript
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              React 18
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              shadcn/ui
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Settings className="w-3 h-3" />
              Accessible
            </Badge>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Flexible Rendering</h3>
                  <p className="text-sm text-gray-600">
                    Default card UI or custom renderItem function for complete control over appearance.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Responsive Layout</h3>
                  <p className="text-sm text-gray-600">
                    Grid layout on desktop, adaptive columns, and mobile-friendly list view.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Accessibility First</h3>
                  <p className="text-sm text-gray-600">
                    Full keyboard navigation, ARIA roles, and screen reader support.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">TypeScript Support</h3>
                  <p className="text-sm text-gray-600">
                    Strongly typed with comprehensive interfaces and type safety.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Customizable</h3>
                  <p className="text-sm text-gray-600">
                    Extensive props for styling, behavior, and integration options.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Integration Ready</h3>
                  <p className="text-sm text-gray-600">
                    Works seamlessly with MultiStepForm and other form components.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Tabs */}
        <Tabs defaultValue="showcase" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="showcase" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Showcase</span>
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              <span className="hidden sm:inline">Integration</span>
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Examples</span>
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Custom</span>
            </TabsTrigger>
            <TabsTrigger value="radio" className="flex items-center gap-2">
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">Radio</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="showcase" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Component Showcase</h2>
              <p className="text-gray-600 mb-6">
                Explore different variants and layouts of the FlowSelector component.
              </p>
              <FlowSelectorShowcase />
            </div>
          </TabsContent>

          <TabsContent value="integration" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">MultiStepForm Integration</h2>
              <p className="text-gray-600 mb-6">
                See how FlowSelector integrates with MultiStepForm to create dynamic, 
                flow-based form experiences.
              </p>
              <FlowSelectorMultiStepExample />
            </div>
          </TabsContent>

          <TabsContent value="examples" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Usage Examples</h2>
              <p className="text-gray-600 mb-6">
                Practical examples showing how to use FlowSelector in different scenarios.
              </p>
              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`import { FlowSelector, FlowConfig } from '@/components/forms/components/FlowSelector';

const flows: FlowConfig[] = [
  {
    id: 'personal',
    name: 'Personal Account',
    description: 'Perfect for individuals',
    icon: <User className="w-6 h-6" />
  },
  // ... more flows
];

<FlowSelector
  flows={flows}
  onSelect={(flow) => console.log('Selected:', flow)}
  title="Choose Your Account Type"
  variant="grid"
  maxColumns={3}
/>`}
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Custom Renderer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const renderCustomItem = (flow, isSelected, onClick) => (
  <div className="custom-flow-item" onClick={onClick}>
    <h3>{flow.name}</h3>
    <p>{flow.description}</p>
    {isSelected && <CheckIcon />}
  </div>
);

<FlowSelector
  flows={flows}
  onSelect={handleSelect}
  renderItem={renderCustomItem}
/>`}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Custom Styling</h2>
              <p className="text-gray-600 mb-6">
                Learn how to customize the appearance and behavior of FlowSelector.
              </p>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Styling Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">CSS Classes</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <code>className</code> - Container styling</li>
                        <li>• <code>variant</code> - "grid" or "list" layout</li>
                        <li>• <code>maxColumns</code> - Maximum grid columns</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Custom Renderer</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <code>renderItem</code> - Complete control over item rendering</li>
                        <li>• Access to flow data, selection state, and click handler</li>
                        <li>• Use any UI components or custom markup</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="radio" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Radio Group Style</h2>
              <p className="text-gray-600 mb-6">
                Example of using FlowSelector with a custom radio group renderer.
              </p>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-sm text-gray-500 mb-4">
                  This example shows how to create a radio group-style selector using the custom renderItem prop.
                </p>
                <div className="text-center py-8 text-gray-400">
                  <Radio className="w-12 h-12 mx-auto mb-2" />
                  <p>Radio group example would be rendered here</p>
                  <p className="text-sm">See the "Showcase" tab for the full example</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FlowSelectorDemo;
