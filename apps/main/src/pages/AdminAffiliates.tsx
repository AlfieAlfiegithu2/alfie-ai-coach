import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Eye, Save, X, Users, Tag, DollarSign, TrendingUp, Loader2, Copy, Check, Building2, User } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  type: 'individual' | 'organization';
  commission_percent: number;
  status: 'active' | 'inactive';
  contact_person: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  codes_count?: number;
  total_referrals?: number;
  total_commission?: number;
}

interface AffiliateCode {
  id: string;
  affiliate_id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  currency: string;
  max_redemptions: number | null;
  current_redemptions: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminAffiliates = () => {
  const navigate = useNavigate();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('affiliates');
  
  // Affiliate form state
  const [isCreatingAffiliate, setIsCreatingAffiliate] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [affiliateForm, setAffiliateForm] = useState({
    name: '',
    email: '',
    type: 'individual' as 'individual' | 'organization',
    commission_percent: 10,
    contact_person: '',
    phone: '',
    notes: '',
  });
  const [savingAffiliate, setSavingAffiliate] = useState(false);

  // Code form state
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [affiliateCodes, setAffiliateCodes] = useState<AffiliateCode[]>([]);
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [codeForm, setCodeForm] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: 10,
    currency: 'usd',
    max_redemptions: '',
    expires_at: '',
  });
  const [savingCode, setSavingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    activeAffiliates: 0,
    totalReferrals: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    loadAffiliates();
  }, []);

  useEffect(() => {
    if (selectedAffiliate) {
      loadAffiliateCodes(selectedAffiliate.id);
    }
  }, [selectedAffiliate]);

  const loadAffiliates = async () => {
    try {
      setLoading(true);
      
      // Load affiliates with aggregated data
      const { data: affiliatesData, error } = await supabase
        .from('affiliates')
        .select(`
          *,
          affiliate_codes(count),
          affiliate_referrals(
            commission_amount
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process affiliates with stats
      const processedAffiliates = (affiliatesData || []).map((aff: any) => ({
        ...aff,
        codes_count: aff.affiliate_codes?.[0]?.count || 0,
        total_referrals: aff.affiliate_referrals?.length || 0,
        total_commission: aff.affiliate_referrals?.reduce((sum: number, ref: any) => sum + (ref.commission_amount || 0), 0) || 0,
      }));

      setAffiliates(processedAffiliates);

      // Calculate stats
      setStats({
        totalAffiliates: processedAffiliates.length,
        activeAffiliates: processedAffiliates.filter((a: Affiliate) => a.status === 'active').length,
        totalReferrals: processedAffiliates.reduce((sum: number, a: Affiliate) => sum + (a.total_referrals || 0), 0),
        totalCommission: processedAffiliates.reduce((sum: number, a: Affiliate) => sum + (a.total_commission || 0), 0),
      });

    } catch (error) {
      console.error('Error loading affiliates:', error);
      toast.error('Failed to load affiliates');
    } finally {
      setLoading(false);
    }
  };

  const loadAffiliateCodes = async (affiliateId: string) => {
    try {
      const { data, error } = await supabase
        .from('affiliate_codes')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAffiliateCodes(data || []);
    } catch (error) {
      console.error('Error loading codes:', error);
      toast.error('Failed to load affiliate codes');
    }
  };

  const handleSaveAffiliate = async () => {
    if (!affiliateForm.name || !affiliateForm.email) {
      toast.error('Name and email are required');
      return;
    }

    setSavingAffiliate(true);
    try {
      if (editingAffiliate) {
        // Update existing
        const { error } = await supabase
          .from('affiliates')
          .update({
            name: affiliateForm.name,
            email: affiliateForm.email,
            type: affiliateForm.type,
            commission_percent: affiliateForm.commission_percent,
            contact_person: affiliateForm.contact_person || null,
            phone: affiliateForm.phone || null,
            notes: affiliateForm.notes || null,
          })
          .eq('id', editingAffiliate.id);

        if (error) throw error;
        toast.success('Affiliate updated');
      } else {
        // Create new
        const { error } = await supabase
          .from('affiliates')
          .insert({
            name: affiliateForm.name,
            email: affiliateForm.email,
            type: affiliateForm.type,
            commission_percent: affiliateForm.commission_percent,
            contact_person: affiliateForm.contact_person || null,
            phone: affiliateForm.phone || null,
            notes: affiliateForm.notes || null,
            status: 'active',
          });

        if (error) throw error;
        toast.success('Affiliate created');
      }

      setIsCreatingAffiliate(false);
      setEditingAffiliate(null);
      resetAffiliateForm();
      loadAffiliates();
    } catch (error: any) {
      console.error('Error saving affiliate:', error);
      toast.error(error.message || 'Failed to save affiliate');
    } finally {
      setSavingAffiliate(false);
    }
  };

  const handleDeleteAffiliate = async (affiliate: Affiliate) => {
    try {
      const { error } = await supabase
        .from('affiliates')
        .delete()
        .eq('id', affiliate.id);

      if (error) throw error;
      toast.success('Affiliate deleted');
      loadAffiliates();
    } catch (error: any) {
      console.error('Error deleting affiliate:', error);
      toast.error(error.message || 'Failed to delete affiliate');
    }
  };

  const handleToggleAffiliateStatus = async (affiliate: Affiliate) => {
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ status: affiliate.status === 'active' ? 'inactive' : 'active' })
        .eq('id', affiliate.id);

      if (error) throw error;
      toast.success(`Affiliate ${affiliate.status === 'active' ? 'deactivated' : 'activated'}`);
      loadAffiliates();
    } catch (error: any) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleCreateCode = async () => {
    if (!selectedAffiliate || !codeForm.code) {
      toast.error('Code is required');
      return;
    }

    setSavingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-affiliate-code', {
        body: {
          affiliateId: selectedAffiliate.id,
          code: codeForm.code.toUpperCase(),
          discountType: codeForm.discount_type,
          discountValue: codeForm.discount_value,
          currency: codeForm.currency,
          maxRedemptions: codeForm.max_redemptions ? parseInt(codeForm.max_redemptions) : undefined,
          expiresAt: codeForm.expires_at || undefined,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create code');

      toast.success('Promo code created');
      setIsCreatingCode(false);
      resetCodeForm();
      loadAffiliateCodes(selectedAffiliate.id);
    } catch (error: any) {
      console.error('Error creating code:', error);
      toast.error(error.message || 'Failed to create code');
    } finally {
      setSavingCode(false);
    }
  };

  const handleToggleCodeStatus = async (code: AffiliateCode) => {
    try {
      const { error } = await supabase
        .from('affiliate_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id);

      if (error) throw error;
      toast.success(`Code ${code.is_active ? 'deactivated' : 'activated'}`);
      if (selectedAffiliate) {
        loadAffiliateCodes(selectedAffiliate.id);
      }
    } catch (error: any) {
      console.error('Error toggling code:', error);
      toast.error('Failed to update code');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success('Code copied!');
  };

  const resetAffiliateForm = () => {
    setAffiliateForm({
      name: '',
      email: '',
      type: 'individual',
      commission_percent: 10,
      contact_person: '',
      phone: '',
      notes: '',
    });
  };

  const resetCodeForm = () => {
    setCodeForm({
      code: '',
      discount_type: 'percent',
      discount_value: 10,
      currency: 'usd',
      max_redemptions: '',
      expires_at: '',
    });
  };

  const startEditAffiliate = (affiliate: Affiliate) => {
    setEditingAffiliate(affiliate);
    setAffiliateForm({
      name: affiliate.name,
      email: affiliate.email,
      type: affiliate.type,
      commission_percent: affiliate.commission_percent,
      contact_person: affiliate.contact_person || '',
      phone: affiliate.phone || '',
      notes: affiliate.notes || '',
    });
    setIsCreatingAffiliate(true);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCodeForm({ ...codeForm, code });
  };

  return (
    <AdminLayout 
      title="Affiliate Management" 
      description="Manage affiliates, promo codes, and track referrals"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Affiliates</p>
                <p className="text-2xl font-bold">{stats.totalAffiliates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Affiliates</p>
                <p className="text-2xl font-bold">{stats.activeAffiliates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{stats.totalReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Commission</p>
                <p className="text-2xl font-bold">${stats.totalCommission.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="codes" disabled={!selectedAffiliate}>
            Codes {selectedAffiliate && `(${selectedAffiliate.name})`}
          </TabsTrigger>
        </TabsList>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Affiliates</CardTitle>
                <CardDescription>Manage your affiliate partners</CardDescription>
              </div>
              <Button onClick={() => { resetAffiliateForm(); setEditingAffiliate(null); setIsCreatingAffiliate(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Affiliate
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : affiliates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No affiliates yet. Create your first affiliate to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Codes</TableHead>
                      <TableHead>Referrals</TableHead>
                      <TableHead>Earned</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((affiliate) => (
                      <TableRow key={affiliate.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{affiliate.name}</p>
                            <p className="text-sm text-muted-foreground">{affiliate.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {affiliate.type === 'organization' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {affiliate.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{affiliate.commission_percent}%</TableCell>
                        <TableCell>{affiliate.codes_count || 0}</TableCell>
                        <TableCell>{affiliate.total_referrals || 0}</TableCell>
                        <TableCell>${(affiliate.total_commission || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'}>
                            {affiliate.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedAffiliate(affiliate);
                                setCurrentTab('codes');
                              }}
                            >
                              <Tag className="w-4 h-4 mr-1" /> Codes
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/admin/affiliates/${affiliate.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => startEditAffiliate(affiliate)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleToggleAffiliateStatus(affiliate)}
                            >
                              {affiliate.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Affiliate?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will delete the affiliate and all their codes. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteAffiliate(affiliate)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Codes Tab */}
        <TabsContent value="codes">
          {selectedAffiliate && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Promo Codes for {selectedAffiliate.name}</CardTitle>
                  <CardDescription>Commission rate: {selectedAffiliate.commission_percent}%</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setSelectedAffiliate(null); setCurrentTab('affiliates'); }}>
                    <X className="w-4 h-4 mr-2" /> Close
                  </Button>
                  <Button onClick={() => { resetCodeForm(); setIsCreatingCode(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Create Code
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {affiliateCodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No codes yet. Create a promo code for this affiliate.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Redemptions</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {affiliateCodes.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded font-mono text-sm">{code.code}</code>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(code.code)}
                              >
                                {copiedCode === code.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {code.discount_type === 'percent' 
                              ? `${code.discount_value}% off`
                              : `$${code.discount_value} off`
                            }
                          </TableCell>
                          <TableCell>
                            {code.current_redemptions} / {code.max_redemptions || '∞'}
                          </TableCell>
                          <TableCell>
                            {code.expires_at 
                              ? new Date(code.expires_at).toLocaleDateString()
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={code.is_active ? 'default' : 'secondary'}>
                              {code.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleToggleCodeStatus(code)}
                            >
                              {code.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Affiliate Dialog */}
      <Dialog open={isCreatingAffiliate} onOpenChange={setIsCreatingAffiliate}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingAffiliate ? 'Edit Affiliate' : 'Create Affiliate'}</DialogTitle>
            <DialogDescription>
              {editingAffiliate ? 'Update affiliate details' : 'Add a new affiliate partner'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input 
                  id="name"
                  value={affiliateForm.name}
                  onChange={(e) => setAffiliateForm({ ...affiliateForm, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email"
                  type="email"
                  value={affiliateForm.email}
                  onChange={(e) => setAffiliateForm({ ...affiliateForm, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={affiliateForm.type} 
                  onValueChange={(v) => setAffiliateForm({ ...affiliateForm, type: v as 'individual' | 'organization' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Commission %</Label>
                <Input 
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  value={affiliateForm.commission_percent}
                  onChange={(e) => setAffiliateForm({ ...affiliateForm, commission_percent: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            {affiliateForm.type === 'organization' && (
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Person</Label>
                <Input 
                  id="contact"
                  value={affiliateForm.contact_person}
                  onChange={(e) => setAffiliateForm({ ...affiliateForm, contact_person: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone"
                value={affiliateForm.phone}
                onChange={(e) => setAffiliateForm({ ...affiliateForm, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input 
                id="notes"
                value={affiliateForm.notes}
                onChange={(e) => setAffiliateForm({ ...affiliateForm, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingAffiliate(false)}>Cancel</Button>
            <Button onClick={handleSaveAffiliate} disabled={savingAffiliate}>
              {savingAffiliate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingAffiliate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Code Dialog */}
      <Dialog open={isCreatingCode} onOpenChange={setIsCreatingCode}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>
              Create a new promo code for {selectedAffiliate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <div className="flex gap-2">
                <Input 
                  id="code"
                  value={codeForm.code}
                  onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2024"
                  className="font-mono"
                />
                <Button variant="outline" onClick={generateRandomCode}>Generate</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount_type">Discount Type</Label>
                <Select 
                  value={codeForm.discount_type} 
                  onValueChange={(v) => setCodeForm({ ...codeForm, discount_type: v as 'percent' | 'fixed' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  {codeForm.discount_type === 'percent' ? 'Discount %' : 'Discount Amount ($)'}
                </Label>
                <Input 
                  id="discount_value"
                  type="number"
                  min="0"
                  value={codeForm.discount_value}
                  onChange={(e) => setCodeForm({ ...codeForm, discount_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_redemptions">Max Redemptions (optional)</Label>
                <Input 
                  id="max_redemptions"
                  type="number"
                  min="1"
                  value={codeForm.max_redemptions}
                  onChange={(e) => setCodeForm({ ...codeForm, max_redemptions: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expires At (optional)</Label>
                <Input 
                  id="expires_at"
                  type="date"
                  value={codeForm.expires_at}
                  onChange={(e) => setCodeForm({ ...codeForm, expires_at: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingCode(false)}>Cancel</Button>
            <Button onClick={handleCreateCode} disabled={savingCode || !codeForm.code}>
              {savingCode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAffiliates;

