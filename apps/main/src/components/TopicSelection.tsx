import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, BookOpen, MessageCircle, Target, Lightbulb, Globe, Languages } from 'lucide-react';
import { getLanguagesWithFlags } from '@/lib/languageUtils';

interface TopicOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
}

interface TopicSelectionProps {
  selectedTopic: string | null;
  selectedLanguage: string | null;
  onTopicSelect: (topicId: string) => void;
  onLanguageSelect: (language: string) => void;
  onStart: () => void;
  onSkip: () => void;
}

const LANGUAGES = getLanguagesWithFlags();

const TOPIC_OPTIONS: TopicOption[] = [
  {
    id: 'daily-life',
    title: 'Daily Life & Hobbies',
    description: 'Talk about your routine, interests, and everyday activities',
    icon: <BookOpen className="w-5 h-5" />,
    difficulty: 'Beginner',
    category: 'Personal'
  },
  {
    id: 'travel-experiences',
    title: 'Travel & Adventures',
    description: 'Share stories about places you\'ve visited or want to visit',
    icon: <Target className="w-5 h-5" />,
    difficulty: 'Intermediate',
    category: 'Experiences'
  },
  {
    id: 'technology-future',
    title: 'Technology & Future',
    description: 'Discuss AI, gadgets, social media, and how tech shapes our lives',
    icon: <Lightbulb className="w-5 h-5" />,
    difficulty: 'Intermediate',
    category: 'Technology'
  },
  {
    id: 'work-career',
    title: 'Work & Career',
    description: 'Talk about your job, career goals, and professional experiences',
    icon: <MessageCircle className="w-5 h-5" />,
    difficulty: 'Intermediate',
    category: 'Professional'
  },
  {
    id: 'food-culture',
    title: 'Food & Culture',
    description: 'Discuss favorite foods, cooking, cultural traditions, and dining experiences',
    icon: <BookOpen className="w-5 h-5" />,
    difficulty: 'Beginner',
    category: 'Lifestyle'
  },
  {
    id: 'environment-sustainability',
    title: 'Environment & Sustainability',
    description: 'Talk about climate change, conservation, and environmental issues',
    icon: <Lightbulb className="w-5 h-5" />,
    difficulty: 'Advanced',
    category: 'Global Issues'
  },
  {
    id: 'education-learning',
    title: 'Education & Learning',
    description: 'Discuss your learning journey, favorite subjects, and educational goals',
    icon: <Target className="w-5 h-5" />,
    difficulty: 'Intermediate',
    category: 'Personal Growth'
  },
  {
    id: 'sports-fitness',
    title: 'Sports & Fitness',
    description: 'Talk about your favorite sports, exercise routines, and athletic achievements',
    icon: <MessageCircle className="w-5 h-5" />,
    difficulty: 'Beginner',
    category: 'Health'
  }
];

const DIFFICULTY_COLORS = {
  'Beginner': 'bg-green-100 text-green-800 border-green-200',
  'Intermediate': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Advanced': 'bg-red-100 text-red-800 border-red-200'
};

const CATEGORY_ICONS = {
  'Personal': '👤',
  'Experiences': '🎯',
  'Technology': '💻',
  'Professional': '💼',
  'Lifestyle': '🏠',
  'Global Issues': '🌍',
  'Personal Growth': '📈',
  'Health': '💪'
};

export const TopicSelection: React.FC<TopicSelectionProps> = ({
  selectedTopic,
  selectedLanguage,
  onTopicSelect,
  onLanguageSelect,
  onStart,
  onSkip,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
            🎯 Choose Your Conversation Topic
          </CardTitle>
          <p className="text-gray-600 text-lg">
            Pick a topic that interests you! This will help us create more engaging conversations tailored to your preferences.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Language Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Choose Your Preferred Language</h2>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800 mb-4">
                If you select a language below, our AI will translate conversations into your preferred language while helping you practice English.
              </p>
              <Select value={selectedLanguage || 'en'} onValueChange={onLanguageSelect}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select your preferred language (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English Only (No Translation)</SelectItem>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        {lang.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLanguage && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    ✅ Great choice! Conversations will be translated into {LANGUAGES.find(l => l.code === selectedLanguage)?.name}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Topic Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOPIC_OPTIONS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => onTopicSelect(topic.id)}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] text-left ${
                  selectedTopic === topic.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {selectedTopic === topic.id && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {topic.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{topic.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${DIFFICULTY_COLORS[topic.difficulty]}`}>
                          {topic.difficulty}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {CATEGORY_ICONS[topic.category]} {topic.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{topic.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Popular Topics */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              🔥 Most Popular Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {TOPIC_OPTIONS.filter(t => t.difficulty === 'Beginner').slice(0, 3).map((topic) => (
                <button
                  key={`popular-${topic.id}`}
                  onClick={() => onTopicSelect(topic.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    selectedTopic === topic.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {topic.title}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              onClick={onSkip}
              variant="outline"
              className="flex-1"
            >
              Skip for now
            </Button>
            <Button
              onClick={onStart}
              disabled={!selectedTopic}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
            >
              Start Conversation
            </Button>
          </div>

          {/* Encouragement */}
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              💡 <strong>Don't worry about being perfect!</strong> The AI tutor will adapt to your level and help you improve naturally through conversation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
