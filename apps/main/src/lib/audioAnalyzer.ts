/**
 * Audio Analyzer - Extracts acoustic metrics from audio recordings
 * Used for IELTS Speaking evaluation to provide objective measurements
 */

export interface AcousticMetrics {
  speechRate: number;         // Words per minute (estimated)
  pauseRatio: number;         // Pause time / total time (0-1)
  pauseCount: number;         // Number of pauses detected
  averagePauseDuration: number; // Average pause length in seconds
  pitchVariation: number;     // Pitch variation score (0-100)
  volumeConsistency: number;  // Volume stability (0-100)
  totalDuration: number;      // Total audio duration in seconds
  speakingDuration: number;   // Time spent speaking (excluding pauses)
  silenceSegments: { start: number; end: number }[]; // Pause locations
}

/**
 * Analyze audio blob and extract acoustic metrics
 */
export async function analyzeAudio(audioBlob: Blob): Promise<AcousticMetrics> {
  return new Promise((resolve, reject) => {
    const audioContext = new AudioContext();
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const metrics = extractMetrics(audioBuffer);
        resolve(metrics);
      } catch (error) {
        console.error('Audio analysis error:', error);
        // Return default metrics on error
        resolve(getDefaultMetrics());
      } finally {
        audioContext.close();
      }
    };

    reader.onerror = () => {
      resolve(getDefaultMetrics());
    };

    reader.readAsArrayBuffer(audioBlob);
  });
}

function getDefaultMetrics(): AcousticMetrics {
  return {
    speechRate: 0,
    pauseRatio: 0,
    pauseCount: 0,
    averagePauseDuration: 0,
    pitchVariation: 50,
    volumeConsistency: 50,
    totalDuration: 0,
    speakingDuration: 0,
    silenceSegments: []
  };
}

function extractMetrics(audioBuffer: AudioBuffer): AcousticMetrics {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const totalDuration = audioBuffer.duration;

  // Analyze volume/amplitude
  const { rms, volumeVariation, volumeConsistency } = analyzeVolume(channelData);
  
  // Detect pauses (silence segments)
  const { silenceSegments, pauseRatio, pauseCount, averagePauseDuration, speakingDuration } = 
    detectPauses(channelData, sampleRate, totalDuration);

  // Estimate pitch variation (using zero-crossing rate as proxy)
  const pitchVariation = analyzePitchVariation(channelData, sampleRate);

  // Estimate speech rate (words per minute)
  // Based on speaking duration and typical speech patterns
  const speechRate = estimateSpeechRate(speakingDuration, silenceSegments.length);

  return {
    speechRate,
    pauseRatio,
    pauseCount,
    averagePauseDuration,
    pitchVariation,
    volumeConsistency,
    totalDuration,
    speakingDuration,
    silenceSegments
  };
}

function analyzeVolume(channelData: Float32Array): { 
  rms: number; 
  volumeVariation: number; 
  volumeConsistency: number 
} {
  // Calculate RMS (Root Mean Square) for overall volume
  let sumSquares = 0;
  const volumes: number[] = [];
  const windowSize = 4410; // ~100ms at 44.1kHz
  
  for (let i = 0; i < channelData.length; i += windowSize) {
    let windowSum = 0;
    const end = Math.min(i + windowSize, channelData.length);
    for (let j = i; j < end; j++) {
      windowSum += channelData[j] * channelData[j];
    }
    const windowRms = Math.sqrt(windowSum / (end - i));
    volumes.push(windowRms);
    sumSquares += windowSum;
  }
  
  const rms = Math.sqrt(sumSquares / channelData.length);
  
  // Calculate volume consistency (inverse of coefficient of variation)
  const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const variance = volumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / volumes.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;
  
  // Convert to 0-100 scale (lower CV = more consistent = higher score)
  const volumeConsistency = Math.max(0, Math.min(100, 100 - (cv * 100)));
  
  return { rms, volumeVariation: cv, volumeConsistency };
}

function detectPauses(
  channelData: Float32Array, 
  sampleRate: number,
  totalDuration: number
): {
  silenceSegments: { start: number; end: number }[];
  pauseRatio: number;
  pauseCount: number;
  averagePauseDuration: number;
  speakingDuration: number;
} {
  const silenceThreshold = 0.01; // Amplitude threshold for silence
  const minPauseDuration = 0.3; // Minimum pause duration in seconds (300ms)
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
  
  const silenceSegments: { start: number; end: number }[] = [];
  let inSilence = false;
  let silenceStart = 0;
  let totalPauseDuration = 0;
  
  for (let i = 0; i < channelData.length; i += windowSize) {
    // Calculate RMS for this window
    let sum = 0;
    const end = Math.min(i + windowSize, channelData.length);
    for (let j = i; j < end; j++) {
      sum += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sum / (end - i));
    const isSilent = rms < silenceThreshold;
    const currentTime = i / sampleRate;
    
    if (isSilent && !inSilence) {
      // Start of silence
      inSilence = true;
      silenceStart = currentTime;
    } else if (!isSilent && inSilence) {
      // End of silence
      inSilence = false;
      const duration = currentTime - silenceStart;
      if (duration >= minPauseDuration) {
        silenceSegments.push({ start: silenceStart, end: currentTime });
        totalPauseDuration += duration;
      }
    }
  }
  
  // Handle case where audio ends in silence
  if (inSilence) {
    const duration = totalDuration - silenceStart;
    if (duration >= minPauseDuration) {
      silenceSegments.push({ start: silenceStart, end: totalDuration });
      totalPauseDuration += duration;
    }
  }
  
  const pauseCount = silenceSegments.length;
  const pauseRatio = totalDuration > 0 ? totalPauseDuration / totalDuration : 0;
  const averagePauseDuration = pauseCount > 0 ? totalPauseDuration / pauseCount : 0;
  const speakingDuration = totalDuration - totalPauseDuration;
  
  return {
    silenceSegments,
    pauseRatio,
    pauseCount,
    averagePauseDuration,
    speakingDuration
  };
}

function analyzePitchVariation(channelData: Float32Array, sampleRate: number): number {
  // Use zero-crossing rate as a proxy for pitch variation
  // More variation in ZCR suggests more pitch variation
  const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
  const zcrs: number[] = [];
  
  for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
    let crossings = 0;
    for (let j = i; j < i + windowSize - 1; j++) {
      if ((channelData[j] >= 0 && channelData[j + 1] < 0) ||
          (channelData[j] < 0 && channelData[j + 1] >= 0)) {
        crossings++;
      }
    }
    zcrs.push(crossings);
  }
  
  if (zcrs.length < 2) return 50;
  
  // Calculate variation in zero-crossing rates
  const mean = zcrs.reduce((a, b) => a + b, 0) / zcrs.length;
  const variance = zcrs.reduce((sum, z) => sum + Math.pow(z - mean, 2), 0) / zcrs.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;
  
  // Convert to 0-100 scale
  // Higher variation = better intonation (up to a point)
  const pitchVariation = Math.min(100, Math.max(0, cv * 200));
  
  return pitchVariation;
}

function estimateSpeechRate(speakingDuration: number, pauseCount: number): number {
  if (speakingDuration <= 0) return 0;
  
  // Average speaking rate is ~150 WPM for native English
  // Estimate based on speaking duration and assumed syllable rate
  // Typical: 4-5 syllables per second when speaking
  const estimatedSyllables = speakingDuration * 4.5;
  const estimatedWords = estimatedSyllables / 1.5; // ~1.5 syllables per word on average
  const wordsPerMinute = (estimatedWords / speakingDuration) * 60;
  
  return Math.round(wordsPerMinute);
}

/**
 * Get interpretation of metrics for display
 */
export function interpretMetrics(metrics: AcousticMetrics): {
  speechRate: { value: number; label: string; status: 'good' | 'warning' | 'poor' };
  pauseRatio: { value: number; label: string; status: 'good' | 'warning' | 'poor' };
  pitchVariation: { value: number; label: string; status: 'good' | 'warning' | 'poor' };
  volumeConsistency: { value: number; label: string; status: 'good' | 'warning' | 'poor' };
} {
  // Speech Rate interpretation (ideal: 120-160 WPM)
  let speechRateStatus: 'good' | 'warning' | 'poor' = 'good';
  let speechRateLabel = 'Natural pace';
  if (metrics.speechRate < 100) {
    speechRateStatus = 'warning';
    speechRateLabel = 'Too slow';
  } else if (metrics.speechRate > 180) {
    speechRateStatus = 'warning';
    speechRateLabel = 'Too fast';
  } else if (metrics.speechRate < 80 || metrics.speechRate > 200) {
    speechRateStatus = 'poor';
    speechRateLabel = metrics.speechRate < 80 ? 'Very slow' : 'Very fast';
  }

  // Pause Ratio interpretation (ideal: 10-25%)
  let pauseRatioStatus: 'good' | 'warning' | 'poor' = 'good';
  let pauseRatioLabel = 'Natural pausing';
  const pausePercent = metrics.pauseRatio * 100;
  if (pausePercent < 5) {
    pauseRatioStatus = 'warning';
    pauseRatioLabel = 'Too few pauses';
  } else if (pausePercent > 35) {
    pauseRatioStatus = 'warning';
    pauseRatioLabel = 'Too many pauses';
  } else if (pausePercent > 50) {
    pauseRatioStatus = 'poor';
    pauseRatioLabel = 'Excessive pausing';
  }

  // Pitch Variation interpretation (ideal: 40-80)
  let pitchStatus: 'good' | 'warning' | 'poor' = 'good';
  let pitchLabel = 'Good intonation';
  if (metrics.pitchVariation < 30) {
    pitchStatus = 'warning';
    pitchLabel = 'Monotone';
  } else if (metrics.pitchVariation < 20) {
    pitchStatus = 'poor';
    pitchLabel = 'Very flat';
  } else if (metrics.pitchVariation > 90) {
    pitchStatus = 'warning';
    pitchLabel = 'Erratic pitch';
  }

  // Volume Consistency interpretation (ideal: 60-90)
  let volumeStatus: 'good' | 'warning' | 'poor' = 'good';
  let volumeLabel = 'Consistent volume';
  if (metrics.volumeConsistency < 50) {
    volumeStatus = 'warning';
    volumeLabel = 'Uneven volume';
  } else if (metrics.volumeConsistency < 30) {
    volumeStatus = 'poor';
    volumeLabel = 'Very inconsistent';
  }

  return {
    speechRate: { value: metrics.speechRate, label: speechRateLabel, status: speechRateStatus },
    pauseRatio: { value: Math.round(pausePercent), label: pauseRatioLabel, status: pauseRatioStatus },
    pitchVariation: { value: Math.round(metrics.pitchVariation), label: pitchLabel, status: pitchStatus },
    volumeConsistency: { value: Math.round(metrics.volumeConsistency), label: volumeLabel, status: volumeStatus }
  };
}

