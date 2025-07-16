import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from "react";

interface AudioPlayerProps {
  audioUrl: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayStateChange: (playing: boolean) => void;
}

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  ({ audioUrl, currentTime, duration, isPlaying, onTimeUpdate, onDurationChange, onPlayStateChange }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const [isLoadingWaveform, setIsLoadingWaveform] = useState(false);

    // Expose audio element ref to parent
    useImperativeHandle(ref, () => audioRef.current!, []);

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
        generateWaveform();
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

    // Generate waveform data
    const generateWaveform = async () => {
      const audio = audioRef.current;
      if (!audio || !audioUrl) return;

      setIsLoadingWaveform(true);
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const rawData = audioBuffer.getChannelData(0);
        const samples = 1000; // Number of waveform points
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            const value = rawData[blockStart + j];
            if (value !== undefined) {
              sum += Math.abs(value);
            }
          }
          filteredData.push(sum / blockSize);
        }
        
        // Normalize the data
        const maxVal = filteredData.length > 0 ? Math.max(...filteredData) : 1;
        const normalizedData = filteredData.map(val => maxVal > 0 ? val / maxVal : 0);
        
        setWaveformData(normalizedData);
        audioContext.close();
      } catch (error) {
        console.error("Error generating waveform:", error);
      } finally {
        setIsLoadingWaveform(false);
      }
    };

    // Draw waveform
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !waveformData.length) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Draw waveform
      ctx.fillStyle = "#374151";
      const barWidth = width / waveformData.length;
      
      waveformData.forEach((value, index) => {
        const barHeight = value * height * 0.8;
        const x = index * barWidth;
        const y = (height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      });

      // Draw progress
      if (duration > 0) {
        const progressWidth = (currentTime / duration) * width;
        ctx.fillStyle = "#3B82F6";
        ctx.fillRect(0, 0, progressWidth, height);
        ctx.globalCompositeOperation = "source-atop";
        
        waveformData.slice(0, Math.floor((currentTime / duration) * waveformData.length)).forEach((value, index) => {
          const barHeight = value * height * 0.8;
          const x = index * barWidth;
          const y = (height - barHeight) / 2;
          ctx.fillRect(x, y, barWidth - 1, barHeight);
        });
        
        ctx.globalCompositeOperation = "source-over";
      }
    }, [waveformData, currentTime, duration]);

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!duration) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = (x / rect.width) * duration;
      onTimeUpdate(newTime);
      
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
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

        {/* Waveform */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={100}
            className="w-full h-20 cursor-pointer bg-gray-700 rounded"
            onClick={handleSeek}
          />
          {isLoadingWaveform && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700 rounded">
              <div className="text-gray-400">Generating waveform...</div>
            </div>
          )}
          {!audioUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700 rounded">
              <div className="text-gray-400">Load an audio file to begin</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!audioUrl}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
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
          <div className="text-sm text-gray-300 min-w-[100px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Volume controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-gray-300 hover:text-white"
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
              className="w-20"
            />
          </div>
        </div>
      </div>
    );
  }
); 