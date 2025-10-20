import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Database, HardDrive, TrendingUp, Volume2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface AnalyticsSummary {
  total_plays: number;
  total_generations: number;
  cache_hits: number;
  unique_questions: number;
  total_egress_bytes: number;
  avg_file_size: number;
  cache_hit_rate: number;
}

interface StorageStats {
  bucket_id: string;
  file_count: number;
  total_bytes: number;
  avg_bytes: number;
}

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get audio analytics summary
        const { data: analyticsData, error: analyticsError } = await supabase
          .rpc('get_audio_analytics_summary', { days_back: 30 });

        if (analyticsError) throw analyticsError;
        
        if (analyticsData && analyticsData.length > 0) {
          setAnalytics(analyticsData[0]);
        }

        // Get storage stats
        const { data: storageData, error: storageError } = await supabase
          .rpc('get_storage_stats');

        if (storageError) throw storageError;
        setStorageStats(storageData || []);

      } catch (error: any) {
        console.error('Error fetching analytics:', error);
        toast({
          title: "Error Loading Analytics",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const egressCost = analytics 
    ? ((analytics.total_egress_bytes / (1024 * 1024 * 1024)) * 0.09).toFixed(2)
    : '0.00';

  const storageCost = storageStats.reduce((acc, stat) => {
    return acc + ((stat.total_bytes / (1024 * 1024 * 1024)) * 0.021);
  }, 0).toFixed(2);

  return (
    <AdminLayout title="Audio & Storage Analytics" showBackButton>
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Audio Plays</CardTitle>
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatNumber(analytics?.total_plays || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : `${Math.round(analytics?.cache_hit_rate || 0)}%`}
              </div>
              <Progress value={analytics?.cache_hit_rate || 0} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {formatNumber(analytics?.cache_hits || 0)} cached responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Egress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatBytes(analytics?.total_egress_bytes || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Est. cost: ${egressCost}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Generations</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatNumber(analytics?.total_generations || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(analytics?.unique_questions || 0)} unique questions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Storage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Breakdown by Bucket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {storageStats.map((stat) => (
                <div key={stat.bucket_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{stat.bucket_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(stat.file_count)} files • Avg: {formatBytes(stat.avg_bytes)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatBytes(stat.total_bytes)}</p>
                      <p className="text-xs text-muted-foreground">
                        ${((stat.total_bytes / (1024 * 1024 * 1024)) * 0.021).toFixed(4)}/mo
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={(stat.total_bytes / Math.max(...storageStats.map(s => s.total_bytes))) * 100} 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Monthly Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Storage Cost</span>
                <span className="font-mono font-bold">${storageCost}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Egress Cost (30 days)</span>
                <span className="font-mono font-bold">${egressCost}</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-base font-medium">Total Estimated</span>
                <span className="text-xl font-bold">${(parseFloat(storageCost) + parseFloat(egressCost)).toFixed(2)}</span>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">Cost Optimization Tips:</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Increase cache hit rate to reduce egress costs</li>
                  <li>• Compress audio files to reduce storage size</li>
                  <li>• Use CDN to reduce Supabase egress charges</li>
                  <li>• Clean up duplicate files in audio-files bucket</li>
                  <li>• Current avg file size: {formatBytes(analytics?.avg_file_size || 0)}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
