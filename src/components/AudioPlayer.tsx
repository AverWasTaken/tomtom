import { forwardRef, useEffect, useRef, useState, useImperativeHandle, useCallback } from "react";

interface AudioPlayerProps {
  audioUrl: string | null;
  audioFile?: File | null; // Optional direct file reference for waveform decoding
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  zoom: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayStateChange: (playing: boolean) => void;
  onZoomChange: (zoom: number) => void;
}

interface BeatData {
  time: number;
  strength: number;
}

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  (
    { audioUrl, audioFile, currentTime, duration, isPlaying, zoom, onTimeUpdate, onDurationChange, onPlayStateChange, onZoomChange },
    ref
  ) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const waveformScrollRef = useRef<HTMLDivElement>(null);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const [beatData, setBeatData] = useState<BeatData[]>([]);
    const [isLoadingWaveform, setIsLoadingWaveform] = useState(false);
    const [isUserScrollingWaveform, setIsUserScrollingWaveform] = useState(false);
    const [lastWaveformScrollTime, setLastWaveformScrollTime] = useState(0);
  const [beatJumpIndicator, setBeatJumpIndicator] = useState<string | null>(null);

    // Expose audio element ref to parent
    useImperativeHandle(ref, () => audioRef.current!, []);

    // Calculate waveform display width based on zoom
    const waveformDisplayWidth = Math.max(800, duration * 60 * zoom);

    // Auto-scroll waveform to follow playhead during playback
    useEffect(() => {
      if (!isPlaying || isUserScrollingWaveform || !waveformScrollRef.current || !duration) return;

      const scrollContainer = waveformScrollRef.current;
      const playheadPosition = (currentTime / duration) * waveformDisplayWidth;
      const containerWidth = scrollContainer.clientWidth;
      const currentScrollLeft = scrollContainer.scrollLeft;
      
      // Calculate if playhead is outside visible area
      const leftEdge = currentScrollLeft;
      const rightEdge = currentScrollLeft + containerWidth;
      const margin = containerWidth * 0.1; // 10% margin from edges
      
      // Auto-scroll if playhead is near edges or outside visible area
      if (playheadPosition < leftEdge + margin || playheadPosition > rightEdge - margin) {
        // Center the playhead in the view
        const targetScrollLeft = playheadPosition - containerWidth / 2;
        
        scrollContainer.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth'
        });
      }
    }, [currentTime, isPlaying, waveformDisplayWidth, duration, isUserScrollingWaveform]);

    // Track user scrolling to temporarily disable auto-scroll
    useEffect(() => {
      const scrollContainer = waveformScrollRef.current;
      if (!scrollContainer) return;

      const handleScroll = () => {
        setIsUserScrollingWaveform(true);
        setLastWaveformScrollTime(Date.now());
      };

      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }, []);

    // Reset user scrolling flag after inactivity
    useEffect(() => {
      if (!isUserScrollingWaveform) return;

      const timeout = setTimeout(() => {
        if (Date.now() - lastWaveformScrollTime > 2000) { // 2 seconds of no scrolling
          setIsUserScrollingWaveform(false);
        }
      }, 2100);

      return () => clearTimeout(timeout);
    }, [isUserScrollingWaveform, lastWaveformScrollTime]);

    // Handle audio events
    const handleLoadedMetadata = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      onDurationChange(audio.duration ?? 0);
    }, [onDurationChange]);

    // Advanced waveform and beat detection
    const generateAdvancedWaveform = useCallback(async () => {
      const audio = audioRef.current;
      if (!audio || (!audioUrl && !audioFile)) return;

      console.log("Starting advanced waveform generation for:", audioFile?.name ?? audioUrl);
      setIsLoadingWaveform(true);
      
      try {
        const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("AudioContext not supported");
        }
        
        const audioContext = new AudioContextClass();
        let arrayBuffer: ArrayBuffer;

        if (audioFile) {
          arrayBuffer = await audioFile.arrayBuffer();
        } else {
          const response = await fetch(audioUrl!);
          arrayBuffer = await response.arrayBuffer();
        }
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        console.log("Audio buffer decoded:", {
          length: audioBuffer.length,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels
        });
        
        const rawData = audioBuffer.getChannelData(0);
        // Reduced resolution for better performance while maintaining beat accuracy
        const samples = Math.min(1500, Math.floor(audioBuffer.length / 1024));
        const blockSize = Math.floor(rawData.length / samples);
        
        // Generate high-resolution waveform data with peak detection
        const waveformPoints: number[] = [];
        const beats: BeatData[] = [];
        
        // For beat detection, we'll use a simple onset detection algorithm
        let previousEnergy = 0;
        const beatThreshold = 1.3; // Threshold for beat detection
        
        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          const blockEnd = Math.min(blockStart + blockSize, rawData.length);
          
          // Calculate RMS (energy) for beat detection
          let energy = 0;
          let peak = 0;
          let rms = 0;
          
          for (let j = blockStart; j < blockEnd; j++) {
            const sample = rawData[j] ?? 0;
            const absSample = Math.abs(sample);
            peak = Math.max(peak, absSample);
            rms += sample * sample;
          }
          
          rms = Math.sqrt(rms / (blockEnd - blockStart));
          energy = rms;
          
          // Combine peak and RMS for better transient detection
          const amplitude = Math.max(peak, rms * 2);
          waveformPoints.push(amplitude);
          
          // Beat detection: look for energy increases
          if (energy > previousEnergy * beatThreshold && energy > 0.1) {
            const timePosition = (i / samples) * audioBuffer.duration;
            beats.push({
              time: timePosition,
              strength: energy / previousEnergy
            });
          }
          
          previousEnergy = energy * 0.7 + previousEnergy * 0.3; // Smooth energy envelope
        }
        
        // Normalize waveform data
        const maxVal = Math.max(...waveformPoints);
        const normalizedWaveform = waveformPoints.map(val => maxVal > 0 ? val / maxVal : 0);
        
        console.log("Optimized waveform generated:", {
          samples: normalizedWaveform.length,
          beats: beats.length,
          maxAmplitude: Math.max(...normalizedWaveform),
          avgAmplitude: normalizedWaveform.reduce((a, b) => a + b, 0) / normalizedWaveform.length
        });
        
        setWaveformData(normalizedWaveform);
        setBeatData(beats);
        await audioContext.close();
      } catch (error) {
        console.error("Error generating advanced waveform:", error);
        setWaveformData(new Array(100).fill(0.1));
        setBeatData([]);
      } finally {
        setIsLoadingWaveform(false);
      }
    }, [audioUrl, audioFile]);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleTimeUpdate = () => {
        onTimeUpdate(audio.currentTime);
      };

      const handleDurationChange = () => {
        onDurationChange(audio.duration ?? 0);
      };

      const handleEnded = () => {
        onPlayStateChange(false);
      };

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("durationchange", handleDurationChange);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("ended", handleEnded);

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("durationchange", handleDurationChange);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("ended", handleEnded);
      };
    }, [onTimeUpdate, onDurationChange, onPlayStateChange, handleLoadedMetadata]);

    // Control play/pause
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        void audio.play().catch(console.error);
      } else {
        audio.pause();
      }
    }, [isPlaying]);

    // Update audio time when currentTime changes externally
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (Math.abs(audio.currentTime - currentTime) > 0.1) {
        audio.currentTime = currentTime;
      }
    }, [currentTime]);

    // Regenerate waveform when the source changes
    useEffect(() => {
      if (audioUrl || audioFile) {
        void generateAdvancedWaveform();
      }
    }, [generateAdvancedWaveform, audioUrl, audioFile]);

    // Enhanced but optimized waveform drawing with zoom support
    const drawAdvancedWaveform = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size to match the zoomed waveform width
      const dpr = window.devicePixelRatio ?? 1;
      const height = 96; // Fixed height
      
      canvas.width = waveformDisplayWidth * dpr;
      canvas.height = height * dpr;
      canvas.style.width = waveformDisplayWidth + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);

      const width = waveformDisplayWidth;
      ctx.clearRect(0, 0, width, height);

      // Dark background
      ctx.fillStyle = "#1F2937";
      ctx.fillRect(0, 0, width, height);
      
      // Draw simplified time grid (only major intervals)
      if (duration > 0) {
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 1;
        const majorInterval = Math.max(1, Math.floor(duration / 10));
        const secondWidth = width / duration;
        
        for (let second = 0; second <= duration; second += majorInterval) {
          const x = second * secondWidth;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }

      // If no waveform data, show loading or placeholder
      if (!waveformData.length) {
        ctx.fillStyle = "#6B7280";
        ctx.fillRect(0, height / 2 - 1, width, 2);
        
        if (isLoadingWaveform) {
          ctx.fillStyle = "#9CA3AF";
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Analyzing audio for beats...", width / 2, height / 2 + 20);
        }
        return;
      }

      // Draw simplified waveform
      const barWidth = width / waveformData.length;
      
      // Background waveform (single color, no gradients for performance)
      ctx.fillStyle = "#4B5563";
      waveformData.forEach((value, index) => {
        const barHeight = Math.max(1, value * height * 0.7);
        const x = index * barWidth;
        const y = (height - barHeight) / 2;
        ctx.fillRect(x, y, Math.max(1, barWidth * 0.8), barHeight);
      });

      // Draw beat markers (simplified)
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 2;
      beatData.forEach(beat => {
        if (beat.time <= duration) {
          const x = (beat.time / duration) * width;
          const strength = Math.min(beat.strength, 2);
          
          // Simple beat line (no variable width for performance)
          ctx.globalAlpha = 0.4 + strength * 0.3;
          ctx.beginPath();
          ctx.moveTo(x, height * 0.2);
          ctx.lineTo(x, height * 0.8);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      // Progress overlay (simplified)
      if (duration > 0 && currentTime > 0) {
        const progressWidth = (currentTime / duration) * width;
        
        // Create clipping region for progress
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, progressWidth, height);
        ctx.clip();
        
        // Draw progress waveform (single color, no gradients)
        ctx.fillStyle = "#3B82F6";
        waveformData.forEach((value, index) => {
          const barHeight = Math.max(1, value * height * 0.7);
          const x = index * barWidth;
          const y = (height - barHeight) / 2;
          ctx.fillRect(x, y, Math.max(1, barWidth * 0.8), barHeight);
        });
        
        ctx.restore();
        
        // Current time indicator line
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(progressWidth, 0);
        ctx.lineTo(progressWidth, height);
        ctx.stroke();
      }

      // Draw time labels (simplified, fewer labels)
      if (duration > 0) {
        ctx.fillStyle = "#9CA3AF";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        
        const labelInterval = Math.max(5, Math.floor(duration / 6));
        for (let second = 0; second <= duration; second += labelInterval) {
          const x = (second / duration) * width;
          const label = formatTime(second);
          ctx.fillText(label, x, height - 4);
        }
      }
    }, [waveformDisplayWidth, duration, waveformData, beatData, currentTime, isLoadingWaveform]);

    // Throttled redraw to improve performance
    const lastDrawTime = useRef(0);
    const drawThrottled = useCallback(() => {
      const now = Date.now();
      if (now - lastDrawTime.current > 33) { // ~30fps max
        drawAdvancedWaveform();
        lastDrawTime.current = now;
      }
    }, [drawAdvancedWaveform]);

    useEffect(() => {
      drawThrottled();
    }, [drawThrottled, waveformData, beatData, isLoadingWaveform, zoom]);

    // Separate effect for time updates with throttling
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        drawThrottled();
      }, 33); // ~30fps for time updates
      
      return () => clearTimeout(timeoutId);
    }, [drawThrottled, currentTime, duration, zoom]);

    // Handle canvas resize with debouncing
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let resizeTimeout: NodeJS.Timeout;
      const resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          drawAdvancedWaveform();
        }, 100); // Longer debounce for resize
      });

      resizeObserver.observe(canvas);
      return () => {
        resizeObserver.disconnect();
        clearTimeout(resizeTimeout);
      };
    }, [drawAdvancedWaveform, waveformData, beatData, zoom]);

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!duration) return;
      
      const canvas = canvasRef.current;
      const scrollContainer = waveformScrollRef.current;
      if (!canvas || !scrollContainer) return;
      
      const containerRect = scrollContainer.getBoundingClientRect();
      const x = e.clientX - containerRect.left + scrollContainer.scrollLeft;
      const newTime = (x / waveformDisplayWidth) * duration;
      
      onTimeUpdate(newTime);
      
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
      
      // Force auto-scroll to resume after seeking
      setIsUserScrollingWaveform(false);
    };

      const togglePlay = () => {
    onPlayStateChange(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Beat navigation functions
  const goToPreviousBeat = () => {
    if (beatData.length === 0) return;
    
    // Find the last beat before current time (with small tolerance for exact matches)
    const previousBeat = beatData
      .filter(beat => beat.time < currentTime - 0.1)
      .pop(); // Get the last one (closest to current time)
    
    if (previousBeat) {
      onTimeUpdate(previousBeat.time);
      if (audioRef.current) {
        audioRef.current.currentTime = previousBeat.time;
      }
      // Force auto-scroll to resume after seeking
      setIsUserScrollingWaveform(false);
      // Show visual feedback
      setBeatJumpIndicator('◀ Previous Beat');
      setTimeout(() => setBeatJumpIndicator(null), 1000);
    } else {
      // If no previous beat, go to beginning
      onTimeUpdate(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setIsUserScrollingWaveform(false);
      setBeatJumpIndicator('◀ Start');
      setTimeout(() => setBeatJumpIndicator(null), 1000);
    }
  };

  const goToNextBeat = () => {
    if (beatData.length === 0) return;
    
    // Find the first beat after current time (with small tolerance for exact matches)
    const nextBeat = beatData.find(beat => beat.time > currentTime + 0.1);
    
    if (nextBeat) {
      onTimeUpdate(nextBeat.time);
      if (audioRef.current) {
        audioRef.current.currentTime = nextBeat.time;
      }
      // Force auto-scroll to resume after seeking
      setIsUserScrollingWaveform(false);
      // Show visual feedback
      setBeatJumpIndicator('▶ Next Beat');
      setTimeout(() => setBeatJumpIndicator(null), 1000);
    }
  };

  // Check if there are previous/next beats available
  const hasPreviousBeat = beatData.some(beat => beat.time < currentTime - 0.1);
  const hasNextBeat = beatData.some(beat => beat.time > currentTime + 0.1);

  // Keyboard shortcuts for beat navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger when Ctrl/Cmd is held down to avoid interfering with other shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            goToPreviousBeat();
            break;
          case 'ArrowRight':
            e.preventDefault();
            goToNextBeat();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [beatData, currentTime]); // Dependencies for the functions inside

    return (
      <div className="flex flex-col gap-4">
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={audioUrl ?? undefined}
          muted={isMuted}
        />

        {/* Enhanced Waveform Display with Zoom */}
        <div className="space-y-2">
          {/* Waveform Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">Waveform</div>
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <button
                onClick={() => onZoomChange(Math.min(4, zoom * 1.2))}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                title="Zoom In Waveform"
              >
                +
              </button>
              <span className="text-xs text-gray-400 min-w-[40px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => onZoomChange(Math.max(0.1, zoom / 1.2))}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                title="Zoom Out Waveform"
              >
                −
              </button>
              <button
                onClick={() => onZoomChange(1)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                title="Reset Zoom"
              >
                1:1
              </button>
              <button
                onClick={() => {
                  setIsUserScrollingWaveform(false);
                  if (waveformScrollRef.current && duration > 0) {
                    const playheadPosition = (currentTime / duration) * waveformDisplayWidth;
                    const containerWidth = waveformScrollRef.current.clientWidth;
                    waveformScrollRef.current.scrollTo({
                      left: Math.max(0, playheadPosition - containerWidth / 2),
                      behavior: 'smooth'
                    });
                  }
                }}
                className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs transition-colors"
                title="Follow Playhead"
              >
                📍
              </button>
            </div>
          </div>
          
          {/* Scrollable Waveform Container */}
          <div className="relative">
            <div
              ref={waveformScrollRef}
              className="overflow-x-auto overflow-y-hidden bg-gray-800 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
              style={{ height: '96px' }}
            >
              <canvas
                ref={canvasRef}
                className="cursor-pointer"
                onClick={handleSeek}
                style={{ height: '96px', display: 'block' }}
              />
            </div>
            
            {isLoadingWaveform && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  <div className="text-gray-300 text-sm">Analyzing audio for beats...</div>
                </div>
              </div>
            )}
            
            {!audioUrl && !audioFile && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg">
                <div className="text-gray-400">Load an audio file to begin</div>
              </div>
            )}
            
            {/* Scroll indicators */}
            {isPlaying && !isUserScrollingWaveform && waveformDisplayWidth > 800 && (
              <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                Auto-following
              </div>
            )}
            
            {isUserScrollingWaveform && (
              <div className="absolute top-1 right-1 bg-orange-600 text-white text-xs px-2 py-1 rounded">
                Manual scroll
              </div>
            )}

            {/* Beat jump indicator */}
            {beatJumpIndicator && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-orange-500 text-white px-3 py-2 rounded-lg shadow-lg border border-orange-400 animate-pulse">
                {beatJumpIndicator}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!audioUrl && !audioFile}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isPlaying ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4h2v12H6V4zm6 0h2v12h-2V4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
          </button>

          {/* Beat Navigation */}
          <div className="flex items-center gap-1 border-l border-gray-600 pl-4">
            <button
              onClick={goToPreviousBeat}
              disabled={!hasPreviousBeat || beatData.length === 0}
              className="flex h-8 w-8 items-center justify-center rounded bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              title="Previous Beat (Ctrl/Cmd + ←)"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={goToNextBeat}
              disabled={!hasNextBeat || beatData.length === 0}
              className="flex h-8 w-8 items-center justify-center rounded bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              title="Next Beat (Ctrl/Cmd + →)"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            {beatData.length > 0 && (
              <div className="text-xs text-gray-400 ml-2">
                🎵 {beatData.length} beats
              </div>
            )}
          </div>

          {/* Time display */}
          <div className="text-sm text-gray-300 min-w-[100px] font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Volume controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-gray-300 hover:text-white transition-colors"
            >
              {isMuted ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.785L4.7 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.7l3.683-3.785zm5.824-.037a.5.5 0 01.708 0L18 5.122l2.085-2.083a.5.5 0 01.708.708L18.708 5.83l2.085 2.084a.5.5 0 01-.708.708L18 6.538l-2.085 2.084a.5.5 0 01-.708-.708L17.292 5.83 15.207 3.747a.5.5 0 010-.708z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.785L4.7 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.7l3.683-3.785zm7.824.037a.5.5 0 01.708 0c2.072 2.073 2.072 5.437 0 7.51a.5.5 0 01-.708-.708 4.5 4.5 0 000-6.094.5.5 0 010-.708z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 accent-blue-500"
            />
          </div>
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer'; 