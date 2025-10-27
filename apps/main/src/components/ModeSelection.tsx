import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Target, CheckCircle, Clock, DollarSign, Brain, MessageSquare } from 'lucide-react';

interface ModeSelectionProps {
  selectedMode: 'gemini' | 'structured' | null;
  onModeSelect: (mode: 'gemini' | 'structured') => void;
  onBack: () => void;
}

export const ModeSelection: React.FC<ModeSelectionProps> = ({
  selectedMode,
  onModeSelect,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
            Choose Your Conversation Mode
          </CardTitle>
          <p className="text-gray-600 text-lg">
            Select how you want to practice speaking English
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gemini Chat Mode */}
            <div
              className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                selectedMode === 'gemini'
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onModeSelect('gemini')}
            >
              {selectedMode === 'gemini' && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Zap className="h-8 w-8 text-white" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">🌟 Gemini Chat Mode</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Natural conversation with Google's latest AI. Fast, reliable, and cost-effective.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Response Speed</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Ultra Fast
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cost per Hour</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <DollarSign className="w-3 h-3 mr-1" />
                      $0.04-0.08
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Conversation Quality</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <Brain className="w-3 h-3 mr-1" />
                      Excellent
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Setup Complexity</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      Simple
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Structured Mode */}
            <div
              className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                selectedMode === 'structured'
                  ? 'border-purple-500 bg-purple-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onModeSelect('structured')}
            >
              {selectedMode === 'structured' && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <Target className="h-8 w-8 text-white" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">🎯 Structured Mode</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    IELTS-focused practice with real-time scoring, feedback, and structured analysis.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Response Speed</span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Fast
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cost per Hour</span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                      <DollarSign className="w-3 h-3 mr-1" />
                      $0.50-1.00
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Conversation Quality</span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                      <Brain className="w-3 h-3 mr-1" />
                      Excellent
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Setup Complexity</span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                      Advanced
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Comparison */}
          <div className="bg-gray-50 p-4 rounded-xl border">
            <h4 className="font-semibold text-gray-900 mb-3">Mode Comparison</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong className="text-green-600">🌟 Gemini Chat Mode:</strong>
                <ul className="mt-1 space-y-1 text-gray-600">
                  <li>• Natural conversation flow</li>
                  <li>• 73% cheaper API costs</li>
                  <li>• Faster response times</li>
                  <li>• Simpler, more reliable</li>
                  <li>• Great for general practice</li>
                </ul>
              </div>
              <div>
                <strong className="text-purple-600">🎯 Structured Mode:</strong>
                <ul className="mt-1 space-y-1 text-gray-600">
                  <li>• Real-time band scores (6.5, 7.0)</li>
                  <li>• Structured feedback bullets</li>
                  <li>• IELTS-specific guidance</li>
                  <li>• Topic suggestions</li>
                  <li>• Translation support</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="text-gray-600 border-gray-300 hover:bg-gray-100 font-semibold py-3 px-8 rounded-xl shadow-sm transition-all"
            >
              Back to Voice Selection
            </Button>
            <Button
              onClick={() => selectedMode && onModeSelect(selectedMode)}
              disabled={!selectedMode}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {selectedMode === 'gemini' ? 'Start with Gemini Chat' : 'Start with Structured Mode'}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500">
            💡 <strong>Pro tip:</strong> Start with Gemini Chat mode - it's faster and more reliable. You can always switch modes later in settings!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
