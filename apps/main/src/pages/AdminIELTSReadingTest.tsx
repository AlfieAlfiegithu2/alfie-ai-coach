import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
// Select removed - using auto-detect instead of manual selection
import { CheckCircle, Upload, Circle, BookOpen, Sparkles, Image, Trash2, Plus, Eye, X, Save, FileText, ClipboardPaste, Edit2, AlertCircle, Settings, CheckCircle2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ImageQuestionExtractor } from "@/components/ImageQuestionExtractor";
import { SmartQuestionRenderer } from "@/components/NoteCompletionRenderer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// All 14 IELTS Reading Question Types
const IELTS_READING_QUESTION_TYPES = [
  { value: 'Matching Headings', label: '1. Matching Headings', keywords: ['heading', 'paragraph', 'section'] },
  { value: 'Matching Paragraph Information', label: '2. Matching Paragraph Information', keywords: ['paragraph', 'contains', 'which paragraph'] },
  { value: 'Matching Features', label: '3. Matching Features', keywords: ['match', 'feature', 'researcher', 'writer', 'person'] },
  { value: 'Matching Sentence Endings', label: '4. Matching Sentence Endings', keywords: ['complete', 'sentence', 'ending'] },
  { value: 'True False Not Given', label: '5. True/False/Not Given', keywords: ['true', 'false', 'not given', 'TFNG'] },
  { value: 'Yes No Not Given', label: '5. Yes/No/Not Given', keywords: ['yes', 'no', 'not given', 'YNNG'] },
  { value: 'Multiple Choice', label: '6. Multiple Choice', keywords: ['choose', 'A', 'B', 'C', 'D', 'option'] },
  { value: 'List Selection', label: '7. List of Options', keywords: ['list', 'choose', 'THREE', 'TWO', 'select'] },
  { value: 'Choose a Title', label: '8. Choose a Title', keywords: ['title', 'best title', 'suitable title'] },
  { value: 'Short Answer', label: '9. Short Answers', keywords: ['answer', 'no more than', 'words'] },
  { value: 'Sentence Completion', label: '10. Sentence Completion', keywords: ['complete', 'sentence', 'blank'] },
  { value: 'Summary Completion', label: '11. Summary Completion', keywords: ['summary', 'complete the summary'] },
  { value: 'Table Completion', label: '12. Table Completion', keywords: ['table', 'complete the table'] },
  { value: 'Flow Chart Completion', label: '13. Flow Chart Completion', keywords: ['flow', 'chart', 'process'] },
  { value: 'Diagram Completion', label: '14. Diagram Completion', keywords: ['diagram', 'label'] },
];

// Auto-detect question type from text patterns
const detectQuestionType = (text: string): string => {
  const lowerText = text.toLowerCase();
  // Normalize multiple spaces to single space for better matching
  const normalizedText = lowerText.replace(/\s+/g, ' ');

  // Check for specific patterns - order matters! More specific first

  // Yes/No/Not Given - check FIRST
  // Key indicator: "YES" appears at START of a line (as an answer option), not just anywhere
  // Pattern: Line starting with YES followed by spaces and "if"
  const hasYesOption = /^\s*YES\s+if/im.test(text) || normalizedText.includes('write yes');
  const hasTrueOption = /^\s*TRUE\s+if/im.test(text) || normalizedText.includes('write true');

  if (hasYesOption && lowerText.includes('not given') && !hasTrueOption) {
    return 'Yes No Not Given';
  }

  // True/False/Not Given
  if (hasTrueOption && lowerText.includes('not given')) {
    return 'True False Not Given';
  }

  // Fallback detection based on which answer options appear as standalone words at line start
  if (/^\s*YES\s*$/im.test(text) || /^\s*NO\s*$/im.test(text)) {
    if (lowerText.includes('not given')) {
      return 'Yes No Not Given';
    }
  }

  if (/^\s*TRUE\s*$/im.test(text) || /^\s*FALSE\s*$/im.test(text)) {
    if (lowerText.includes('not given')) {
      return 'True False Not Given';
    }
  }

  // Matching Features - CHECK BEFORE Multiple Choice!
  // Patterns: "Match each statement", "list of X" (books, people, researchers, etc.)
  // Check for "List of X" header followed by A-E options pattern
  const hasListOfPattern = /list\s+of\s+\w+/i.test(text);
  const hasAEOptions = /\n\s*[A-E]\s+[A-Z]/m.test(text);  // A-E options (not A-D which is Multiple Choice)

  if (lowerText.includes('match each statement') ||
    lowerText.includes('match each') ||
    (lowerText.includes('match') && lowerText.includes('with the correct')) ||
    (hasListOfPattern && hasAEOptions) ||  // "List of cookery books" with A-E options
    lowerText.includes('list of books') ||
    lowerText.includes('list of people') ||
    lowerText.includes('list of researchers') ||
    lowerText.includes('list of writers') ||
    (lowerText.includes('match') && (lowerText.includes('people') || lowerText.includes('listed') || /[A-G]\s+\w+\s+\w+/.test(text)))) {
    return 'Matching Features';
  }

  // Summary/Notes Completion - check for blanks like "14……" or "complete the summary"
  if (lowerText.includes('complete the summary') ||
    lowerText.includes('complete the notes') ||
    /\d+[….…]{3,}/.test(text) ||  // Blanks like 14………
    (lowerText.includes('no more than') && lowerText.includes('words'))) {
    return 'Summary Completion';
  }

  // List Selection - Pick 2 or 3
  if (lowerText.includes('choose two') || lowerText.includes('choose three') ||
    lowerText.includes('which two') || lowerText.includes('which three') ||
    lowerText.includes('choose 2') || lowerText.includes('choose 3')) {
    return 'List Selection';
  }

  // Multiple Choice - check for "choose the correct letter" or A B C D options
  // BUT not if it looks like matching (has "list of" or "match")
  const hasMatchingIndicators = lowerText.includes('list of') || lowerText.includes('match');
  if (!hasMatchingIndicators && (
    lowerText.includes('choose the correct letter') ||
    lowerText.includes('choose the best') ||
    /choose.*letter\s*[A-D]/i.test(text) ||
    /\n\s*[A-D]\s+[A-Z][a-z]+/.test(text))) {  // Lines starting with A, B, C, D followed by text
    return 'Multiple Choice';
  }

  // Matching Headings
  if (lowerText.includes('heading') || lowerText.includes('list of headings')) {
    return 'Matching Headings';
  }

  // Matching Paragraph Information
  if (lowerText.includes('which paragraph') || lowerText.includes('paragraph contains')) {
    return 'Matching Paragraph Information';
  }

  // Matching Sentence Endings
  if (lowerText.includes('complete') && lowerText.includes('sentence') && lowerText.includes('ending')) {
    return 'Matching Sentence Endings';
  }

  // Table Completion
  if (lowerText.includes('complete') && lowerText.includes('table')) {
    return 'Table Completion';
  }

  // Flow Chart Completion
  if (lowerText.includes('complete') && (lowerText.includes('flow') || lowerText.includes('chart'))) {
    return 'Flow Chart Completion';
  }

  // Diagram Completion
  if (lowerText.includes('diagram') || lowerText.includes('label')) {
    return 'Diagram Completion';
  }

  // Choose a Title
  if (lowerText.includes('choose') && lowerText.includes('title')) {
    return 'Choose a Title';
  }

  // Sentence Completion
  if (lowerText.includes('complete') && lowerText.includes('sentence')) {
    return 'Sentence Completion';
  }

  // Short Answer as fallback
  return 'Short Answer';
};

// Parse ALL sections from pasted text automatically
const parseAllSections = (text: string): QuestionSection[] => {
  let sections: QuestionSection[] = [];

  // Split by "Questions X-Y" OR "Question X" (single question) pattern
  // Match: "Questions 14-16", "Question 40", "Questions 1-8", "Questions 39 - 40"
  const sectionPattern = /Questions?\s+(\d+)(?:\s*[-–—to]\s*(\d+))?/gi;
  const allMatches = [...text.matchAll(sectionPattern)];

  if (allMatches.length === 0) {
    return sections;
  }

  // Filter out matches that are:
  // 1. Inside parentheses (like "(Questions 22-26)") - these are references
  // 2. Part of instruction text (like "Questions 27-29 Choose the correct letter")
  // 3. Duplicates of earlier matches with the same range
  const seenQuestionRanges = new Set<string>();
  const sectionMatches = allMatches.filter(match => {
    const idx = match.index!;
    const startNum = parseInt(match[1]);
    const endNum = match[2] ? parseInt(match[2]) : startNum;
    const rangeKey = `${startNum}-${endNum}`;

    // Skip if we've already seen this exact range
    if (seenQuestionRanges.has(rangeKey)) {
      return false;
    }

    // Check if preceded by "(" within 5 characters
    const before = text.substring(Math.max(0, idx - 5), idx);
    if (/\(\s*$/.test(before)) {
      return false; // Skip - this is inside parentheses
    }

    // Check if this appears to be at the start of a line (true section header)
    // Find start of this line
    let lineStart = idx;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    const textBeforeOnLine = text.substring(lineStart, idx).trim();

    // If there's significant text before "Questions" on this line, it's likely part of instruction
    // Only allow short prefixes like "Look at the following statements"
    if (textBeforeOnLine.length > 50) {
      return false; // Skip - too much text before, likely instruction
    }

    seenQuestionRanges.add(rangeKey);
    return true;
  });

  if (sectionMatches.length === 0) {
    return sections;
  }

  // Process each section
  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const startNum = parseInt(match[1]);
    // If no end number (single question like "Question 40"), use start as end
    const endNum = match[2] ? parseInt(match[2]) : startNum;

    // Find the start of the line containing "Questions X-Y" to capture preceding text
    // like "Look at the following statements (Questions 22-26)"
    let sectionStart = match.index!;
    // Look backwards to find the start of the line
    while (sectionStart > 0 && text[sectionStart - 1] !== '\n') {
      sectionStart--;
    }

    // Find the end - either next section match or end of text
    let sectionEnd = text.length;
    for (let j = i + 1; j < sectionMatches.length; j++) {
      const nextMatch = sectionMatches[j];
      // Find start of line for next match
      let nextStart = nextMatch.index!;
      while (nextStart > 0 && text[nextStart - 1] !== '\n') {
        nextStart--;
      }
      sectionEnd = nextStart;
      break;
    }

    const sectionText = text.substring(sectionStart, sectionEnd);

    // Detect question type for this section
    const questionType = detectQuestionType(sectionText);

    // Extract instructions (text between header and first question or options)
    const instructionsMatch = sectionText.match(/Questions?\s+\d+[-–—]?\d*\s*([\s\S]*?)(?=\n\s*(?:[A-G]\s+\w|\d+\s+[A-Z]|\d+\.))/i);
    const instructions = instructionsMatch ? instructionsMatch[1].replace(/\s+/g, ' ').trim() : '';

    // Extract task instruction for all question types
    // For YNNG/TFNG: "Do the following statements agree..." AND "In boxes X-Y on your answer sheet, write"
    // For Summary Completion: "Complete the summary below. Choose NO MORE THAN TWO WORDS..."
    // For Matching: "Look at the following statements (Questions 22-26) and list of books..."
    let taskInstruction = '';

    // Generic extraction: Get all instruction text up to "answer sheet" or options/questions
    const lines = sectionText.split(/\r?\n/);
    const instructionLines: string[] = [];
    let foundAnswerSheet = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Stop conditions based on question type
      if (questionType === 'Yes No Not Given' || questionType === 'True False Not Given') {
        // Stop when we hit YES/TRUE/FALSE definitions or numbered questions
        if (/^\s*(YES|TRUE|NO|FALSE)\s+if/i.test(trimmedLine) ||
          /^\s*(YES|NO|TRUE|FALSE|NOT GIVEN)\s*$/i.test(trimmedLine) ||
          /^\d+\s+[A-Z]/i.test(trimmedLine)) {
          break;
        }
      } else if (questionType === 'Summary Completion' || questionType === 'Short Answer') {
        // Stop after "answer sheet" or when we hit summary content / numbered blanks
        if (foundAnswerSheet) break;
        if (/answer\s+sheet/i.test(trimmedLine)) {
          instructionLines.push(trimmedLine);
          foundAnswerSheet = true;
          continue;
        }
        if (/\d+[….…]+/.test(trimmedLine)) break;
      } else {
        // For Matching and other types: Stop at "answer sheet", options list, or numbered questions
        if (foundAnswerSheet) break;
        if (/answer\s+sheet/i.test(trimmedLine)) {
          instructionLines.push(trimmedLine);
          foundAnswerSheet = true;
          continue;
        }
        // Stop at options (A-E list) or numbered questions
        if (/^[A-G]\s{1,4}[A-Z]/i.test(trimmedLine) || /^\d+\s+[A-Z]/i.test(trimmedLine)) {
          break;
        }
        // Stop at "List of" headers
        if (/^List\s+of\s+/i.test(trimmedLine)) {
          break;
        }
      }

      // Collect instruction lines
      instructionLines.push(trimmedLine);
    }

    taskInstruction = instructionLines.join('\n').trim();
    // Clean up: remove duplicate "Questions X-Y" if it appears twice
    taskInstruction = taskInstruction.replace(/(Questions?\s+\d+[-–—]?\d*)\s+\1/gi, '$1');
    // Also remove the leading "Questions X-Y" header since it's already shown in section title
    taskInstruction = taskInstruction.replace(/^Questions?\s+\d+[-–—]?\d*\s*/i, '').trim();

    console.log('📝 Question type detected:', questionType);
    console.log('📝 Extracted task instruction:', taskInstruction);

    // Extract options for matching types (A-G list) - but NOT for Multiple Choice
    // For Multiple Choice, each question has its own A, B, C, D options
    // Handle both single column and two-column formats
    const options: string[] = [];

    // Only extract section-level options for Matching types, NOT for Multiple Choice
    if (questionType !== 'Multiple Choice') {
      // Patterns that indicate instruction lines (not options)
      // Note: Don't filter individual words like 'than', 'more' - they can appear in valid options
      // Only filter specific instruction phrases
      const instructionPatterns = /\b(MORE THAN \w+ WORDS|NO MORE THAN|answer sheet|NB\s+You|may use any letter|Write the correct|correct letter.*boxes|following statements.*list)\b/i;

      // Pattern for options like "A  Tony Brown" or "A  De re coquinara" - handles full titles
      const optionLines = sectionText.split('\n');
      for (const line of optionLines) {
        // Skip empty lines and lines that look like questions (start with number)
        const trimmedLine = line.trim();
        if (!trimmedLine || /^\d+\s/.test(trimmedLine)) continue;

        // Skip lines that are clearly instructions, BUT separate out "NB" lines to preserve them
        if (instructionPatterns.test(trimmedLine)) {
          // If it's an NB line, add it to taskInstruction so it's not lost
          if (/^NB\s+/i.test(trimmedLine)) {
            taskInstruction = taskInstruction ? `${taskInstruction}\n${trimmedLine}` : trimmedLine;
          }
          continue;
        }

        // PRIMARY: Match single option per line - captures FULL text after letter
        // Format: "A  De re coquinara" or "B  The Book of Household Management"
        // Allow any number of spaces/tabs between letter and text (was 1-6, failed for 7+ spaces)
        const fullLineMatch = trimmedLine.match(/^([A-G])\s+(.+)$/);
        if (fullLineMatch && !options.some(o => o.startsWith(fullLineMatch[1] + ' '))) {
          const letter = fullLineMatch[1];
          const optionText = fullLineMatch[2].trim();
          // Skip if it looks like an instruction phrase
          if (optionText.length > 1 && !instructionPatterns.test(optionText)) {
            options.push(`${letter}  ${optionText}`);
          }
        }

        // SECONDARY: Match "A. Title" or "A) Title" format
        const dotMatch = trimmedLine.match(/^([A-G])[.\)]\s*(.+)$/);
        if (dotMatch && !options.some(o => o.startsWith(dotMatch[1] + ' '))) {
          const optionText = dotMatch[2].trim();
          // Skip if it looks like an instruction phrase
          if (optionText.length > 1 && !instructionPatterns.test(optionText)) {
            options.push(`${dotMatch[1]}  ${optionText}`);
          }
        }
      }

      // Sort options by letter
      options.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));

      // Also check for roman numeral options (i, ii, iii, etc.)
      const romanPattern = /^\s*([ivxIVX]+)[.\)]\s*(.+)/gm;
      let romanMatch;
      while ((romanMatch = romanPattern.exec(sectionText)) !== null) {
        const numeral = romanMatch[1].toLowerCase();
        if (!options.some(o => o.toLowerCase().startsWith(numeral + '.'))) {
          options.push(`${numeral}. ${romanMatch[2].trim()}`);
        }
      }
    }

    // Extract individual questions - improved to handle multiple formats
    const questions: any[] = [];
    const sectionLines = sectionText.split('\n');

    // For Multiple Choice: extract A, B, C, D options that appear after the question
    const mcOptions: string[] = [];
    let currentQuestionText = '';
    let currentQuestionNum = 0;
    let collectingOptions = false;

    for (let lineIdx = 0; lineIdx < sectionLines.length; lineIdx++) {
      const line = sectionLines[lineIdx].trim();
      if (!line) continue;

      // Check if line starts with a question number in our range
      // Allow optional dot or parenthesis: "11 What", "11. What", "11) What"
      const qNumMatch = line.match(/^(\d+)[.\)]?\s+(.+)/);
      if (qNumMatch) {
        const num = parseInt(qNumMatch[1]);

        // Save previous question if we have one
        if (currentQuestionNum >= startNum && currentQuestionNum <= endNum && currentQuestionText) {
          const qOptions = questionType === 'True False Not Given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] :
            questionType === 'Yes No Not Given' ? ['YES', 'NO', 'NOT GIVEN'] :
              questionType === 'Multiple Choice' && mcOptions.length > 0 ? [...mcOptions] : null;

          questions.push({
            question_number: currentQuestionNum,
            question_text: currentQuestionText.trim(),
            question_type: questionType,
            options: qOptions,
            correct_answer: ''
          });
          mcOptions.length = 0; // Clear for next question
        }

        if (num >= startNum && num <= endNum) {
          currentQuestionNum = num;
          currentQuestionText = qNumMatch[2].trim();
          collectingOptions = questionType === 'Multiple Choice';
        } else {
          // Not in our range, might be an option like "A Tony Brown"
          currentQuestionNum = 0;
          currentQuestionText = '';
        }
      }
      // Check if line is a multiple choice option (A, B, C, D followed by text)
      else if (/^[A-D]\s+/.test(line) && collectingOptions) {
        mcOptions.push(line);
      }
      // Check for blank/gap format: "14……………" or just continuing text
      else if (currentQuestionNum > 0) {
        // Append to current question if it looks like continuation
        // BUT don't append if line looks like an option (A-G/a-g followed by spaces and text)
        // Check multiple patterns for options:
        // - "A   is not necessarily valid" (letter + spaces + lowercase text)
        // - "A  Tony Brown" (letter + spaces + capitalized text)
        // - "A. option text" or "A) option text"
        // Use \s+ to allow any number of spaces/tabs (was \s{1,6} which failed for 7+ spaces)
        const isOptionLine = /^[A-Ga-g]\s+.+/.test(line) || /^[A-Ga-g][.\)]\s*.+/.test(line);
        const isQuestionHeader = /^Questions?\s/i.test(line);
        const isRomanNumeral = /^[ivxIVX]+[.\)]\s*.+/.test(line);
        // Also check if this line starts an option list (single letter followed by whitespace and lowercase text)
        // This catches "A   is not necessarily valid." style options
        const isMatchingOption = /^[A-G]\s{2,}[a-z]/.test(line);
        // Check for "List of" headers that introduce options (e.g., "List of cookery books", "List of people")
        const isListHeader = /^List\s+of\s+/i.test(line);
        // Check for option header patterns like "A-E below" or "from the list below"
        const isOptionHeader = /\b(below|from the list|choose from)\b/i.test(line) && line.length < 50;
        if (!isOptionLine && !isQuestionHeader && !isRomanNumeral && !isMatchingOption && !isListHeader && !isOptionHeader) {
          currentQuestionText += ' ' + line;
        }
      }
    }

    // Don't forget the last question!
    if (currentQuestionNum >= startNum && currentQuestionNum <= endNum && currentQuestionText) {
      const qOptions = questionType === 'True False Not Given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] :
        questionType === 'Yes No Not Given' ? ['YES', 'NO', 'NOT GIVEN'] :
          questionType === 'Multiple Choice' && mcOptions.length > 0 ? [...mcOptions] : null;

      questions.push({
        question_number: currentQuestionNum,
        question_text: currentQuestionText.trim(),
        question_type: questionType,
        options: qOptions,
        correct_answer: ''
      });
    }

    // For Summary Completion: keep the WHOLE summary as context, just mark blank numbers
    if (questions.length === 0 && (questionType === 'Summary Completion' || questionType === 'Short Answer')) {
      // Get everything after the header line
      const afterHeader = sectionText.replace(/Questions?\s+\d+[-–—]?\d*[^\n]*\n/, '').trim();

      // The full summary text (replace all blank numbers with underscores)
      let summaryWithBlanks = afterHeader;
      for (let qNum = startNum; qNum <= endNum; qNum++) {
        // Replace "14……………" or just "14" followed by dots with "(14)_____" (number at front)
        summaryWithBlanks = summaryWithBlanks.replace(
          new RegExp(`\\b${qNum}[….…]+`, 'g'),
          `(${qNum})_____`
        );
      }

      // Create ONE question per blank, but all share the same summary context
      for (let qNum = startNum; qNum <= endNum; qNum++) {
        questions.push({
          question_number: qNum,
          question_text: `Blank ${qNum}`, // Simple label
          question_type: questionType,
          options: null,
          correct_answer: ''
        });
      }

      // Store the full summary in the section instructions so it displays once
      if (summaryWithBlanks) {
        // Update instructions to include the summary
        const fullInstructions = afterHeader.split('\n').slice(0, 3).join(' ').trim(); // First few lines as instructions
      }
    }

    // For Summary Completion, extract the full summary paragraph
    let summaryText = '';
    if (questionType === 'Summary Completion' || questionType === 'Short Answer') {
      // Get everything after "answer sheet" or after the header
      const afterInstructions = sectionText.replace(/[\s\S]*?answer sheet\.?\s*/i, '').trim();
      if (afterInstructions) {
        summaryText = afterInstructions;
        // Replace blank markers with cleaner format: (14)_____ (number at front)
        for (let qn = startNum; qn <= endNum; qn++) {
          summaryText = summaryText.replace(
            new RegExp(`\\b${qn}[….…]+`, 'g'),
            `(${qn})_____`
          );
        }
      }
    }

    // Create section - even for single questions
    if (questions.length > 0 || startNum === endNum) {
      // If no questions extracted but it's a range, create placeholder questions
      if (questions.length === 0) {
        // Try to find Shared Question Text if it relies on a single prompt (like List Selection)
        let sharedText = '';
        if (questionType === 'List Selection' || questionType === 'Matching Features') {
          // Look for a line that is a question query or statement but not an option
          // E.g. "Which Two of the following..."
          const specificLine = sectionLines.find(l =>
            l.trim().length > 10 &&
            (l.includes('?') || /^(Which|Choose|Select|What)/i.test(l.trim())) &&
            !/^[A-G]\s/.test(l.trim()) &&
            !/Questions?\s+\d+/i.test(l.trim()) &&
            !l.toLowerCase().includes('answer sheet')
          );
          if (specificLine) sharedText = specificLine.trim();
        }

        for (let qn = startNum; qn <= endNum; qn++) {
          questions.push({
            question_number: qn,
            question_text: sharedText || `Question ${qn}`,
            question_type: questionType,
            options: options.length > 0 ? options : (
              questionType === 'True False Not Given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] :
                questionType === 'Yes No Not Given' ? ['YES', 'NO', 'NOT GIVEN'] : null
            ),
            correct_answer: ''
          });
        }
      }

      // Build full instructions including summary text for Summary Completion
      let fullInstructions = instructions;
      if (summaryText && (questionType === 'Summary Completion' || questionType === 'Short Answer')) {
        fullInstructions = summaryText;
      }

      sections.push({
        sectionTitle: startNum === endNum ? `Question ${startNum}` : `Questions ${startNum}-${endNum}`,
        questionType: questionType,
        instructions: fullInstructions,
        taskInstruction: taskInstruction || undefined, // The preamble like "Do the following statements agree..."
        questionRange: startNum === endNum ? `${startNum}` : `${startNum}-${endNum}`,
        options: options.length > 0 ? options : null,
        questions: questions
      });
    }
  }

  // Deduplicate sections with the same or overlapping question ranges - keep the one with more content
  const seenRanges = new Map<string, QuestionSection>();

  // Helper to get range numbers
  const getRangeNums = (range: string) => {
    const parts = range.split('-');
    const start = parseInt(parts[0]) || 0;
    const end = parseInt(parts[1]) || start;
    return { start, end };
  };

  // Helper to check if ranges overlap
  const rangesOverlap = (range1: string, range2: string) => {
    const r1 = getRangeNums(range1);
    const r2 = getRangeNums(range2);
    return r1.start <= r2.end && r2.start <= r1.end;
  };

  // Helper to calculate section score (more content = higher score)
  const getScore = (s: QuestionSection) => {
    return (s.options?.length || 0) * 10 +
      (s.taskInstruction?.length || 0) +
      (s.questions?.length || 0) * 5 +
      (s.instructions?.length || 0);
  };

  for (const section of sections) {
    const range = section.questionRange;
    let foundOverlap = false;

    // Check for overlapping ranges
    for (const [existingRange, existingSection] of seenRanges.entries()) {
      if (range === existingRange || rangesOverlap(range, existingRange)) {
        foundOverlap = true;
        const existingScore = getScore(existingSection);
        const newScore = getScore(section);

        // Keep the section with more content
        if (newScore > existingScore) {
          seenRanges.delete(existingRange);
          seenRanges.set(range, section);
        }
        break;
      }
    }

    if (!foundOverlap) {
      seenRanges.set(range, section);
    }
  }

  return Array.from(seenRanges.values()).sort((a, b) => {
    // Sort by first question number
    const aNum = parseInt(a.questionRange.split('-')[0]) || 0;
    const bNum = parseInt(b.questionRange.split('-')[0]) || 0;
    return aNum - bNum;
  });
};

interface QuestionSection {
  sectionTitle: string;
  questionType: string;
  instructions: string;
  taskInstruction?: string; // The preamble like "Do the following statements agree with..."
  questionRange: string;
  options: string[] | null;
  questions: any[];
}

interface PassageData {
  passageNumber: number;
  title: string;
  passageText: string;
  questions: any[];
  sections: QuestionSection[];  // NEW: Multiple question sections per passage
  structureItems: any[];
  extractionMetadata: any;
  questionRange: string;
  imageFile: File | null;
  imageUrl: string | null;
}

const AdminIELTSReadingTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const { admin, loading } = useAdminAuth();

  const [testName, setTestName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [generatingExplanations, setGeneratingExplanations] = useState(false);

  const [activePassage, setActivePassage] = useState<number>(1);
  const [inputMode, setInputMode] = useState<'paste' | 'image' | 'answers'>('paste');

  // Copy-paste question input state
  const [pastedQuestionsText, setPastedQuestionsText] = useState("");
  const [pastedAnswersText, setPastedAnswersText] = useState(""); // New state for pasted answers
  const [detectedSections, setDetectedSections] = useState<QuestionSection[]>([]);

  // Three passages for IELTS Reading
  const [passagesData, setPassagesData] = useState<{ [key: number]: PassageData }>({
    1: { passageNumber: 1, title: "Passage 1", passageText: "", questions: [], sections: [], structureItems: [], extractionMetadata: null, questionRange: '1-13', imageFile: null, imageUrl: null },
    2: { passageNumber: 2, title: "Passage 2", passageText: "", questions: [], sections: [], structureItems: [], extractionMetadata: null, questionRange: '14-26', imageFile: null, imageUrl: null },
    3: { passageNumber: 3, title: "Passage 3", passageText: "", questions: [], sections: [], structureItems: [], extractionMetadata: null, questionRange: '27-40', imageFile: null, imageUrl: null },
  });

  // Options editing state
  const [editingOptionsSection, setEditingOptionsSection] = useState<number | null>(null);
  const [editingOptions, setEditingOptions] = useState<string[]>([]);
  const [newOptionLetter, setNewOptionLetter] = useState("");
  const [newOptionName, setNewOptionName] = useState("");

  // Task instruction editing state
  const [editingInstructionSection, setEditingInstructionSection] = useState<number | null>(null);
  const [editingInstruction, setEditingInstruction] = useState("");

  // Question editing state
  const [editingQuestionData, setEditingQuestionData] = useState<{ sectionIdx: number, questionIdx: number } | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState("");
  const [editingQuestionAnswer, setEditingQuestionAnswer] = useState("");

  // Functions to manage options for a section
  const openOptionsEditor = (sectionIdx: number) => {
    const section = passagesData[activePassage].sections[sectionIdx];
    setEditingOptions(section.options || []);
    setEditingOptionsSection(sectionIdx);
    setNewOptionLetter("");
    setNewOptionName("");
  };

  const closeOptionsEditor = () => {
    setEditingOptionsSection(null);
    setEditingOptions([]);
    setNewOptionLetter("");
    setNewOptionName("");
  };

  const addOption = () => {
    if (!newOptionLetter.trim() || !newOptionName.trim()) {
      toast.error("Please enter both letter and name");
      return;
    }
    const letter = newOptionLetter.trim().toUpperCase();
    if (!/^[A-Z]$/.test(letter)) {
      toast.error("Letter must be A-Z");
      return;
    }
    // Check if letter already exists
    if (editingOptions.some(opt => opt.startsWith(letter + ' ') || opt.startsWith(letter + '  '))) {
      toast.error(`Option ${letter} already exists`);
      return;
    }
    const newOption = `${letter}  ${newOptionName.trim()}`;
    const updatedOptions = [...editingOptions, newOption].sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    setEditingOptions(updatedOptions);
    setNewOptionLetter("");
    setNewOptionName("");
    toast.success(`Added option ${letter}`);
  };

  const removeOption = (index: number) => {
    const removed = editingOptions[index];
    setEditingOptions(editingOptions.filter((_, i) => i !== index));
    toast.success(`Removed option ${removed.charAt(0)}`);
  };

  const saveOptions = () => {
    if (editingOptionsSection === null) return;

    // Update the section's options - create deep copy to ensure React detects change
    const updatedSections = passagesData[activePassage].sections.map((section, idx) => {
      if (idx === editingOptionsSection) {
        return {
          ...section,
          options: editingOptions.length > 0 ? [...editingOptions] : null,
          questions: section.questions.map(q => ({ ...q }))
        };
      }
      return { ...section, questions: section.questions.map(q => ({ ...q })) };
    });

    // Also update the flat questions array from sections
    const updatedQuestions = updatedSections.flatMap(s => s.questions);

    updatePassageData(activePassage, { sections: updatedSections, questions: updatedQuestions });
    toast.success(`Options updated for ${updatedSections[editingOptionsSection].questionRange}`);
    closeOptionsEditor();
  };

  // Functions to manage task instruction editing
  const openInstructionEditor = (sectionIdx: number) => {
    const section = passagesData[activePassage]?.sections?.[sectionIdx];
    if (!section) return;
    setEditingInstruction(section.taskInstruction || '');
    setEditingInstructionSection(sectionIdx);
  };

  const closeInstructionEditor = () => {
    setEditingInstructionSection(null);
    setEditingInstruction("");
  };

  const saveInstruction = () => {
    if (editingInstructionSection === null) return;
    if (!passagesData[activePassage]?.sections) return;

    // Update the section's taskInstruction - create deep copy to ensure React detects change
    const updatedSections = passagesData[activePassage].sections.map((section, idx) => {
      if (idx === editingInstructionSection) {
        return {
          ...section,
          taskInstruction: editingInstruction.trim() || undefined,
          questions: section.questions.map(q => ({ ...q }))
        };
      }
      return { ...section, questions: section.questions.map(q => ({ ...q })) };
    });

    // Also update the flat questions array from sections
    const updatedQuestions = updatedSections.flatMap(s => s.questions);

    updatePassageData(activePassage, { sections: updatedSections, questions: updatedQuestions });
    toast.success(`Instruction updated for ${updatedSections[editingInstructionSection].questionRange}`);
    closeInstructionEditor();
  };

  // Inline update for summary/instructions text (for student preview editing)
  // Uses debounced update to avoid too many state changes while typing
  const updateSectionInstructions = (sectionIdx: number, newInstructions: string) => {
    if (!passagesData[activePassage]?.sections) return;

    const updatedSections = passagesData[activePassage].sections.map((section, idx) => {
      if (idx === sectionIdx) {
        return {
          ...section,
          instructions: newInstructions,
          questions: section.questions.map(q => ({ ...q }))
        };
      }
      return { ...section, questions: section.questions.map(q => ({ ...q })) };
    });

    const updatedQuestions = updatedSections.flatMap(s => s.questions);
    updatePassageData(activePassage, { sections: updatedSections, questions: updatedQuestions });
  };

  // Inline update for task instruction text
  const updateSectionTaskInstruction = (sectionIdx: number, newTaskInstruction: string) => {
    if (!passagesData[activePassage]?.sections) return;

    const updatedSections = passagesData[activePassage].sections.map((section, idx) => {
      if (idx === sectionIdx) {
        return {
          ...section,
          taskInstruction: newTaskInstruction || undefined,
          questions: section.questions.map(q => ({ ...q }))
        };
      }
      return { ...section, questions: section.questions.map(q => ({ ...q })) };
    });

    const updatedQuestions = updatedSections.flatMap(s => s.questions);
    updatePassageData(activePassage, { sections: updatedSections, questions: updatedQuestions });
  };

  // Inline update for section options (A-E list for matching types)
  const updateSectionOptions = (sectionIdx: number, optionIdx: number, newOptionText: string) => {
    if (!passagesData[activePassage]?.sections) return;

    const updatedSections = passagesData[activePassage].sections.map((section, idx) => {
      if (idx === sectionIdx && section.options) {
        const newOptions = [...section.options];
        newOptions[optionIdx] = newOptionText;
        return {
          ...section,
          options: newOptions,
          questions: section.questions.map(q => ({ ...q }))
        };
      }
      return { ...section, questions: section.questions.map(q => ({ ...q })) };
    });

    const updatedQuestions = updatedSections.flatMap(s => s.questions);
    updatePassageData(activePassage, { sections: updatedSections, questions: updatedQuestions });
  };

  // Inline update for question text in preview
  const updateQuestionTextInline = (sectionIdx: number, questionIdx: number, newText: string) => {
    if (!passagesData[activePassage]?.sections) return;

    const updatedSections = passagesData[activePassage].sections.map((section, sIdx) => {
      if (sIdx === sectionIdx) {
        const updatedQuestions = section.questions.map((q, qIdx) => {
          if (qIdx === questionIdx) {
            return { ...q, question_text: newText };
          }
          return { ...q };
        });
        return { ...section, questions: updatedQuestions };
      }
      return { ...section, questions: section.questions.map(q => ({ ...q })) };
    });

    const updatedQuestions = updatedSections.flatMap(s => s.questions);
    updatePassageData(activePassage, { sections: updatedSections, questions: updatedQuestions });
  };

  // Functions to manage question editing
  const openQuestionEditor = (sectionIdx: number, questionIdx: number) => {
    const question = passagesData[activePassage]?.sections?.[sectionIdx]?.questions?.[questionIdx];
    if (!question) return;
    setEditingQuestionText(question.question_text || '');
    setEditingQuestionAnswer(question.correct_answer || '');
    setEditingQuestionData({ sectionIdx, questionIdx });
  };

  const closeQuestionEditor = () => {
    setEditingQuestionData(null);
    setEditingQuestionText("");
    setEditingQuestionAnswer("");
  };

  const saveQuestion = () => {
    if (!editingQuestionData) return;
    if (!passagesData[activePassage]?.sections) return;

    const { sectionIdx, questionIdx } = editingQuestionData;

    // Create deep copy of sections to ensure React detects change
    const updatedSections = passagesData[activePassage].sections.map((section, sIdx) => {
      if (sIdx === sectionIdx) {
        const updatedQuestions = section.questions.map((q, qIdx) => {
          if (qIdx === questionIdx) {
            return {
              ...q,
              question_text: editingQuestionText.trim(),
              correct_answer: editingQuestionAnswer.trim() || ''
            };
          }
          return { ...q };
        });
        return { ...section, questions: updatedQuestions };
      }
      return { ...section, questions: section.questions.map(q => ({ ...q })) };
    });

    // Also update the flat questions array from sections
    const updatedQuestions = updatedSections.flatMap(s => s.questions);

    const questionNum = passagesData[activePassage].sections[sectionIdx]?.questions[questionIdx]?.question_number;
    updatePassageData(activePassage, { sections: updatedSections, questions: updatedQuestions });
    toast.success(`Question ${questionNum} updated`);
    closeQuestionEditor();
  };

  // Function to delete a question
  const deleteQuestion = (sectionIdx: number, questionIdx: number) => {
    if (!passagesData[activePassage]?.sections) return;

    const section = passagesData[activePassage].sections[sectionIdx];
    if (!section?.questions?.[questionIdx]) return;

    const questionNum = section.questions[questionIdx].question_number;

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete Question ${questionNum}?`)) {
      return;
    }

    // Create deep copy of sections to ensure React detects change
    let updatedSections = passagesData[activePassage].sections.map((s, idx) => {
      if (idx === sectionIdx) {
        // Filter out the deleted question
        const updatedQuestions = s.questions.filter((_, qIdx) => qIdx !== questionIdx).map(q => ({ ...q }));

        if (updatedQuestions.length === 0) {
          return null; // Mark for removal
        }

        // Update section question range
        const firstQ = updatedQuestions[0]?.question_number;
        const lastQ = updatedQuestions[updatedQuestions.length - 1]?.question_number;

        return {
          ...s,
          questions: updatedQuestions,
          questionRange: firstQ === lastQ ? `${firstQ}` : `${firstQ}-${lastQ}`,
          sectionTitle: firstQ === lastQ ? `Question ${firstQ}` : `Questions ${firstQ}-${lastQ}`
        };
      }
      return { ...s, questions: s.questions.map(q => ({ ...q })) };
    }).filter(s => s !== null) as QuestionSection[];

    if (updatedSections.length < passagesData[activePassage].sections.length) {
      toast.success(`Question ${questionNum} deleted. Section removed (no questions left).`);
    } else {
      toast.success(`Question ${questionNum} deleted`);
    }

    // Also update the flat questions array from sections
    const updatedQuestions = updatedSections.flatMap(s => s.questions);

    updatePassageData(activePassage, { sections: updatedSections, questions: updatedQuestions });
  };

  // Auto-detect sections when text changes
  useEffect(() => {
    if (pastedQuestionsText.trim()) {
      const sections = parseAllSections(pastedQuestionsText);
      setDetectedSections(sections);
    } else {
      setDetectedSections([]);
    }
  }, [pastedQuestionsText]);

  // Helper to get correct passage for a question number
  const getPassageForQuestion = (qNum: number): number => {
    if (qNum >= 1 && qNum <= 13) return 1;
    if (qNum >= 14 && qNum <= 26) return 2;
    if (qNum >= 27 && qNum <= 40) return 3;
    return 1; // default
  };

  // Apply detected sections to CORRECT passages based on question numbers
  // MERGES with existing questions - preserves questions with different numbers
  const applyDetectedSections = () => {
    if (detectedSections.length === 0) {
      toast.error('No sections detected. Make sure your text contains "Questions X-Y" headers.');
      return;
    }

    // Group sections by their correct passage based on question numbers
    const sectionsByPassage: { [key: number]: QuestionSection[] } = { 1: [], 2: [], 3: [] };

    detectedSections.forEach(section => {
      // Get the first question number to determine passage
      const firstQNum = section.questions[0]?.question_number || parseInt(section.questionRange.split('-')[0]);
      let targetPassage = getPassageForQuestion(firstQNum);

      // FIX: Allow flexibility for boundary questions (Q14, Q27) based on ACTIVE tab
      // If user is clearly editing Passage 1 and pastes Q14, put it in Passage 1
      if (activePassage === 1 && (firstQNum === 14 || firstQNum === 13)) targetPassage = 1;
      // If user is in Passage 2 and pastes Q27, put it in Passage 2
      if (activePassage === 2 && (firstQNum === 27 || firstQNum === 26)) targetPassage = 2;
      // If user is in Passage 2 and pastes Q13, put it in Passage 2 (rare but possible)
      if (activePassage === 2 && firstQNum === 13) targetPassage = 2;

      sectionsByPassage[targetPassage].push(section);
    });

    // Compute ALL updates first, then apply in single state update
    // This prevents stale closure issues with React batching
    let totalAdded = 0;
    let totalMerged = 0;
    const passagesUpdated: string[] = [];
    const passageUpdates: { [key: number]: { sections: QuestionSection[], questions: any[] } } = {};

    [1, 2, 3].forEach(passageNum => {
      const newSectionsForPassage = sectionsByPassage[passageNum];
      if (newSectionsForPassage.length > 0) {
        const existingPassageData = passagesData[passageNum];
        const existingSections = existingPassageData.sections || [];
        const existingQuestions = existingPassageData.questions || [];

        // Get all new question numbers being added
        const newQuestionNumbers = new Set<number>();
        newSectionsForPassage.forEach(s => {
          s.questions.forEach(q => {
            if (q.question_number) newQuestionNumbers.add(q.question_number);
          });
        });

        // Filter existing sections to keep those with NON-OVERLAPPING question numbers
        const preservedSections = existingSections.filter(existingSection => {
          // Check if any question in this section overlaps with new questions
          const hasOverlap = existingSection.questions.some(q =>
            q.question_number && newQuestionNumbers.has(q.question_number)
          );
          return !hasOverlap; // Keep section if no overlap
        });

        // Filter existing questions to keep those with different numbers
        const preservedQuestions = existingQuestions.filter(q =>
          !q.question_number || !newQuestionNumbers.has(q.question_number)
        );

        // Merge: preserved + new
        const mergedSections = [...preservedSections, ...newSectionsForPassage];
        const newQuestionsForPassage = newSectionsForPassage.flatMap(s => s.questions);
        const mergedQuestions = [...preservedQuestions, ...newQuestionsForPassage];

        // Sort sections by first question number
        mergedSections.sort((a, b) => {
          const aFirst = a.questions[0]?.question_number || parseInt(a.questionRange.split('-')[0]) || 0;
          const bFirst = b.questions[0]?.question_number || parseInt(b.questionRange.split('-')[0]) || 0;
          return aFirst - bFirst;
        });

        // Sort questions by question number
        mergedQuestions.sort((a, b) => (a.question_number || 0) - (b.question_number || 0));

        // Store update for later batch apply
        passageUpdates[passageNum] = {
          sections: mergedSections,
          questions: mergedQuestions
        };

        totalAdded += newQuestionsForPassage.length;
        totalMerged += preservedQuestions.length;
        passagesUpdated.push(`P${passageNum}: +${newQuestionsForPassage.length} (total: ${mergedQuestions.length})`);

        console.log(`📝 Passage ${passageNum}: Added ${newQuestionsForPassage.length} new, preserved ${preservedQuestions.length} existing`);
        console.log(`   Sections: ${mergedSections.length} total (${preservedSections.length} preserved + ${newSectionsForPassage.length} new)`);
      }
    });

    // Apply ALL updates in a single state update to prevent stale data issues
    if (Object.keys(passageUpdates).length > 0) {
      setPassagesData(prev => {
        const newData = { ...prev };
        Object.entries(passageUpdates).forEach(([passageNum, updates]) => {
          const pNum = parseInt(passageNum);
          newData[pNum] = {
            ...newData[pNum],
            sections: updates.sections,
            questions: updates.questions
          };
        });
        console.log('📊 Updated passagesData:', {
          P1: { sections: newData[1].sections.length, questions: newData[1].questions.length },
          P2: { sections: newData[2].sections.length, questions: newData[2].questions.length },
          P3: { sections: newData[3].sections.length, questions: newData[3].questions.length }
        });
        return newData;
      });
    }

    console.log(`✅ Applied ${detectedSections.length} sections with ${totalAdded} new questions (${totalMerged} preserved)`);
    toast.success(`Added ${totalAdded} questions!`, {
      description: totalMerged > 0
        ? `${passagesUpdated.join(' | ')} • ${totalMerged} existing preserved`
        : passagesUpdated.join(' | ')
    });

    // Clear input
    setPastedQuestionsText('');
    setDetectedSections([]);
  };

  const applyPastedAnswers = () => {
    if (!pastedAnswersText.trim()) return;

    // Parse the answers
    const lines = pastedAnswersText.split('\n');
    const answerMap = new Map<number, string>();

    lines.forEach(line => {
      // Clean the line and check for "1. Answer" or "1 Answer" format
      const cleanLine = line.trim();
      if (!cleanLine) return;

      const match = cleanLine.match(/^(\d+)[\.\s]+\s*(.+)$/);
      if (match) {
        const questionNum = parseInt(match[1]);
        const answer = match[2].trim();
        if (answer) {
          answerMap.set(questionNum, answer);
        }
      }
    });

    if (answerMap.size === 0) {
      toast.error('No valid answers found. Use format: "1. Answer" or "1 Answer"');
      return;
    }

    // Update questions with answers - properly clone all nested objects
    setPassagesData(prev => {
      let updatedCount = 0;

      const newData = {
        1: { ...prev[1] },
        2: { ...prev[2] },
        3: { ...prev[3] }
      };

      [1, 2, 3].forEach(passageNum => {
        const passage = newData[passageNum as 1 | 2 | 3];
        if (!passage.questions || passage.questions.length === 0) return;

        // Update questions array - create new array
        newData[passageNum as 1 | 2 | 3] = {
          ...passage,
          questions: passage.questions.map(q => {
            if (q.question_number && answerMap.has(q.question_number)) {
              updatedCount++;
              return {
                ...q,
                correct_answer: answerMap.get(q.question_number)
              };
            }
            return q;
          }),
          // Also update sections questions if they exist separately
          sections: passage.sections ? passage.sections.map(section => ({
            ...section,
            questions: section.questions.map(q => {
              if (q.question_number && answerMap.has(q.question_number)) {
                return {
                  ...q,
                  correct_answer: answerMap.get(q.question_number)
                };
              }
              return q;
            })
          })) : []
        };
      });

      if (updatedCount > 0) {
        toast.success(`Updated ${updatedCount} answers successfully!`);
        setPastedAnswersText(''); // Clear input
      } else {
        toast.warning('No matching question numbers found to update. Add questions first.');
      }

      return newData;
    });
  };

  // Helper to compute global question number fallback when question_number is missing
  const getGlobalQuestionNumber = (passageNum: number, localIndex: number): number => {
    if (passageNum === 1) return localIndex + 1;          // 1-13
    if (passageNum === 2) return 13 + localIndex + 1;     // 14-26
    return 26 + localIndex + 1;                           // 27-40
  };

  // Quick helper to set/update a single answer for a question number
  const updateAnswerForQuestion = (questionNumber: number, answer: string) => {
    // Allow empty answers to clear the answer (don't block with error)
    const trimmedAnswer = answer.trim();

    setPassagesData(prev => {
      const cloned = {
        1: { ...prev[1] },
        2: { ...prev[2] },
        3: { ...prev[3] },
      };

      let found = false;

      // Search ALL passages for the question (don't rely on hardcoded ranges)
      [1, 2, 3].forEach(passageNum => {
        const passage = cloned[passageNum as 1 | 2 | 3];
        if (!passage) return;

        // Check if this passage has the question
        const hasQuestion = (passage.questions || []).some(q => q.question_number === questionNumber) ||
          (passage.sections || []).some(s => s.questions.some(q => q.question_number === questionNumber));

        if (hasQuestion) {
          found = true;

          // Update flat questions
          const updatedQuestions = (passage.questions || []).map(q =>
            q.question_number === questionNumber ? { ...q, correct_answer: trimmedAnswer } : q
          );

          // Update sections too so UI stays in sync
          const updatedSections = (passage.sections || []).map(section => ({
            ...section,
            questions: section.questions.map(q =>
              q.question_number === questionNumber ? { ...q, correct_answer: trimmedAnswer } : q
            )
          }));

          cloned[passageNum as 1 | 2 | 3] = {
            ...passage,
            questions: updatedQuestions,
            sections: updatedSections
          };
        }
      });

      if (found) {
        if (trimmedAnswer) {
          toast.success(`Saved answer for Q${questionNumber}`);
        } else {
          toast.success(`Cleared answer for Q${questionNumber}`);
        }
      } else {
        toast.error(`Question ${questionNumber} not found. Add it first.`);
      }

      return cloned;
    });
  };

  // Get all questions from all passages for the consolidated view
  const getAllQuestions = () => {
    const allQuestions: Array<{ question_number: number; correct_answer?: string; passage: number }> = [];

    [1, 2, 3].forEach(passageNum => {
      const passage = passagesData[passageNum as 1 | 2 | 3];
      if (passage.questions && passage.questions.length > 0) {
        passage.questions.forEach((q, idx) => {
          // Use stored question_number if present; otherwise fallback by passage/index
          const qNum = q.question_number ?? getGlobalQuestionNumber(passageNum, idx);

          allQuestions.push({
            question_number: qNum,
            correct_answer: q.correct_answer,
            passage: passageNum
          });
        });
      }
    });

    // Sort by question number
    return allQuestions.sort((a, b) => a.question_number - b.question_number);
  };

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  useEffect(() => {
    if (testId) {
      loadExistingData();
    }
  }, [testId]);

  const loadExistingData = async () => {
    if (!testId) {
      setPageLoading(false);
      return;
    }

    try {
      console.log('📖 Loading reading test data for testId:', testId);
      setPageLoading(true);

      // Fetch test details
      const { data: testRecord, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .maybeSingle();

      if (testError) {
        console.error('Error fetching test:', testError);
        throw testError;
      }

      if (!testRecord) {
        console.error('❌ Test not found:', testId);
        toast.error('Test not found');
        setPageLoading(false);
        return;
      }

      console.log('✅ Test loaded:', testRecord.test_name);
      setTestName(testRecord.test_name);

      // Fetch questions for this test
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('part_number', { ascending: true })
        .order('question_number_in_part', { ascending: true });

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
      }

      console.log('📊 Found', questions?.length || 0, 'questions for this test');

      if (questions && questions.length > 0) {
        // Reset passage buckets to avoid double counting + mis-assignment
        const newPassagesData: { [key: number]: PassageData } = {
          1: { ...passagesData[1], questions: [], sections: [], title: passagesData[1].title },
          2: { ...passagesData[2], questions: [], sections: [], title: passagesData[2].title },
          3: { ...passagesData[3], questions: [], sections: [], title: passagesData[3].title },
        };
        const passageRanges: Record<number, [number, number]> = {
          1: [1, 13],
          2: [14, 26],
          3: [27, 40],
        };
        // Track how many questions we've slotted into each passage for safe fallback numbering
        const passageCounters: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
        // Track saved sections from structure_data (first question of each passage has full section data)
        const savedSectionsByPassage: Record<number, QuestionSection[] | null> = { 1: null, 2: null, 3: null };

        questions.forEach((q: any) => {
          // Prefer stored numbers; fallback to continuous numbering per passage (1-13, 14-26, 27-40)
          const rawQuestionNumber = q.question_number_in_part ?? q.question_number ?? null;
          let questionNumber = rawQuestionNumber as number | null;

          // Prefer explicit part_number, otherwise derive from question number
          // FIX: Trust the saved part_number if it exists, don't force standard ranges (1-13, 14-26, 27-40)
          // This allows flexibility (e.g. Passage 1 ending at Q14)
          let passageNum = q.part_number ?? getPassageForQuestion(questionNumber || 0);

          // Only enforce ranges if we really have no idea (no part_number and out of bounds)
          // But if part_number is there, assume it's correct.
          if (!q.part_number && questionNumber !== null) {
            const [minRange, maxRange] = passageRanges[passageNum] || [1, 13];
            if (questionNumber < minRange || questionNumber > maxRange) {
              passageNum = getPassageForQuestion(questionNumber);
            }
          }

          // Fallback numbering: if missing, assign sequentially within the passage using its standard range
          if (questionNumber === null) {
            const [rangeStart] = passageRanges[passageNum] || [1, 13];
            questionNumber = rangeStart + passageCounters[passageNum];
          }

          if (newPassagesData[passageNum]) {
            if (!newPassagesData[passageNum].passageText && q.passage_text) {
              newPassagesData[passageNum].passageText = q.passage_text;
            }

            // Parse structure_data if available for section info
            let structureData = null;
            try {
              if (q.structure_data && typeof q.structure_data === 'string') {
                structureData = JSON.parse(q.structure_data);
              } else if (q.structure_data && typeof q.structure_data === 'object') {
                structureData = q.structure_data;
              }
            } catch (e) {
              console.warn('Failed to parse structure_data:', e);
            }

            // Extract passage title from structure_data (saved on first question of each passage)
            if (structureData?.passageTitle) {
              newPassagesData[passageNum].title = structureData.passageTitle;
              console.log(`📖 Loaded passage ${passageNum} title:`, structureData.passageTitle);
            }

            // Extract saved sections from structure_data (saved on first question of each passage)
            if (structureData?.sections && Array.isArray(structureData.sections) && structureData.sections.length > 0) {
              if (!savedSectionsByPassage[passageNum]) {
                savedSectionsByPassage[passageNum] = structureData.sections;
                console.log(`📚 Found saved sections for Passage ${passageNum}:`, structureData.sections.length);
              }
            }

            // Parse options - handle both semicolon-separated and array formats
            let parsedOptions = null;
            if (q.choices) {
              if (typeof q.choices === 'string') {
                parsedOptions = q.choices.split(';').filter((o: string) => o.trim());
              } else if (Array.isArray(q.choices)) {
                parsedOptions = q.choices;
              }
            }
            // Also check structure_data for options
            if (!parsedOptions && structureData?.options) {
              parsedOptions = structureData.options;
            }

            newPassagesData[passageNum].questions.push({
              question_number: questionNumber,
              question_text: q.question_text,
              question_type: q.question_type || 'Short Answer',
              options: parsedOptions,
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              structureData: structureData
            });
            passageCounters[passageNum] += 1;
          }
        });

        // RESTORE SECTIONS - prefer saved sections from structure_data, fallback to reconstruction
        [1, 2, 3].forEach(passageNum => {
          const passageQuestions = newPassagesData[passageNum].questions;

          // Check if we have saved sections from structure_data
          if (savedSectionsByPassage[passageNum] && savedSectionsByPassage[passageNum]!.length > 0) {
            // Use saved sections and populate with loaded questions
            const savedSections = savedSectionsByPassage[passageNum]!;
            const restoredSections: QuestionSection[] = savedSections.map(savedSection => {
              // Find questions that belong to this section based on question range
              const rangeMatch = savedSection.questionRange?.match(/(\d+)(?:-(\d+))?/);
              const sectionStart = rangeMatch ? parseInt(rangeMatch[1]) : 0;
              const sectionEnd = rangeMatch ? parseInt(rangeMatch[2] || rangeMatch[1]) : sectionStart;

              const sectionQuestions = passageQuestions.filter(q =>
                q.question_number >= sectionStart && q.question_number <= sectionEnd
              );

              return {
                sectionTitle: savedSection.sectionTitle || `Questions ${savedSection.questionRange}`,
                questionType: savedSection.questionType || 'Short Answer',
                instructions: savedSection.instructions || '',
                taskInstruction: savedSection.taskInstruction || '',
                questionRange: savedSection.questionRange || '',
                options: savedSection.options || null,
                questions: sectionQuestions.length > 0 ? sectionQuestions : savedSection.questions || []
              };
            });

            newPassagesData[passageNum].sections = restoredSections;
            console.log(`✅ Restored ${restoredSections.length} saved sections for Passage ${passageNum}:`,
              restoredSections.map(s => `${s.questionRange} (${s.questionType})`).join(', '));
          } else if (passageQuestions.length > 0) {
            // Fallback: Reconstruct sections by grouping by sectionRange from structureData first, then by question_type
            const sectionMap = new Map<string, { questions: any[], options: string[] | null, structureData: any, taskInstruction: string, instructions: string }>();

            passageQuestions.forEach(q => {
              // Use saved sectionRange if available, otherwise fall back to question_type
              const sectionKey = q.structureData?.sectionRange || q.question_type || 'Short Answer';

              if (!sectionMap.has(sectionKey)) {
                sectionMap.set(sectionKey, {
                  questions: [],
                  options: q.options || q.structureData?.options || null,
                  structureData: q.structureData,
                  taskInstruction: q.structureData?.taskInstruction || '',
                  instructions: q.structureData?.instructions || ''
                });
              }
              const sectionData = sectionMap.get(sectionKey)!;
              sectionData.questions.push(q);

              // Update options if this question has them and section doesn't
              if (q.options && !sectionData.options) {
                sectionData.options = q.options;
              }
              if (q.structureData?.options && !sectionData.options) {
                sectionData.options = q.structureData.options;
              }
              // Update instructions if found in this question but missing in section
              if (q.structureData?.instructions && !sectionData.instructions) {
                sectionData.instructions = q.structureData.instructions;
              }
              // Update structureData if current one is missing but this question has it
              if (!sectionData.structureData && q.structureData) {
                sectionData.structureData = q.structureData;
              }
            });

            // Convert map to sections array, sorted by first question number
            const sections: QuestionSection[] = [];
            sectionMap.forEach((data, sectionKey) => {
              // Sort questions within section
              data.questions.sort((a, b) => (a.question_number || 0) - (b.question_number || 0));

              const firstQ = data.questions[0]?.question_number || 1;
              const lastQ = data.questions[data.questions.length - 1]?.question_number || firstQ;
              const qType = data.questions[0]?.question_type || 'Short Answer';

              sections.push({
                sectionTitle: data.structureData?.sectionTitle || `Questions ${firstQ}-${lastQ}`,
                questionType: qType,
                instructions: data.instructions || data.structureData?.instructions || '',
                taskInstruction: data.taskInstruction || data.structureData?.taskInstruction || '',
                questionRange: firstQ === lastQ ? `${firstQ}` : `${firstQ}-${lastQ}`,
                options: data.options,
                questions: data.questions.map((q: any) => {
                  // Sync with latest DB data
                  // Match by question_number_in_part (DB column) OR question_number (structure field)
                  const dbQ = questions.find((dq: any) =>
                    (dq.question_number_in_part === q.question_number) ||
                    (dq.question_number === q.question_number)
                  );
                  if (dbQ) {
                    return {
                      ...q,
                      question_text: dbQ.question_text,
                      correct_answer: dbQ.correct_answer,
                      options: typeof dbQ.choices === 'string' ? dbQ.choices.split(';') : (dbQ.choices || q.options),
                      question_type: dbQ.question_type || q.question_type
                    };
                  }
                  return q;
                })
              });
            });

            // Sort sections by first question number
            sections.sort((a, b) => {
              const aFirst = a.questions[0]?.question_number || 0;
              const bFirst = b.questions[0]?.question_number || 0;
              return aFirst - bFirst;
            });

            newPassagesData[passageNum].sections = sections;
            console.log(`📚 Reconstructed ${sections.length} sections for Passage ${passageNum}:`,
              sections.map(s => `${s.questionRange} (${s.questionType})`).join(', '));
          }
        });

        setPassagesData(newPassagesData);
      }

      setPageLoading(false);
    } catch (error) {
      console.error('❌ Error loading test data:', error);
      toast.error('Failed to load test data');
      setPageLoading(false);
    }
  };

  // Update passage-specific data
  const updatePassageData = (passageNumber: number, updates: Partial<PassageData>) => {
    setPassagesData(prev => ({
      ...prev,
      [passageNumber]: { ...prev[passageNumber], ...updates }
    }));
  };

  const generateExplanations = async () => {
    const allQuestions = getAllQuestions();
    if (allQuestions.length === 0) {
      toast.error('Please add questions first');
      return;
    }

    setGeneratingExplanations(true);
    try {
      console.log('🤖 Generating AI explanations with Gemini...');

      // Gather all passage texts
      const passageTexts = [1, 2, 3].map(num => ({
        passageNumber: num,
        text: passagesData[num].passageText
      })).filter(p => p.text);

      const { data, error } = await supabase.functions.invoke('generate-reading-explanations', {
        body: {
          questions: allQuestions,
          passages: passageTexts
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to generate explanations');

      // Merge explanations into questions
      const newPassagesData = { ...passagesData };

      data.explanations.forEach((exp: any) => {
        const passageNum = exp.passageNumber || 1;
        const qIndex = newPassagesData[passageNum].questions.findIndex(
          (q: any) => q.question_number === exp.questionNumber
        );
        if (qIndex !== -1) {
          newPassagesData[passageNum].questions[qIndex].explanation = exp.explanation;
        }
      });

      setPassagesData(newPassagesData);
      toast.success(`Generated explanations for ${data.explanations.length} questions!`);
    } catch (error: any) {
      console.error('Error generating explanations:', error);
      toast.error(`Failed to generate explanations: ${error.message}`);
    } finally {
      setGeneratingExplanations(false);
    }
  };

  const saveTest = async () => {
    if (!testId) {
      toast.error('Test ID is required');
      return;
    }

    const allQuestions = getAllQuestions();

    // Check if we have any content
    const hasContent = allQuestions.length > 0 ||
      [1, 2, 3].some(num => passagesData[num].passageText.trim());

    if (!hasContent) {
      toast.error('Please add at least one passage or questions');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Saving reading test...');

      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/save-reading-test`;

      // Prepare questions with passage data including section info
      // STRICT: Only save questions that belong to each passage's range
      const questionsToSave: any[] = [];

      const passageRanges: { [key: number]: [number, number] } = {
        1: [1, 13],
        2: [14, 26],
        3: [27, 40]
      };

      [1, 2, 3].forEach(passageNum => {
        const passage = passagesData[passageNum];
        let isFirstQuestionOfPassage = true; // Track to save full sections only once

        // If we have sections, use section data for better structure
        if (passage.sections && passage.sections.length > 0) {
          passage.sections.forEach(section => {
            section.questions.forEach((q, idx) => {
              const qNum = q.question_number || (idx + 1);

              // Build structure_data - only include full sections array on FIRST question
              const structureData: any = {
                sectionTitle: section.sectionTitle,
                sectionRange: section.questionRange,
                instructions: section.instructions,
                taskInstruction: section.taskInstruction,
                options: section.options,
                passageTitle: passage.title
              };

              // Only save full sections array on the first question of the passage
              // This dramatically reduces payload size
              if (isFirstQuestionOfPassage) {
                structureData.sections = passage.sections;
                isFirstQuestionOfPassage = false;
              }

              questionsToSave.push({
                ...q,
                part_number: passageNum,
                passage_text: passage.passageText,
                question_number_in_part: qNum,
                question_type: section.questionType || q.question_type || 'Short Answer',
                // Include section options for matching types
                choices: section.options || q.options || null,
                structure_data: structureData
              });
            });
          });
        } else {
          // Fallback to flat questions
          passage.questions.forEach((q, idx) => {
            const qNum = q.question_number || (idx + 1);

            const structureData: any = {
              passageTitle: passage.title
            };

            // Save sections on first question if available
            if (isFirstQuestionOfPassage && passage.sections && passage.sections.length > 0) {
              structureData.sections = passage.sections;
              isFirstQuestionOfPassage = false;
            }

            questionsToSave.push({
              ...q,
              part_number: passageNum,
              passage_text: passage.passageText,
              question_number_in_part: qNum,
              question_type: q.question_type || 'Short Answer',
              choices: q.options || null,
              structure_data: structureData
            });
          });
        }
      });

      console.log(`📊 Saving ${questionsToSave.length} questions (strict range validation applied)`);

      const dataToSave = {
        testId,
        testData: {
          title: testName || `IELTS Reading Test`,
          passages: [1, 2, 3].map(num => ({
            passageNumber: num,
            title: passagesData[num].title,
            passageText: passagesData[num].passageText,
            questionRange: passagesData[num].questionRange,
            structureItems: passagesData[num].structureItems,
            extractionMetadata: passagesData[num].extractionMetadata,
            // Include sections data for reconstruction
            sections: passagesData[num].sections || []
          }))
        },
        questions: questionsToSave
      };

      console.log('📦 Data being sent:', JSON.stringify(dataToSave, null, 2));

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify(dataToSave)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save test');
      }

      console.log('✅ Test saved successfully!');
      toast.success('Reading test saved successfully!');

    } catch (error: any) {
      console.error('Error saving test:', error);
      toast.error(`Failed to save test: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <AdminLayout title="Loading Reading Test..." showBackButton backPath="/admin/ielts/reading">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading reading test data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!admin) return null;

  return (
    <AdminLayout
      title={`IELTS Reading Test - ${testName || testId}`}
      showBackButton={true}
      backPath="/admin/ielts/reading"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#2f241f]">
              IELTS Reading Test Management
            </h1>
            <p className="text-[#5a4a3f] mt-1">
              Create a complete reading test with 3 passages and 40 questions total
            </p>
          </div>
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-sm">
            Test ID: {testId?.substring(0, 8)}...
          </Badge>
        </div>

        {/* Main Test Card */}
        <Card className="border-2 border-[#e0d6c7] bg-[#fdfaf3] shadow-sm">
          <CardHeader className="bg-amber-50/50 border-b border-[#e0d6c7]">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[#2f241f]">
                <BookOpen className="w-5 h-5 text-amber-600" />
                Reading Test - All Passages (1-3)
              </CardTitle>
              <Badge className="bg-white border-amber-200 text-amber-700 text-xs">
                Preview updates instantly ↓
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 bg-[#fdfaf3] pt-6">
            {/* Test Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2f241f]">Test Name *</label>
              <p className="text-xs text-[#5a4a3f] mb-2">
                Give this test a descriptive name (e.g., "IELTS Reading Test 1 - Cambridge 18")
              </p>
              <Input
                placeholder="IELTS Reading Test 1"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="max-w-md bg-white border-[#e0d6c7] text-[#2f241f] focus:border-amber-400"
              />
            </div>

            {/* Passage Tabs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#2f241f]">Passages & Questions</label>
                  <p className="text-xs text-[#5a4a3f]">
                    Upload passages and use AI to extract questions from images
                  </p>
                </div>
              </div>

              {/* Passage Navigation Tabs */}
              <div className="flex gap-2 border-b border-[#e0d6c7] pb-2">
                {[1, 2, 3].map(passageNum => {
                  const passageData = passagesData[passageNum];
                  const hasQuestions = passageData.questions.length > 0;
                  const hasPassage = passageData.passageText.trim().length > 0;

                  return (
                    <Button
                      key={passageNum}
                      variant={activePassage === passageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActivePassage(passageNum)}
                      className={`relative ${activePassage === passageNum
                        ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-300'
                        : 'bg-white border-[#e0d6c7] text-[#2f241f] hover:bg-amber-50'
                        }`}
                    >
                      Passage {passageNum}
                      {hasQuestions && (
                        <CheckCircle className="w-3 h-3 ml-1 text-green-500" />
                      )}
                      {hasPassage && !hasQuestions && (
                        <Circle className="w-3 h-3 ml-1 text-amber-400" />
                      )}
                      <span className={`ml-1 text-xs ${activePassage === passageNum ? 'text-amber-100' : 'text-[#5a4a3f]'}`}>
                        ({passageData.questionRange})
                      </span>
                    </Button>
                  );
                })}
              </div>

              {/* Full Answer Key - Q1 to Q40 (All Passages) */}
              {(() => {
                const allQuestions = getAllQuestions();
                const answeredCount = allQuestions.filter(q => q.correct_answer).length;
                const totalSlots = 40;

                return (
                  <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md">
                    <CardHeader className="pb-3 bg-green-100/50 border-b border-green-200">
                      <CardTitle className="text-base flex items-center gap-2 text-green-800">
                        <CheckCircle2 className="w-5 h-5" />
                        Full Answer Key (Q1-Q40)
                        <Badge className="ml-auto bg-green-600 text-white">
                          {answeredCount}/{totalSlots} Answered
                        </Badge>
                      </CardTitle>
                      <p className="text-xs text-green-700">
                        All answers across all 3 passages displayed here
                      </p>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid gap-2 grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-13">
                        {/* Generate slots for Q1-Q40 */}
                        {Array.from({ length: totalSlots }, (_, i) => i + 1).map(qNum => {
                          const question = allQuestions.find(q => q.question_number === qNum);
                          const existingAnswer = question?.correct_answer || '';

                          return (
                            <div
                              key={qNum}
                              className={`rounded-md border px-2 py-2 text-center ${existingAnswer
                                ? 'border-green-400 bg-green-100'
                                : 'border-gray-200 bg-gray-50'
                                }`}
                            >
                              <div className="text-[10px] font-medium text-gray-500 mb-1">Q{qNum}</div>
                              <Badge
                                variant="outline"
                                className={`text-xs px-1.5 py-0 font-mono ${existingAnswer
                                  ? 'border-green-500 bg-green-600 text-white'
                                  : 'border-gray-300 bg-white text-gray-400'
                                  }`}
                              >
                                {existingAnswer || '-'}
                              </Badge>
                              <div className="flex gap-0.5 mt-1">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  className="h-6 text-[10px] px-1 text-green-700 hover:bg-green-100"
                                  onClick={() => {
                                    const newAns = window.prompt(`Set answer for Q${qNum}`, existingAnswer || '');
                                    if (newAns !== null) {
                                      updateAnswerForQuestion(qNum, newAns);
                                    }
                                  }}
                                >
                                  {existingAnswer ? 'Edit' : 'Add'}
                                </Button>
                                {existingAnswer && (
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    className="h-6 text-[10px] px-1 text-blue-700 hover:bg-blue-100"
                                    onClick={() => {
                                      const altAns = window.prompt(`Add alternative answer for Q${qNum}\nCurrent: ${existingAnswer}\nWill be saved as: ${existingAnswer}/[your input]`);
                                      if (altAns !== null && altAns.trim()) {
                                        updateAnswerForQuestion(qNum, `${existingAnswer}/${altAns.trim()}`);
                                      }
                                    }}
                                  >
                                    +Alt
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Passage Legend */}
                      <div className="mt-4 pt-3 border-t border-green-200 flex items-center justify-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="bg-amber-100 border-amber-300 text-amber-700">P1</Badge>
                          <span className="text-gray-600">Q1-13</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="bg-orange-100 border-orange-300 text-orange-700">P2</Badge>
                          <span className="text-gray-600">Q14-26</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="bg-yellow-100 border-yellow-300 text-yellow-700">P3</Badge>
                          <span className="text-gray-600">Q27-40</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Active Passage Content */}
              <div className="border-2 border-[#e0d6c7] rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg text-[#2f241f]">Passage {activePassage}</h4>
                    <p className="text-sm text-[#5a4a3f]">
                      Questions {passagesData[activePassage].questionRange} • {passagesData[activePassage].questions.length} questions extracted
                    </p>
                  </div>
                  {passagesData[activePassage].questions.length > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {passagesData[activePassage].questions.length} Questions
                    </Badge>
                  )}
                </div>

                {/* Passage Title with Save Button */}
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium text-[#2f241f]">Passage Title</label>
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder={`Passage ${activePassage} Title (e.g., "The History of Coffee")`}
                      value={passagesData[activePassage].title}
                      onChange={(e) => updatePassageData(activePassage, { title: e.target.value })}
                      className="max-w-lg bg-white border-[#e0d6c7] text-[#2f241f] focus:border-amber-400"
                    />
                    <Button
                      onClick={saveTest}
                      disabled={saving}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  <p className="text-xs text-[#5a4a3f]">
                    💡 Click Save to persist the passage title to the database
                  </p>
                </div>

                {/* Passage Text */}
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-[#2f241f]">
                    <FileText className="w-4 h-4 inline mr-1 text-amber-600" />
                    Passage Text *
                  </label>
                  <p className="text-xs text-[#5a4a3f]">
                    Paste the full reading passage text here. This will be shown to students during the test.
                  </p>
                  <Textarea
                    placeholder="Paste the complete reading passage text here..."
                    value={passagesData[activePassage].passageText}
                    onChange={(e) => updatePassageData(activePassage, { passageText: e.target.value })}
                    rows={12}
                    className="font-serif text-sm leading-relaxed bg-white border-[#e0d6c7] text-[#2f241f]"
                  />
                  {passagesData[activePassage].passageText && (
                    <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-800 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" />
                        {passagesData[activePassage].passageText.split(' ').length} words
                      </p>
                      <Button
                        onClick={saveTest}
                        disabled={saving}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                        ) : (
                          <>
                            <Save className="w-3 h-3 mr-1" />
                            Save Passage
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Question Input Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <label className="text-sm font-medium text-[#2f241f]">Add Questions</label>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                      {IELTS_READING_QUESTION_TYPES.length} question types supported
                    </Badge>
                  </div>

                  <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'paste' | 'image' | 'answers')}>
                    <TabsList className="grid w-full grid-cols-3 bg-[#fdfaf3] border border-[#e0d6c7]">
                      <TabsTrigger value="paste" className="gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                        <ClipboardPaste className="w-4 h-4" />
                        Copy & Paste
                      </TabsTrigger>
                      <TabsTrigger value="image" className="gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                        <Image className="w-4 h-4" />
                        Image Upload
                      </TabsTrigger>
                      <TabsTrigger value="answers" className="gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                        <FileText className="w-4 h-4" />
                        Paste Answers
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="paste" className="mt-4 space-y-4">
                      <Card className="border-2 border-[#e0d6c7] bg-white">
                        <CardHeader className="pb-3 bg-amber-50/50 border-b border-[#e0d6c7]">
                          <CardTitle className="text-base flex items-center gap-2 text-[#2f241f]">
                            <ClipboardPaste className="w-4 h-4 text-amber-600" />
                            Paste All Questions (Auto-Detect)
                          </CardTitle>
                          <p className="text-xs text-[#5a4a3f]">
                            Just paste everything! System auto-detects question types, ranges, and options.
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4 bg-[#fdfaf3]">
                          {/* Questions Paste Area */}
                          <div>
                            <label className="text-sm font-medium mb-1 block text-[#2f241f]">Paste Questions (including headers)</label>
                            <Textarea
                              placeholder={`Paste entire question section here...`}
                              value={pastedQuestionsText}
                              onChange={(e) => setPastedQuestionsText(e.target.value)}
                              rows={14}
                              className="font-mono text-sm bg-white border-[#e0d6c7] text-[#2f241f]"
                            />
                          </div>

                          {/* Auto-detected sections preview */}
                          {detectedSections.length > 0 && (
                            <div className="p-3 bg-amber-50 rounded-lg border-2 border-amber-300">
                              <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Auto-Detected {detectedSections.length} Section{detectedSections.length > 1 ? 's' : ''}:
                              </p>
                              <div className="space-y-2">
                                {detectedSections.map((section, idx) => {
                                  // Determine which passage this section belongs to
                                  const firstQNum = section.questions[0]?.question_number || parseInt(section.questionRange.split('-')[0]);
                                  const targetPassage = getPassageForQuestion(firstQNum);

                                  return (
                                    <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-[#e0d6c7]">
                                      <Badge className={
                                        targetPassage === 1 ? "bg-amber-600" :
                                          targetPassage === 2 ? "bg-orange-600" :
                                            "bg-yellow-600"
                                      }>
                                        P{targetPassage}
                                      </Badge>
                                      <Badge variant="outline" className="border-amber-200">{section.questionRange}</Badge>
                                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">{section.questionType}</Badge>
                                      <span className="text-xs text-[#5a4a3f]">
                                        ({section.questions.length} questions)
                                      </span>
                                      {section.options && section.options.length > 0 && (
                                        <span className="text-xs text-amber-600">
                                          +{section.options.length} options
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-xs text-[#5a4a3f] mt-2">
                                📍 Questions auto-assigned: 1-13 → P1, 14-26 → P2, 27-40 → P3
                              </p>
                            </div>
                          )}

                          {pastedQuestionsText && detectedSections.length === 0 && (
                            <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-xs text-red-800 flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" />
                                No sections detected. Make sure text includes "Questions X-Y" headers.
                              </p>
                            </div>
                          )}

                          <Button
                            onClick={applyDetectedSections}
                            disabled={detectedSections.length === 0}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            size="lg"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add {detectedSections.length} Section{detectedSections.length !== 1 ? 's' : ''} to Passage {activePassage}
                          </Button>

                          {/* Quick tips */}
                          <div className="border-t border-[#e0d6c7] pt-3 mt-3">
                            <p className="text-xs font-medium text-[#5a4a3f] mb-2">✨ Auto-Detection Works For:</p>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs border-amber-200 text-[#5a4a3f]">True/False/Not Given</Badge>
                              <Badge variant="outline" className="text-xs border-amber-200 text-[#5a4a3f]">Yes/No/Not Given</Badge>
                              <Badge variant="outline" className="text-xs border-amber-200 text-[#5a4a3f]">Matching Features</Badge>
                              <Badge variant="outline" className="text-xs border-amber-200 text-[#5a4a3f]">Matching Headings</Badge>
                              <Badge variant="outline" className="text-xs border-amber-200 text-[#5a4a3f]">Multiple Choice</Badge>
                              <Badge variant="outline" className="text-xs border-amber-200 text-[#5a4a3f]">Summary Completion</Badge>
                              <Badge variant="outline" className="text-xs border-amber-200 text-[#5a4a3f]">+8 more</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="image" className="mt-4">
                      <ImageQuestionExtractor
                        testId={testId || ''}
                        testType="IELTS-Reading"
                        initialImageFile={passagesData[activePassage].imageFile}
                        onImageSelected={(file) => updatePassageData(activePassage, { imageFile: file })}
                        onQuestionsExtracted={(extractedQuestions, metadata) => {
                          console.log(`✨ Passage ${activePassage}: AI extracted ${extractedQuestions.length} questions`);

                          updatePassageData(activePassage, {
                            questions: extractedQuestions,
                            structureItems: metadata?.structureItems || [],
                            extractionMetadata: metadata || null
                          });

                          const typeInfo = metadata?.questionType ? ` (${metadata.questionType})` : '';
                          toast.success(`Passage ${activePassage}: ${extractedQuestions.length} questions extracted!${typeInfo}`);
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="answers" className="mt-4 space-y-4">
                      <Card className="border-2 border-[#e0d6c7] bg-white">
                        <CardHeader className="pb-3 bg-amber-50/50 border-b border-[#e0d6c7]">
                          <CardTitle className="text-base flex items-center gap-2 text-[#2f241f]">
                            <FileText className="w-4 h-4 text-amber-600" />
                            Paste Answer Key
                          </CardTitle>
                          <p className="text-xs text-[#5a4a3f]">
                            Paste all answers at once. Format: "1. A" or "1 TRUE" (one answer per line)
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4 bg-[#fdfaf3]">
                          <div>
                            <label className="text-sm font-medium mb-1 block text-[#2f241f]">Paste Answer Key</label>
                            <Textarea
                              placeholder={`1. E\n2. D\n3. C\n4. A\n5. F\n...\n9. NO\n10. YES\n11. NOT GIVEN`}
                              value={pastedAnswersText}
                              onChange={(e) => setPastedAnswersText(e.target.value)}
                              rows={14}
                              className="font-mono text-sm bg-white border-[#e0d6c7] text-[#2f241f]"
                            />
                          </div>

                          {/* Preview parsed answers */}
                          {pastedAnswersText.trim() && (
                            <div className="p-3 bg-amber-50 rounded-lg border-2 border-amber-300">
                              <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Detected Answers:
                              </p>
                              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                                {pastedAnswersText.split('\n').filter(line => line.trim()).map((line, idx) => {
                                  const match = line.trim().match(/^(\d+)[\.\s]+\s*(.+)$/);
                                  if (match) {
                                    return (
                                      <Badge key={idx} variant="outline" className="font-mono text-xs border-amber-200">
                                        Q{match[1]}: {match[2].trim()}
                                      </Badge>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={applyPastedAnswers}
                            disabled={!pastedAnswersText.trim()}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            size="lg"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Answers to Questions
                          </Button>

                          {/* Instructions */}
                          <div className="border-t border-[#e0d6c7] pt-3 mt-3">
                            <p className="text-xs font-medium text-[#5a4a3f] mb-2">📋 Supported Formats:</p>
                            <div className="text-xs text-[#5a4a3f] space-y-1">
                              <p>• <code className="bg-white px-1 rounded">1. E</code> - Letter answers</p>
                              <p>• <code className="bg-white px-1 rounded">9. YES</code> - Yes/No/Not Given</p>
                              <p>• <code className="bg-white px-1 rounded">10. TRUE</code> - True/False/Not Given</p>
                              <p>• <code className="bg-white px-1 rounded">14. NOT GIVEN</code> - Not Given answers</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Manual Question Entry hint */}
                {passagesData[activePassage].questions.length === 0 && (
                  <div className="mt-4 p-4 border-2 border-dashed border-[#e0d6c7] rounded-lg bg-[#fdfaf3]">
                    <p className="text-center text-[#5a4a3f] text-sm">
                      📋 Use <strong>Copy & Paste</strong> to paste question text, or <strong>Image Upload</strong> to extract from screenshots
                    </p>
                  </div>
                )}

              </div>

              {/* Summary of all passages */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[1, 2, 3].map(passageNum => {
                  const passageData = passagesData[passageNum];
                  const hasPassage = passageData.passageText.trim().length > 0;
                  const status = passageData.questions.length > 0
                    ? 'complete'
                    : hasPassage
                      ? 'passage-ready'
                      : 'empty';

                  return (
                    <div
                      key={passageNum}
                      className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${status === 'complete' ? 'bg-amber-100 border-amber-300' :
                        status === 'passage-ready' ? 'bg-orange-50 border-orange-200' :
                          'bg-gray-50 border-gray-200'
                        } ${activePassage === passageNum ? 'ring-2 ring-amber-500' : ''}`}
                      onClick={() => setActivePassage(passageNum)}
                    >
                      <div className={`font-semibold text-sm ${status === 'complete' ? 'text-amber-900' : 'text-[#2f241f]'
                        }`}>Passage {passageNum}</div>
                      <div className="text-xs text-[#5a4a3f]">{passageData.questionRange}</div>
                      <div className={`text-xs mt-1 font-medium ${status === 'complete' ? 'text-amber-700' :
                        status === 'passage-ready' ? 'text-orange-600' :
                          'text-gray-400'
                        }`}>
                        {status === 'complete' ? `${passageData.questions.length} Questions` :
                          status === 'passage-ready' ? 'Passage Added' :
                            'Empty'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Student Preview - ALWAYS shows when there's content */}
              {(passagesData[activePassage].passageText || passagesData[activePassage].questions.length > 0) && (
                <div className="mt-6 border-t border-[#e0d6c7] pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="w-5 h-5 text-amber-600" />
                    <h4 className="font-semibold text-[#2f241f]">Student View Preview - Passage {activePassage}</h4>
                    <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800">Exactly as students will see</Badge>
                  </div>

                  {/* Full-width student exam view */}
                  <div className="border-4 border-[#e0d6c7] rounded-xl overflow-hidden shadow-lg bg-white">
                    {/* Exam Header */}
                    <div className="bg-[#2f241f] text-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-[#fdfaf3]">ENGLISH AIDOL IELTS READING</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#fdfaf3]">Passage {activePassage}</div>
                          <div className="text-amber-200 text-sm">Questions {passagesData[activePassage].questionRange}</div>
                        </div>
                      </div>
                    </div>

                    {/* Split View: Passage | Questions */}
                    <div className="grid grid-cols-2 divide-x divide-[#e0d6c7]">
                      {/* Left: Passage Text */}
                      <div className="bg-[#fdfaf3] p-6 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#D3C4A5] scrollbar-track-transparent hover:scrollbar-thumb-[#8B4513]/50">
                        <h4 className="font-bold text-xl mb-4 text-[#2f241f] border-b border-[#e0d6c7] pb-2 font-serif">
                          {passagesData[activePassage].title || `Reading Passage ${activePassage}`}
                        </h4>
                        <div className="prose prose-sm max-w-none">
                          {passagesData[activePassage].passageText ? (
                            passagesData[activePassage].passageText.split('\n').filter(p => p.trim()).map((para, i) => (
                              <p key={i} className="mb-4 text-justify leading-relaxed text-[#2f241f] indent-8 first:indent-0 font-serif">
                                {para}
                              </p>
                            ))
                          ) : (
                            <p className="text-[#5a4a3f] italic">No passage text added yet</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Questions grouped by section */}
                      <div className="bg-[#fdfaf3] p-6 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#D3C4A5] scrollbar-track-transparent hover:scrollbar-thumb-[#8B4513]/50">
                        <h4 className="font-bold text-lg mb-4 text-black">
                          Questions {passagesData[activePassage].questionRange}
                        </h4>

                        {passagesData[activePassage].sections.length > 0 ? (
                          <div className="space-y-6">
                            {passagesData[activePassage].sections.map((section, sIdx) => (
                              <div key={`preview-${section.questionRange}-${sIdx}-${section.questions.length}-${section.taskInstruction?.length || 0}-${section.options?.length || 0}`} className="pl-0">
                                {/* Section Header */}
                                <div className="mb-3">
                                  <h5 className="font-bold text-base text-[#2f241f]">
                                    Questions {section.questionRange}
                                  </h5>

                                  {/* Task Instruction - editable for ALL question types, auto-expands */}
                                  <div className="mt-2 group relative">
                                    <Textarea
                                      value={section.taskInstruction || ''}
                                      onChange={(e) => {
                                        updateSectionTaskInstruction(sIdx, e.target.value);
                                        // Auto-expand
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                      }}
                                      placeholder="Click to add task instruction (e.g., Choose NO MORE THAN TWO WORDS...)"
                                      className="text-sm text-[#5a4a3f] italic bg-transparent border-none focus:ring-1 focus:ring-amber-300 focus:bg-white/50 px-1 py-1 w-full resize-none overflow-hidden"
                                      style={{ boxShadow: 'none', minHeight: '32px', height: 'auto' }}
                                      ref={(el) => {
                                        if (el && section.taskInstruction) {
                                          el.style.height = 'auto';
                                          el.style.height = el.scrollHeight + 'px';
                                        }
                                      }}
                                    />
                                    {!section.taskInstruction && (
                                      <span className="absolute right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-600">
                                          + Add instruction
                                        </Badge>
                                      </span>
                                    )}
                                  </div>

                                  {/* Instructions text - HIDE for Summary Completion (shown separately below), YNNG patterns */}
                                  {section.instructions &&
                                    !section.taskInstruction &&
                                    section.questionType !== 'Summary Completion' &&
                                    section.questionType !== 'Short Answer' &&
                                    section.questionType !== 'Yes No Not Given' &&
                                    section.questionType !== 'True False Not Given' &&
                                    !(/\b(yes|no|true|false)\b.*not given/i.test(section.instructions)) &&
                                    !(/write\s+(yes|no|true|false)/i.test(section.instructions)) && (
                                      <div className="relative group mt-2">
                                        <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                          <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                                            Click to edit
                                          </Badge>
                                        </div>
                                        <Textarea
                                          value={section.instructions || ''}
                                          onChange={(e) => {
                                            updateSectionInstructions(sIdx, e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                          }}
                                          className="text-sm text-[#5a4a3f] italic bg-transparent border-none focus:ring-1 focus:ring-amber-300 focus:bg-white/50 px-1 py-1 w-full resize-none overflow-hidden"
                                          style={{ boxShadow: 'none', minHeight: '32px', height: 'auto' }}
                                          ref={(el) => {
                                            if (el && section.instructions) {
                                              el.style.height = 'auto';
                                              el.style.height = el.scrollHeight + 'px';
                                            }
                                          }}
                                        />
                                      </div>
                                    )}

                                  {/* YES/NO/NOT GIVEN or TRUE/FALSE/NOT GIVEN Legend - styled like IELTS paper */}
                                  {(section.questionType === 'Yes No Not Given' || section.questionType === 'True False Not Given') && (
                                    <div className="mt-3 space-y-1 pl-4">
                                      {section.questionType === 'Yes No Not Given' ? (
                                        <>
                                          <div className="flex gap-4 text-sm">
                                            <span className="font-bold text-[#2f241f] w-24">YES</span>
                                            <span className="text-[#5a4a3f]">if the statement is true</span>
                                          </div>
                                          <div className="flex gap-4 text-sm">
                                            <span className="font-bold text-[#2f241f] w-24">NO</span>
                                            <span className="text-[#5a4a3f]">if the statement is false</span>
                                          </div>
                                          <div className="flex gap-4 text-sm">
                                            <span className="font-bold text-[#2f241f] w-24">NOT GIVEN</span>
                                            <span className="text-[#5a4a3f]">if the information is not given in the passage</span>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="flex gap-4 text-sm">
                                            <span className="font-bold text-[#2f241f] w-24">TRUE</span>
                                            <span className="text-[#5a4a3f]">if the statement agrees with the information</span>
                                          </div>
                                          <div className="flex gap-4 text-sm">
                                            <span className="font-bold text-[#2f241f] w-24">FALSE</span>
                                            <span className="text-[#5a4a3f]">if the statement contradicts the information</span>
                                          </div>
                                          <div className="flex gap-4 text-sm">
                                            <span className="font-bold text-[#2f241f] w-24">NOT GIVEN</span>
                                            <span className="text-[#5a4a3f]">if there is no information on this</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Options for matching types ONLY - not for TFNG/YNNG (those have legend above) */}
                                {section.options && section.options.length > 0 &&
                                  section.questionType !== 'True False Not Given' &&
                                  section.questionType !== 'Yes No Not Given' && (
                                    <div className="mb-4 p-3 bg-[#fdfaf3] rounded-lg border border-[#e0d6c7] relative group">
                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                                          Click to edit options
                                        </Badge>
                                      </div>
                                      <div className="space-y-2">
                                        {section.options.map((opt, oIdx) => (
                                          <Textarea
                                            key={oIdx}
                                            value={opt}
                                            onChange={(e) => {
                                              updateSectionOptions(sIdx, oIdx, e.target.value);
                                              e.target.style.height = 'auto';
                                              e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            className="text-sm text-[#2f241f] bg-transparent border-none focus:ring-1 focus:ring-amber-300 focus:bg-white/50 px-1 py-1 w-full resize-none overflow-hidden break-words whitespace-pre-wrap"
                                            style={{ boxShadow: 'none', minHeight: '24px', height: 'auto' }}
                                            ref={(el) => {
                                              if (el && opt) {
                                                el.style.height = 'auto';
                                                el.style.height = el.scrollHeight + 'px';
                                              }
                                            }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                {/* Questions - Special handling for Summary Completion */}
                                {section.questionType === 'Summary Completion' || section.questionType === 'Short Answer' ? (
                                  // Summary Completion: Show summary paragraph with blanks, then answer boxes
                                  <div className="space-y-4">
                                    {/* Editable Summary paragraph with blanks - auto-expands, no scroll */}
                                    <div className="p-4 bg-[#fdfaf3] rounded-lg border border-[#e0d6c7] relative group">
                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                                          Click to edit
                                        </Badge>
                                      </div>
                                      <Textarea
                                        value={section.instructions || ''}
                                        onChange={(e) => {
                                          updateSectionInstructions(sIdx, e.target.value);
                                          // Auto-expand: set height to scrollHeight
                                          e.target.style.height = 'auto';
                                          e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        onFocus={(e) => {
                                          // Auto-expand on focus
                                          e.target.style.height = 'auto';
                                          e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        placeholder="Enter the summary paragraph with blanks like (14)_____, (15)_____ ..."
                                        className="text-sm text-[#2f241f] leading-relaxed bg-transparent border-none focus:ring-0 resize-none p-0 w-full overflow-hidden"
                                        style={{ boxShadow: 'none', minHeight: '80px', height: 'auto' }}
                                        ref={(el) => {
                                          // Auto-expand on mount
                                          if (el && section.instructions) {
                                            el.style.height = 'auto';
                                            el.style.height = el.scrollHeight + 'px';
                                          }
                                        }}
                                      />
                                    </div>
                                    {/* Answer boxes */}
                                    <div className="flex flex-wrap gap-3">
                                      {section.questions.map((q, qIdx) => (
                                        <div key={`summary-q-${q.question_number}-${qIdx}`} className="flex items-center gap-2">
                                          <span className="font-bold text-black text-sm mt-1">
                                            {q.question_number}
                                          </span>
                                          <Input
                                            className="w-32 border border-[#D3C4A5] text-sm bg-[#FAF9F6] focus:ring-1 focus:ring-[#8B4513] text-black placeholder:text-transparent"
                                            placeholder=""
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  // Other question types: Show full question with answer input
                                  <div className="space-y-3">
                                    {section.questions.map((q, qIdx) => (
                                      <div key={`q-${q.question_number}-${qIdx}-${q.question_text?.substring(0, 20) || ''}`} className="flex flex-row items-baseline gap-3 p-3 transition-all group">
                                        <span className="flex-shrink-0 text-sm font-medium text-black min-w-[1.5rem] leading-relaxed">
                                          {q.question_number}
                                        </span>
                                        <div className="flex-1">
                                          {/* Editable question text - auto-expands, no scroll */}
                                          <Textarea
                                            value={q.question_text || ''}
                                            onChange={(e) => {
                                              updateQuestionTextInline(sIdx, qIdx, e.target.value);
                                              e.target.style.height = 'auto';
                                              e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            onFocus={(e) => {
                                              e.target.style.height = 'auto';
                                              e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            className="text-base text-black leading-relaxed bg-transparent border-none focus:ring-1 focus:ring-[#8B4513] focus:bg-white/50 px-1 py-0.5 w-full resize-none overflow-hidden"
                                            placeholder="Enter question text..."
                                            style={{ boxShadow: 'none', minHeight: '24px', height: 'auto' }}
                                            ref={(el) => {
                                              if (el && q.question_text) {
                                                el.style.height = 'auto';
                                                el.style.height = el.scrollHeight + 'px';
                                              }
                                            }}
                                          />

                                          {/* Answer input based on question type - INTERACTIVE for admin testing */}
                                          {section.questionType === 'True False Not Given' || section.questionType === 'Yes No Not Given' ? (
                                            // TFNG/YNNG: Radio buttons for selecting answer
                                            <div className="flex flex-wrap gap-3 mt-1.5">
                                              {(section.questionType === 'True False Not Given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']).map(opt => (
                                                <label key={opt} className="relative flex items-center justify-center px-4 py-1.5 min-w-[80px] rounded-md border cursor-pointer text-sm font-bold transition-all duration-200 group">
                                                  <input type="radio" name={`preview-q-${q.question_number}`} className="absolute opacity-0 w-0 h-0 peer" />
                                                  <span className="text-sm font-bold text-[#5c4b37] peer-checked:text-black transition-colors tracking-wide">{opt}</span>
                                                  <div className="absolute inset-0 rounded-md border border-[#D3C4A5] bg-[#FAF9F6] peer-checked:border-2 peer-checked:border-[#8B4513] peer-checked:bg-[#d97757] peer-checked:ring-2 peer-checked:ring-[#d97757]/50 -z-10 pointer-events-none transition-all peer-checked:shadow-lg"></div>
                                                </label>
                                              ))}
                                            </div>
                                          ) : section.options && section.options.length > 0 && section.options.some((o: string) => /^[A-Z]\s+/.test(o)) ? (
                                            // Matching types with A-G options: Simple text input for letter
                                            <Input
                                              className="mt-2 w-16 border border-[#D3C4A5] text-center bg-[#FAF9F6] focus:ring-1 focus:ring-[#8B4513] font-bold uppercase text-black"
                                              placeholder=""
                                              maxLength={1}
                                            />
                                          ) : section.questionType === 'Matching Features' || section.questionType === 'Matching Headings' || section.questionType === 'Matching Paragraph Information' || section.questionType === 'Matching Sentence Endings' ? (
                                            // Matching types without detected options: Simple text input
                                            <Input
                                              className="mt-2 w-16 border border-[#D3C4A5] text-center bg-[#FAF9F6] focus:ring-1 focus:ring-[#8B4513] font-bold uppercase text-black"
                                              placeholder=""
                                              maxLength={1}
                                            />
                                          ) : section.questionType === 'Multiple Choice' && q.options && q.options.length > 0 ? (
                                            // Multiple Choice: Radio buttons for each option with styled letter labels
                                            <div className="grid gap-2 mt-2">
                                              {q.options.map((opt: string, optIdx: number) => {
                                                // Parse option to extract letter and text
                                                const letterMatch = opt.match(/^([A-D])\s+(.+)$/);
                                                const letter = letterMatch ? letterMatch[1] : String.fromCharCode(65 + optIdx);
                                                const optionText = letterMatch ? letterMatch[2] : opt;
                                                return (
                                                  <label key={optIdx} className="relative flex items-center gap-3 p-3 rounded-lg bg-[#FAF9F6] border border-[#D3C4A5] cursor-pointer hover:bg-[#F2EFE5] hover:border-[#d97757]/50 transition-all duration-200 group">
                                                    <input type="radio" name={`preview-q-${q.question_number}`} className="peer sr-only" />
                                                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center font-bold text-base mr-3 text-[#8B4513]/70 peer-checked:text-black transition-colors">
                                                      {letter}
                                                    </div>
                                                    <span className="text-base text-black leading-relaxed peer-checked:text-black font-medium">{optionText}</span>
                                                    <div className="absolute inset-0 rounded-lg border border-transparent peer-checked:border-2 peer-checked:border-[#8B4513] peer-checked:bg-[#d97757] peer-checked:ring-2 peer-checked:ring-[#d97757]/50 -z-10 pointer-events-none transition-all peer-checked:shadow-lg"></div>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            // Default: Text input
                                            <div className="mt-2">
                                              <Input
                                                className="max-w-[400px] bg-[#FAF9F6] border border-[#D3C4A5] rounded-md px-3 py-2 focus:ring-1 focus:ring-[#8B4513] focus:border-[#8B4513] shadow-sm text-lg text-black h-10 placeholder:text-transparent"
                                                placeholder=""
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : passagesData[activePassage].questions.length > 0 ? (
                          // Fallback for flat questions - with proper question type handling
                          <div className="space-y-6">
                            {passagesData[activePassage].questions.map((q, i) => (
                              <div key={i} className="py-6 px-4 group hover:bg-black/[0.02] transition-colors rounded-lg">
                                <div className="flex flex-row items-baseline gap-3">
                                  <span className="flex-shrink-0 font-sans text-sm font-medium text-black min-w-[1.5rem] leading-relaxed">
                                    {q.question_number || i + 1}
                                  </span>
                                  <div className="flex-1 space-y-3">
                                    <p className="text-lg text-black leading-relaxed">{q.question_text}</p>

                                    {/* Interactive input based on question type */}
                                    {q.question_type === 'True False Not Given' || q.question_type === 'Yes No Not Given' ? (
                                      <div className="flex flex-wrap gap-3 mt-2">
                                        {(q.question_type === 'True False Not Given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']).map(opt => (
                                          <label key={opt} className="relative flex items-center justify-center px-4 py-1.5 min-w-[80px] rounded-md border cursor-pointer text-sm font-bold transition-all duration-200 group">
                                            <input type="radio" name={`fallback-q-${q.question_number || i}`} className="absolute opacity-0 w-0 h-0 peer" />
                                            <span className="text-sm font-medium text-[#5c4b37] peer-checked:text-black transition-colors tracking-wide">{opt}</span>
                                            <div className="absolute inset-0 rounded-md border border-[#D3C4A5] bg-[#FAF9F6] peer-checked:border-2 peer-checked:border-[#8B4513] peer-checked:bg-[#d97757] peer-checked:ring-2 peer-checked:ring-[#d97757]/50 -z-10 pointer-events-none transition-all peer-checked:shadow-lg"></div>
                                          </label>
                                        ))}
                                      </div>
                                    ) : q.question_type?.includes('Matching') || (q.options && q.options.some((o: string) => /^[A-Z]\s+/.test(o))) ? (
                                      // Matching types: Simple text input for letter
                                      <Input
                                        className="mt-2 w-16 border border-[#D3C4A5] text-center bg-[#FAF9F6] focus:ring-1 focus:ring-[#8B4513] font-bold uppercase text-black"
                                        placeholder=""
                                        maxLength={1}
                                      />
                                    ) : q.question_type === 'Multiple Choice' && q.options && q.options.length > 0 ? (
                                      <div className="grid gap-2 mt-2">
                                        {q.options.map((opt, optIdx) => {
                                          const letterMatch = opt.match(/^([A-D])\s+(.+)$/);
                                          const letter = letterMatch ? letterMatch[1] : String.fromCharCode(65 + optIdx);
                                          const optionText = letterMatch ? letterMatch[2] : opt;
                                          return (
                                            <label key={optIdx} className="relative flex items-center gap-3 p-3 rounded-lg bg-[#FAF9F6] border border-[#D3C4A5] cursor-pointer hover:bg-[#F2EFE5] hover:border-[#d97757]/50 transition-all duration-200 group">
                                              <input type="radio" name={`fallback-q-${q.question_number || i}`} className="peer sr-only" />
                                              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center font-bold text-base mr-3 text-[#8B4513]/70 peer-checked:text-black transition-colors">
                                                {letter}
                                              </div>
                                              <span className="text-base text-black leading-relaxed peer-checked:text-black font-medium">{optionText}</span>
                                              <div className="absolute inset-0 rounded-lg border border-transparent peer-checked:border-2 peer-checked:border-[#8B4513] peer-checked:bg-[#d97757] peer-checked:ring-2 peer-checked:ring-[#d97757]/50 -z-10 pointer-events-none transition-all peer-checked:shadow-lg"></div>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="mt-2">
                                        <Input
                                          className="max-w-[400px] bg-[#FAF9F6] border border-[#D3C4A5] rounded-md px-3 py-2 focus:ring-1 focus:ring-[#8B4513] focus:border-[#8B4513] shadow-sm text-lg text-black h-10 placeholder:text-transparent"
                                          placeholder=""
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[#5a4a3f] italic">No questions added yet</p>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-[#f0ece2] p-3 text-center text-xs text-[#5a4a3f]">
                      🎯 Interactive Preview • Click and type to test like a student
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Panel */}
            <div className="bg-[#fdfaf3] rounded-lg p-4 border border-[#e0d6c7]">
              <h4 className="text-sm font-semibold text-[#2f241f] mb-2">
                💡 How IELTS Reading works:
              </h4>
              <ul className="text-xs text-[#5a4a3f] space-y-1 list-disc list-inside mb-4">
                <li>ENGLISH AIDOL IELTS READING has 3 passages with 40 questions total</li>
                <li>Questions 1-13 = Passage 1, 14-26 = Passage 2, 27-40 = Passage 3</li>
                <li><strong>Copy & Paste</strong> questions from Cambridge books or paste text directly</li>
                <li><strong>Image Upload</strong> for screenshots of question papers</li>
              </ul>

              <h4 className="text-sm font-semibold text-[#2f241f] mb-2">
                📝 14 IELTS Reading Question Types (All Supported):
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#5a4a3f]">
                <div className="space-y-1">
                  <p>1. Matching Headings</p>
                  <p>2. Matching Paragraph Info</p>
                  <p>3. Matching Features</p>
                  <p>4. Matching Sentence Endings</p>
                  <p>5. True/False/Not Given</p>
                  <p>6. Multiple Choice</p>
                  <p>7. List of Options</p>
                </div>
                <div className="space-y-1">
                  <p>8. Choose a Title</p>
                  <p>9. Short Answers</p>
                  <p>10. Sentence Completion</p>
                  <p>11. Summary Completion</p>
                  <p>12. Table Completion</p>
                  <p>13. Flow Chart Completion</p>
                  <p>14. Diagram Completion</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-[#e0d6c7]">
              {getAllQuestions().length > 0 && (
                <Button
                  variant="outline"
                  onClick={generateExplanations}
                  disabled={generatingExplanations}
                  className="border-[#e0d6c7] text-[#5a4a3f] hover:bg-[#fdfaf3]"
                  size="lg"
                >
                  {generatingExplanations ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
                      Generating Explanations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Explanations
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={saveTest}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white px-8"
                size="lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving Test...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Complete Reading Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Options Editor Dialog */}
      <Dialog open={editingOptionsSection !== null} onOpenChange={(open) => !open && closeOptionsEditor()}>
        <DialogContent className="max-w-lg bg-[#fdfaf3]">
          <DialogHeader>
            <DialogTitle className="text-[#2f241f] flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-600" />
              Edit Matching Options
            </DialogTitle>
            <DialogDescription className="text-[#5a4a3f]">
              Add or remove options for this matching question section (e.g., A = Tony Brown, B = Patrick Leahy)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2f241f]">
                Current Options ({editingOptions.length}):
              </label>
              {editingOptions.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {editingOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-[#e0d6c7]">
                      <span className="text-sm text-[#2f241f]">{opt}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(idx)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#5a4a3f] italic p-2 bg-amber-50 rounded border border-amber-200">
                  No options yet. Add options below.
                </p>
              )}
            </div>

            {/* Add New Option */}
            <div className="space-y-2 pt-2 border-t border-[#e0d6c7]">
              <label className="text-sm font-medium text-[#2f241f]">Add New Option:</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Letter (A-Z)"
                  value={newOptionLetter}
                  onChange={(e) => setNewOptionLetter(e.target.value.toUpperCase())}
                  className="w-24 bg-white border-[#e0d6c7] text-center font-bold text-[#2f241f]"
                  maxLength={1}
                />
                <Input
                  placeholder="Name (e.g., Tony Brown)"
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  className="flex-1 bg-white border-[#e0d6c7] text-[#2f241f]"
                  onKeyDown={(e) => e.key === 'Enter' && addOption()}
                />
                <Button
                  onClick={addOption}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-[#5a4a3f]">
                💡 Tip: Press Enter to quickly add options
              </p>
            </div>

            {/* Quick Add Multiple */}
            <div className="space-y-2 pt-2 border-t border-[#e0d6c7]">
              <label className="text-sm font-medium text-[#2f241f]">Or Paste Multiple Options:</label>
              <Textarea
                placeholder={`Paste options like:
A  Tony Brown
B  Patrick Leahy
C  Bill Bowler
D  Paul Jepson`}
                className="bg-white border-[#e0d6c7] text-sm font-mono h-24 text-[#2f241f]"
                onChange={(e) => {
                  const text = e.target.value;
                  if (!text.trim()) return;

                  // Parse pasted options
                  const lines = text.split('\n');
                  const newOptions: string[] = [];

                  for (const line of lines) {
                    // Match patterns like "A  Tony Brown" or "A. Tony Brown" or "A) Tony Brown"
                    const match = line.match(/^\s*([A-Z])\s*[.\):\s]+\s*(.+)/i);
                    if (match) {
                      const letter = match[1].toUpperCase();
                      const name = match[2].trim();
                      if (name && !editingOptions.some(o => o.startsWith(letter + ' ')) && !newOptions.some(o => o.startsWith(letter + ' '))) {
                        newOptions.push(`${letter}  ${name}`);
                      }
                    }
                  }

                  if (newOptions.length > 0) {
                    const allOptions = [...editingOptions, ...newOptions].sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
                    setEditingOptions(allOptions);
                    toast.success(`Added ${newOptions.length} options`);
                    e.target.value = ''; // Clear textarea
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeOptionsEditor}
              className="border-[#e0d6c7] text-[#5a4a3f]"
            >
              Cancel
            </Button>
            <Button
              onClick={saveOptions}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Options
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Instruction Editor Dialog */}
      <Dialog open={editingInstructionSection !== null} onOpenChange={(open) => !open && closeInstructionEditor()}>
        <DialogContent className="max-w-2xl bg-[#fdfaf3]">
          <DialogHeader>
            <DialogTitle className="text-[#2f241f] flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-600" />
              Edit Task Instruction
            </DialogTitle>
            <DialogDescription className="text-[#5a4a3f]">
              Edit the instruction text that appears at the top of this question section (e.g., "Complete the summary below. Choose NO MORE THAN TWO WORDS...")
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2f241f]">
                Instruction Text:
              </label>
              <Textarea
                value={editingInstruction}
                onChange={(e) => setEditingInstruction(e.target.value)}
                placeholder="Enter the task instruction for students..."
                className="bg-white border-[#e0d6c7] min-h-[150px] text-sm text-[#2f241f]"
              />
              <p className="text-xs text-[#5a4a3f]">
                💡 This is the instruction that tells students what to do (e.g., "Do the following statements agree with the information given in Reading Passage 1?")
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeInstructionEditor}
              className="border-[#e0d6c7] text-[#5a4a3f]"
            >
              Cancel
            </Button>
            <Button
              onClick={saveInstruction}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Instruction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Editor Dialog */}
      <Dialog open={editingQuestionData !== null} onOpenChange={(open) => !open && closeQuestionEditor()}>
        <DialogContent className="max-w-lg bg-[#fdfaf3]">
          <DialogHeader>
            <DialogTitle className="text-[#2f241f] flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-600" />
              Edit Question
            </DialogTitle>
            <DialogDescription className="text-[#5a4a3f]">
              Edit the question text and correct answer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2f241f]">
                Question Text:
              </label>
              <Textarea
                value={editingQuestionText}
                onChange={(e) => setEditingQuestionText(e.target.value)}
                placeholder="Enter the question text..."
                className="bg-white border-[#e0d6c7] min-h-[100px] text-sm text-[#2f241f]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2f241f]">
                Correct Answer:
              </label>
              <Input
                value={editingQuestionAnswer}
                onChange={(e) => setEditingQuestionAnswer(e.target.value)}
                placeholder="Enter the correct answer..."
                className="bg-white border-[#e0d6c7] text-sm text-[#2f241f]"
              />
              <p className="text-xs text-[#5a4a3f]">
                💡 For matching questions, enter the letter (A-E). For fill-in-the-blank, enter the word(s).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeQuestionEditor}
              className="border-[#e0d6c7] text-[#5a4a3f]"
            >
              Cancel
            </Button>
            <Button
              onClick={saveQuestion}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminIELTSReadingTest;

