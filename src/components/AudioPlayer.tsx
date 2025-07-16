import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from "react";

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
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleTimeUpdate = () => {
        onTimeUpdate(audio.currentTime);
      };

      const handleDurationChange = () => {
        onDurationChange(audio.duration || 0);
      };

      const handleLoadedMetadata = () => {
        onDurationChange(audio.duration || 0);
        generateAdvancedWaveform();
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
    }, [onTimeUpdate, onDurationChange, onPlayStateChange]);

    // Control play/pause
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.play().catch(console.error);
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

    // Advanced waveform and beat detection
    const generateAdvancedWaveform = async () => {
      const audio = audioRef.current;
      if (!audio || (!audioUrl && !audioFile)) return;

      console.log("Starting advanced waveform generation for:", audioFile?.name || audioUrl);
      setIsLoadingWaveform(true);
      
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
            const sample = rawData[j] || 0;
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
    };

    // Regenerate waveform when the source changes
    useEffect(() => {
      if (audioUrl || audioFile) {
        generateAdvancedWaveform();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioUrl, audioFile]);

    // Enhanced but optimized waveform drawing with zoom support
    const drawAdvancedWaveform = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size to match the zoomed waveform width
      const dpr = window.devicePixelRatio || 1;
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
    };

    // Throttled redraw to improve performance
    const lastDrawTime = useRef(0);
    const drawThrottled = () => {
      const now = Date.now();
      if (now - lastDrawTime.current > 33) { // ~30fps max
        drawAdvancedWaveform();
        lastDrawTime.current = now;
      }
    };

    useEffect(() => {
      drawThrottled();
    }, [waveformData, beatData, isLoadingWaveform, zoom]);

    // Separate effect for time updates with throttling
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        drawThrottled();
      }, 33); // ~30fps for time updates
      
      return () => clearTimeout(timeoutId);
    }, [currentTime, duration, zoom]);

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
    }, [waveformData, beatData, zoom]);

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
      
      const rect = canvas.getBoundingClientRect();
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

    return (
      <div className="flex flex-col gap-4">
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
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
              {/* Beat count indicator */}
              {beatData.length > 0 && (
                <div className="bg-gray-700 bg-opacity-90 rounded px-2 py-1 text-xs text-gray-300">
                  {beatData.length} beats
                </div>
              )}
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