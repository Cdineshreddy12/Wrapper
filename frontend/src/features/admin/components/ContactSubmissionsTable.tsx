import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Mail, Phone, Building2, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  jobTitle: string | null;
  companySize: string | null;
  preferredTime: string | null;
  comments: string | null;
  source: 'contact' | 'demo';
  createdAt: string;
}

interface ContactSubmissionsTableProps {
  source?: 'contact' | 'demo' | 'all';
}

export const ContactSubmissionsTable: React.FC<ContactSubmissionsTableProps> = ({ source = 'all' }) => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<'contact' | 'demo' | 'all'>(source);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/admin/dashboard/contact-submissions', {
        params: {
          source: selectedSource,
          limit: 100
        }
      });

      if (response.data.success) {
        setSubmissions(response.data.data.submissions || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch contact submissions');
      }
    } catch (err: any) {
      console.error('Failed to fetch contact submissions:', err);
      setError(err.response?.data?.error || 'Failed to load contact submissions');
      toast.error('Failed to load contact submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [selectedSource]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading contact submissions...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={fetchSubmissions} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contact Submissions</CardTitle>
              <CardDescription>
                View all contact form and demo requests from potential clients
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="flex gap-1 border rounded-md">
                <Button
                  variant={selectedSource === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedSource('all')}
                  className="rounded-r-none"
                >
                  All
                </Button>
                <Button
                  variant={selectedSource === 'contact' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedSource('contact')}
                  className="rounded-none"
                >
                  Contact
                </Button>
                <Button
                  variant={selectedSource === 'demo' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedSource('demo')}
                  className="rounded-l-none"
                >
                  Demo
                </Button>
              </div>
              <Button onClick={fetchSubmissions} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No contact submissions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {submission.source === 'demo' ? (
                            <Calendar className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Mail className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{submission.name}</h3>
                            <Badge variant={submission.source === 'demo' ? 'default' : 'secondary'}>
                              {submission.source === 'demo' ? 'Demo Request' : 'Contact Form'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <a href={`mailto:${submission.email}`} className="hover:text-foreground hover:underline">
                                {submission.email}
                              </a>
                            </div>
                            {submission.phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <a href={`tel:${submission.phone}`} className="hover:text-foreground hover:underline">
                                  {submission.phone}
                                </a>
                              </div>
                            )}
                            {submission.company && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span>{submission.company}</span>
                              </div>
                            )}
                            {submission.jobTitle && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>{submission.jobTitle}</span>
                              </div>
                            )}
                            {submission.companySize && (
                              <div className="text-muted-foreground">
                                <span className="font-medium">Company Size:</span> {submission.companySize}
                              </div>
                            )}
                            {submission.preferredTime && (
                              <div className="text-muted-foreground">
                                <span className="font-medium">Preferred Time:</span> {submission.preferredTime}
                              </div>
                            )}
                          </div>
                          {submission.comments && (
                            <div className="mt-3 p-3 bg-muted rounded-md">
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Comments:</span> {submission.comments}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(submission.createdAt)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
