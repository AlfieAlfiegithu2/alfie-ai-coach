import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started with English learning',
      icon: <Star className="w-6 h-6" />,
      features: [
        'Access to basic practice tests',
        'Limited AI feedback',
        '3 mock tests per month',
        'Community access',
        'Basic progress tracking'
      ],
      limitations: [
        'Limited daily practice sessions',
        'Basic feedback only',
        'No premium content'
      ],
      buttonText: 'Current Plan',
      popular: false
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$9.99',
      period: 'per month',
      description: 'Ideal for serious learners preparing for exams',
      icon: <Zap className="w-6 h-6" />,
      features: [
        'Unlimited practice tests',
        'Advanced AI feedback',
        'Unlimited mock tests',
        'Premium study materials',
        'Detailed progress analytics',
        'Speaking voice analysis',
        'Writing assessment tools',
        'Priority support'
      ],
      buttonText: 'Start Premium',
      popular: true,
      stripePrice: 'price_premium_monthly'
    },
    {
      id: 'unlimited',
      name: 'Unlimited',
      price: '$29.99',
      period: 'per month',
      description: 'Complete English mastery with AI coaching',
      icon: <Crown className="w-6 h-6" />,
      features: [
        'Everything in Premium',
        'Personalized AI study plans',
        'Daily challenges & competitions',
        'Advanced pronunciation training',
        'Custom content generation',
        '1-on-1 AI tutoring sessions',
        'Exam prediction algorithms',
        'VIP community access',
        'Early access to new features'
      ],
      buttonText: 'Go Unlimited',
      popular: false,
      stripePrice: 'price_unlimited_monthly'
    }
  ];

  const handleSubscribe = async (planId: string, stripePrice?: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (planId === 'free') {
      toast({
        title: "You're already on the Free plan!",
        description: "Upgrade to Premium or Unlimited for more features.",
      });
      return;
    }

    setLoading(planId);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: stripePrice,
          planName: planId 
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const handleAlipay = async (planId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (planId === 'free') {
      toast({
        title: "Alipay not required for Free plan",
        description: "Choose Premium or Unlimited to pay with Alipay.",
      });
      return;
    }

    setLoading(`alipay-${planId}`);
    try {
      const { data, error } = await supabase.functions.invoke('create-alipay-checkout', {
        body: { planId }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Alipay checkout error:', error);
      toast({
        title: "Alipay checkout failed",
        description: "Please try again or use card checkout.",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1">
            PRICING PLANS
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Choose Your Learning Journey
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From free practice to AI-powered mastery. Find the perfect plan to achieve your English goals.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 hover:shadow-2xl ${
                plan.popular 
                  ? 'ring-2 ring-primary border-primary/50 shadow-xl scale-105' 
                  : 'hover:scale-105'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-8">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${
                  plan.popular ? 'bg-primary text-primary-foreground' : 'bg-muted'
                } flex items-center justify-center mb-4`}>
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                <p className="text-muted-foreground">{plan.description}</p>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.limitations && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground mb-2">Limitations:</p>
                    <ul className="space-y-1">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          • {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleSubscribe(plan.id, plan.stripePrice)}
                    disabled={loading === plan.id || (plan.id === 'free' && !!user)}
                    className={`${
                      plan.popular 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-accent hover:bg-accent/90'
                    }`}
                    size="lg"
                  >
                    {loading === plan.id ? 'Processing...' : 'Pay with Card'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAlipay(plan.id)}
                    disabled={loading === `alipay-${plan.id}` || plan.id === 'free'}
                    size="lg"
                  >
                    {loading === `alipay-${plan.id}` ? 'Redirecting...' : 'Pay with Alipay'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! You can upgrade, downgrade, or cancel your subscription at any time from your account settings.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground text-sm">
                We accept all major credit cards, PayPal, and other payment methods through Stripe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground text-sm">
                Our Free plan gives you access to basic features forever. Premium and Unlimited plans offer full access immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How accurate is the AI feedback?</h3>
              <p className="text-muted-foreground text-sm">
                Our AI is trained on official exam criteria and provides feedback comparable to certified examiners.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-16">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="px-8"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;