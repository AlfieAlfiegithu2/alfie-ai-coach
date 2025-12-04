import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Building2, DollarSign, TrendingUp, Tag, Calendar, Loader2, Check, Clock, CreditCard, Mail, Phone, FileText } from 'lucide-react';
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
}

interface AffiliateCode {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  current_redemptions: number;
  max_redemptions: number | null;
  is_active: boolean;
  created_at: string;
}

interface Referral {
  id: string;
  user_id: string | null;
  affiliate_code_id: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  currency: string;
  commission_amount: number;
  commission_status: string;
  plan_id: string | null;
  created_at: string;
  affiliate_code?: {
    code: string;
  };
  profiles?: {
    email: string;
    full_name: string;
  };
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

const AdminAffiliateDetail = () => {
  const navigate = useNavigate();
  const { affiliateId } = useParams<{ affiliateId: string }>();
  
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [codes, setCodes] = useState<AffiliateCode[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('overview');

  // Stats
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalEarned: 0,
    pendingCommission: 0,
    paidCommission: 0,
    activeCodes: 0,
  });

  // Payout form
  const [isCreatingPayout, setIsCreatingPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: 0,
    payment_method: '',
    payment_reference: '',
    notes: '',
  });
  const [savingPayout, setSavingPayout] = useState(false);

  useEffect(() => {
    if (affiliateId) {
      loadAffiliateData();
    }
  }, [affiliateId]);

  const loadAffiliateData = async () => {
    if (!affiliateId) return;
    
    setLoading(true);
    try {
      // Load affiliate
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .single();

      if (affiliateError) throw affiliateError;
      setAffiliate(affiliateData);

      // Load codes
      const { data: codesData, error: codesError } = await supabase
        .from('affiliate_codes')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      setCodes(codesData || []);

      // Load referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('affiliate_referrals')
        .select(`
          *,
          affiliate_code:affiliate_codes(code)
        `)
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;
      setReferrals(referralsData || []);

      // Load payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;
      setPayouts(payoutsData || []);

      // Calculate stats
      const totalEarned = (referralsData || []).reduce((sum: number, r: Referral) => sum + r.commission_amount, 0);
      const pendingCommission = (referralsData || [])
        .filter((r: Referral) => r.commission_status === 'pending')
        .reduce((sum: number, r: Referral) => sum + r.commission_amount, 0);
      const paidCommission = (payoutsData || [])
        .filter((p: Payout) => p.status === 'paid')
        .reduce((sum: number, p: Payout) => sum + p.amount, 0);

      setStats({
        totalReferrals: referralsData?.length || 0,
        totalEarned,
        pendingCommission,
        paidCommission,
        activeCodes: (codesData || []).filter((c: AffiliateCode) => c.is_active).length,
      });

      // Pre-fill payout amount with pending commission
      setPayoutForm(prev => ({ ...prev, amount: pendingCommission }));

    } catch (error) {
      console.error('Error loading affiliate data:', error);
      toast.error('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayout = async () => {
    if (!affiliate || payoutForm.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSavingPayout(true);
    try {
      // Create payout record
      const { error: payoutError } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: affiliate.id,
          amount: payoutForm.amount,
          currency: 'usd',
          status: 'pending',
          payment_method: payoutForm.payment_method || null,
          payment_reference: payoutForm.payment_reference || null,
          notes: payoutForm.notes || null,
        });

      if (payoutError) throw payoutError;

      toast.success('Payout record created');
      setIsCreatingPayout(false);
      setPayoutForm({ amount: 0, payment_method: '', payment_reference: '', notes: '' });
      loadAffiliateData();
    } catch (error: any) {
      console.error('Error creating payout:', error);
      toast.error(error.message || 'Failed to create payout');
    } finally {
      setSavingPayout(false);
    }
  };

  const handleUpdatePayoutStatus = async (payout: Payout, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('affiliate_payouts')
        .update(updateData)
        .eq('id', payout.id);

      if (error) throw error;

      // If marking as paid, update referral commission statuses
      if (newStatus === 'paid') {
        await supabase
          .from('affiliate_referrals')
          .update({ commission_status: 'paid' })
          .eq('affiliate_id', affiliate?.id)
          .eq('commission_status', 'pending');
      }

      toast.success(`Payout marked as ${newStatus}`);
      loadAffiliateData();
    } catch (error: any) {
      console.error('Error updating payout:', error);
      toast.error('Failed to update payout');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Loading...">
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!affiliate) {
    return (
      <AdminLayout title="Affiliate Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Affiliate not found</p>
          <Button onClick={() => navigate('/admin/affiliates')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Affiliates
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title={affiliate.name}
      description={`${affiliate.type === 'organization' ? 'Organization' : 'Individual'} • ${affiliate.email}`}
    >
      {/* Back Button */}
      <Button variant="outline" className="mb-4" onClick={() => navigate('/admin/affiliates')}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Affiliates
      </Button>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
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
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">${stats.totalEarned.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">${stats.pendingCommission.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Check className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Out</p>
                <p className="text-2xl font-bold">${stats.paidCommission.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Tag className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Codes</p>
                <p className="text-2xl font-bold">{stats.activeCodes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
          <TabsTrigger value="payouts">Payouts ({payouts.length})</TabsTrigger>
          <TabsTrigger value="codes">Codes ({codes.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {affiliate.type === 'organization' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  Affiliate Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{affiliate.email}</span>
                </div>
                {affiliate.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{affiliate.phone}</span>
                  </div>
                )}
                {affiliate.contact_person && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Contact: {affiliate.contact_person}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span>Commission Rate: {affiliate.commission_percent}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Joined: {new Date(affiliate.created_at).toLocaleDateString()}</span>
                </div>
                {affiliate.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                    <span className="text-muted-foreground">{affiliate.notes}</span>
                  </div>
                )}
                <div className="pt-4">
                  <Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'}>
                    {affiliate.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Quick Payout
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.pendingCommission > 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-700">Pending commission to pay out:</p>
                      <p className="text-3xl font-bold text-amber-900">${stats.pendingCommission.toFixed(2)}</p>
                    </div>
                    <Button className="w-full" onClick={() => setIsCreatingPayout(true)}>
                      <DollarSign className="w-4 h-4 mr-2" /> Create Payout
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>All commissions have been paid out!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Referral History</CardTitle>
              <CardDescription>All successful referrals from this affiliate</CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No referrals yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Code Used</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Original</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell>{new Date(referral.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {referral.affiliate_code?.code || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell>{referral.plan_id || 'N/A'}</TableCell>
                        <TableCell>${referral.original_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-red-600">-${referral.discount_amount.toFixed(2)}</TableCell>
                        <TableCell>${referral.final_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          ${referral.commission_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            referral.commission_status === 'paid' ? 'default' :
                            referral.commission_status === 'pending' ? 'secondary' : 'outline'
                          }>
                            {referral.commission_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>Record of all payouts to this affiliate</CardDescription>
              </div>
              <Button onClick={() => setIsCreatingPayout(true)}>
                <DollarSign className="w-4 h-4 mr-2" /> New Payout
              </Button>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payouts yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>{new Date(payout.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">${payout.amount.toFixed(2)}</TableCell>
                        <TableCell>{payout.payment_method || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{payout.payment_reference || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{payout.notes || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            payout.status === 'paid' ? 'default' :
                            payout.status === 'processing' ? 'secondary' :
                            payout.status === 'failed' ? 'destructive' : 'outline'
                          }>
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {payout.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUpdatePayoutStatus(payout, 'processing')}
                              >
                                Processing
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleUpdatePayoutStatus(payout, 'paid')}
                              >
                                Mark Paid
                              </Button>
                            </div>
                          )}
                          {payout.status === 'processing' && (
                            <Button 
                              size="sm"
                              onClick={() => handleUpdatePayoutStatus(payout, 'paid')}
                            >
                              Mark Paid
                            </Button>
                          )}
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
          <Card>
            <CardHeader>
              <CardTitle>Promo Codes</CardTitle>
              <CardDescription>All codes assigned to this affiliate</CardDescription>
            </CardHeader>
            <CardContent>
              {codes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No codes created yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Redemptions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded font-mono">{code.code}</code>
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
                          <Badge variant={code.is_active ? 'default' : 'secondary'}>
                            {code.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(code.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Payout Dialog */}
      <Dialog open={isCreatingPayout} onOpenChange={setIsCreatingPayout}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Create Payout</DialogTitle>
            <DialogDescription>
              Record a payout to {affiliate.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input 
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm({ ...payoutForm, amount: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Pending commission: ${stats.pendingCommission.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select 
                value={payoutForm.payment_method} 
                onValueChange={(v) => setPayoutForm({ ...payoutForm, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="wise">Wise</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Payment Reference</Label>
              <Input 
                id="reference"
                value={payoutForm.payment_reference}
                onChange={(e) => setPayoutForm({ ...payoutForm, payment_reference: e.target.value })}
                placeholder="Transaction ID..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input 
                id="notes"
                value={payoutForm.notes}
                onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingPayout(false)}>Cancel</Button>
            <Button onClick={handleCreatePayout} disabled={savingPayout || payoutForm.amount <= 0}>
              {savingPayout && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAffiliateDetail;

