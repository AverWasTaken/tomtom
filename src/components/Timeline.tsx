import { useRef, useEffect, useState, useCallback } from "react";
import type { StacyCommand, LightType } from "../types/stacypilot";
import type { JSX } from "react";

interface TimelineProps {
  duration: number;
  currentTime: number;
  commands: StacyCommand[];
  zoom: number;
  isPlaying: boolean; // Add isPlaying prop
  onTimeChange: (time: number) => void;
  onCommandSelect: (command: StacyCommand) => void;
  onCommandUpdate: (commandId: string, updates: Partial<StacyCommand>) => void;
  onCommandDelete: (commandId: string) => void;
  onZoomChange: (zoom: number) => void;
}

const TRACK_HEIGHT = 50;
const TIMELINE_HEIGHT = 30;

// Light types with their colors for visual organization
const LIGHT_TRACKS: Array<{ type: LightType; color: string; icon: string }> = [
  { type: "BarsA", color: "#EC4899", icon: "💡" },
  { type: "BarsB", color: "#EC4899", icon: "💡" },
  { type: "HeadsA", color: "#10B981", icon: "🔦" },
  { type: "HeadsB", color: "#10B981", icon: "🔦" },
  { type: "LEDsA", color: "#3B82F6", icon: "✨" },
  { type: "LEDsB", color: "#3B82F6", icon: "✨" },
  { type: "LEDsC", color: "#3B82F6", icon: "✨" },
  { type: "StrobesA", color: "#F59E0B", icon: "⚡" },
  { type: "StrobesB", color: "#F59E0B", icon: "⚡" },
  { type: "WashesA", color: "#8B5CF6", icon: "🌊" },
  { type: "WashesB", color: "#8B5CF6", icon: "🌊" },
];

export function Timeline({
  duration,
  currentTime,
  commands,
  zoom,
  isPlaying,
  onTimeChange,
  onCommandSelect,
  onCommandUpdate,
  onCommandDelete,
  onZoomChange,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCommand, setDragCommand] = useState<StacyCommand | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [lastScrollTime, setLastScrollTime] = useState(0);

  // Function to organize commands into non-overlapping tracks
  const organizeCommandsIntoTracks = useCallback((lightType: LightType) => {
    const lightCommands = commands
      .filter((cmd) => cmd.parameters.lightType === lightType)
      .sort((a, b) => a.time - b.time);

    const tracks: StacyCommand[][] = [];

    for (const command of lightCommands) {
      const commandStart = command.time;
      const commandEnd = command.time + getCommandDuration(command);

      // Find a track where this command doesn't overlap
      let placedInTrack = false;
      for (const track of tracks) {
        if (!track || track.length === 0) continue;
        
        const lastCommandInTrack = track[track.length - 1];
        if (!lastCommandInTrack) continue;
        
        const lastCommandEnd = lastCommandInTrack.time + getCommandDuration(lastCommandInTrack);
        
        // If there's no overlap, place the command in this track
        if (commandStart >= lastCommandEnd) {
          track.push(command);
          placedInTrack = true;
          break;
        }
      }

      // If no suitable track found, create a new one
      if (!placedInTrack) {
        tracks.push([command]);
      }
    }

    return tracks;
  }, [commands]);

  // Calculate timeline width based on duration and zoom (with performance limits)
  const timelineWidth = Math.min(20000, Math.max(800, duration * 60 * zoom));

  // Convert time to pixel position
  const timeToPixel = useCallback((time: number) => {
    if (!duration) return 0; // Avoid NaN when duration is 0
    return (time / duration) * timelineWidth;
  }, [duration, timelineWidth]);

  // Convert pixel position to time
  const pixelToTime = useCallback((pixel: number) => {
    if (!duration) return 0; // Avoid NaN when duration is 0
    return (pixel / timelineWidth) * duration;
  }, [duration, timelineWidth]);

  // Auto-scroll to follow playhead during playback
  useEffect(() => {
    if (!isPlaying || isUserScrolling || !scrollContainerRef.current || !duration) return;

    const scrollContainer = scrollContainerRef.current;
    const playheadPosition = timeToPixel(currentTime);
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
  }, [currentTime, isPlaying, timelineWidth, duration, isUserScrolling, timeToPixel]);

  // Track user scrolling to temporarily disable auto-scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = (): void => {
      setIsUserScrolling(true);
      setLastScrollTime(Date.now());
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Reset user scrolling flag after inactivity
  useEffect(() => {
    if (!isUserScrolling) return;

    const timeout = setTimeout(() => {
      if (Date.now() - lastScrollTime > 2000) { // 2 seconds of no scrolling
        setIsUserScrolling(false);
      }
    }, 2100);

    return () => clearTimeout(timeout);
  }, [isUserScrolling, lastScrollTime]);

  // Handle timeline click for seeking
  const handleTimelineClick = (e: React.MouseEvent): void => {
    if (!timelineRef.current || isDragging) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelToTime(x);

    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(duration, time));
    onTimeChange(clampedTime);

    // Force auto-scroll to resume after seeking
    setIsUserScrolling(false);
  };

  // Handle command drag
  const handleCommandMouseDown = (e: React.MouseEvent, command: StacyCommand): void => {
    e.stopPropagation();
    setIsDragging(true);
    setDragCommand(command);

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
  };

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging || !dragCommand || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset;
      const newTime = Math.max(0, Math.min(duration, pixelToTime(x)));

      onCommandUpdate(dragCommand.id, { time: newTime });
    };

    const handleMouseUp = (): void => {
      setIsDragging(false);
      setDragCommand(null);
      setDragOffset(0);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragCommand, dragOffset, duration, onCommandUpdate, pixelToTime]);

  // Optimized time markers generation
  const generateTimeMarkers = (): JSX.Element[] => {
    const markers: JSX.Element[] = [];
    const pixelsPerSecond = timelineWidth / duration;

    // Determine appropriate interval based on zoom level
    let interval = 1; // seconds
    if (pixelsPerSecond < 20) {
      interval = 10;
    } else if (pixelsPerSecond < 50) {
      interval = 5;
    } else if (pixelsPerSecond < 100) {
      interval = 2;
    }

    // Generate markers at intervals
    for (let time = 0; time <= duration; time += interval) {
      const x = timeToPixel(time);
      const isMinute = time % 60 === 0;

      markers.push(
        <div
          key={time}
          className={`absolute top-0 ${isMinute ? "h-6 bg-white" : "h-3 bg-gray-400"}`}
          style={{
            left: x,
            width: "1px",
          }}
        />
      );

      // Add time labels for major markers
      if (isMinute || (interval <= 2 && time % 10 === 0)) {
        markers.push(
          <div
            key={`label-${time}`}
            className="absolute top-6 text-xs text-gray-300 transform -translate-x-1/2"
            style={{ left: x }}
          >
            {formatTime(time)}
          </div>
        );
      }
    }

    return markers;
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const centiseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  };

  // Get command label based on type and parameters
  const getCommandLabel = (command: StacyCommand): string => {
    const { type, parameters } = command;
    
    switch (type) {
      case "Color":
        if (parameters.color && typeof parameters.color === "object" && "r" in parameters.color) {
          const colorObj = parameters.color as { r: number; g: number; b: number };
          return `Color RGB(${colorObj.r}, ${colorObj.g}, ${colorObj.b})`;
        }
        return "Color";
      case "Cue":
        const cueState = parameters.cueValue ? "ON" : "OFF";
        return `${parameters.cueType ?? "Unknown"} ${cueState}`;
      case "Action":
        return `Action ${parameters.actionType ?? "Unknown"}`;
      case "BeamThickness":
        return `Thickness: ${parameters.beamThickness ?? 0}%`;
      case "Dimness":
        return `Dimness: ${Math.round((parameters.dimness ?? 0) * 100)}%`;
      case "Tilt":
        return `Tilt: ${parameters.tilt ?? 0}°`;
      case "Pan":
        return `Pan: ${parameters.pan ?? 0}°`;
      default:
        return type;
    }
  };

  // Get command duration (for effects that have duration)
  const getCommandDuration = (command: StacyCommand): number => {
    // For now, return a default duration. This could be configurable
    switch (command.type) {
      case "FadeOn":
      case "FadeOff":
        return command.parameters.fadeSpeed ?? 1;
      case "Color":
        return 2; // Color changes might have a duration
      case "Cue":
        return 3; // Cue effects might have a duration
      default:
        return 0.1; // Point effects
    }
  };

  return (
    <div className="flex bg-gray-900 w-full min-w-0">
      {/* Track Labels */}
      <div className="w-32 bg-gray-800 border-r border-gray-700">
        {/* Timeline header space */}
        <div className="h-[30px] border-b border-gray-700 bg-gray-700"></div>
        
        {/* Track labels */}
        {LIGHT_TRACKS.map((track) => {
          // Calculate the same height as the corresponding timeline track
          const commandRows = organizeCommandsIntoTracks(track.type);
          const rowHeight = Math.max(20, Math.floor((TRACK_HEIGHT - 24) / Math.max(1, commandRows.length))); // Account for label space
          const actualTrackHeight = Math.max(TRACK_HEIGHT, commandRows.length * (rowHeight + 2) + 24); // Add space for track label
          
          return (
            <div
              key={track.type}
              className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 text-white text-sm"
              style={{ height: actualTrackHeight, minHeight: TRACK_HEIGHT }}
            >
              <span>{track.icon}</span>
              <span className="font-medium">{track.type}</span>
            </div>
          );
        })}
      </div>

      {/* Timeline Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 min-w-0"
        onWheel={(e) => {
          // Enable vertical scrolling with mouse wheel
          e.currentTarget.scrollTop += e.deltaY;
        }}
      >
        <div
          ref={timelineRef}
          className="relative cursor-pointer"
          style={{ width: timelineWidth }}
          onClick={handleTimelineClick}
        >
          {/* Time markers */}
          <div className="relative bg-gray-700 border-b border-gray-600" style={{ height: TIMELINE_HEIGHT }}>
            {generateTimeMarkers()}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ left: timeToPixel(currentTime) }}
          >
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full"></div>
          </div>

          {/* Auto-scroll indicator */}
          {isPlaying && !isUserScrolling && (
            <div className="absolute top-1 right-1 z-40 bg-green-600 text-white text-xs px-2 py-1 rounded">
              Auto-following
            </div>
          )}

          {/* User scroll indicator */}
          {isUserScrolling && (
            <div className="absolute top-1 right-1 z-40 bg-orange-600 text-white text-xs px-2 py-1 rounded">
              Manual scroll
            </div>
          )}

          {/* Tracks - one per light type */}
          {LIGHT_TRACKS.map((lightTrack) => {
            const lightCommands = commands
              .filter((cmd) => cmd.parameters.lightType === lightTrack.type)
              .sort((a, b) => a.time - b.time);
            
            // Organize commands into non-overlapping rows
            const commandRows = organizeCommandsIntoTracks(lightTrack.type);
            const rowHeight = Math.max(20, Math.floor((TRACK_HEIGHT - 24) / Math.max(1, commandRows.length))); // Account for label space
            const actualTrackHeight = Math.max(TRACK_HEIGHT, commandRows.length * (rowHeight + 2) + 24); // Add space for track label
            
            return (
              <div
                key={lightTrack.type}
                className="relative border-b border-gray-700 bg-gray-800 overflow-hidden"
                style={{ height: actualTrackHeight, minHeight: TRACK_HEIGHT }}
              >
                {/* Track label */}
                <div className="absolute left-2 top-1 text-xs text-gray-300 font-medium z-10 bg-gray-800 px-1 rounded">
                  {lightTrack.icon} {lightTrack.type}
                </div>
                
                {/* Commands organized in rows */}
                {commandRows.map((row, rowIndex) => (
                  <div 
                    key={rowIndex} 
                    className="absolute w-full" 
                    style={{ 
                      top: rowIndex * (rowHeight + 2) + 20, // Start below track label
                      height: rowHeight 
                    }}
                  >
                    {row.map((command) => {
                      const x = timeToPixel(command.time);
                      const width = Math.max(60, timeToPixel(getCommandDuration(command)));
                      
                      return (
                        <div
                          key={command.id}
                          className="absolute rounded cursor-pointer border border-opacity-50 border-white hover:border-opacity-100 transition-all"
                          style={{
                            left: x,
                            width: width,
                            height: rowHeight,
                            backgroundColor: lightTrack.color,
                            opacity: dragCommand?.id === command.id ? 0.7 : 0.9,
                          }}
                          onMouseDown={(e) => handleCommandMouseDown(e, command)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCommandSelect(command);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onCommandDelete(command.id);
                          }}
                        >
                          <div className="px-2 py-1 text-white text-xs font-medium truncate" style={{ lineHeight: `${rowHeight - 2}px` }}>
                            {getCommandLabel(command)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="w-20 bg-gray-800 border-l border-gray-700 flex flex-col items-center justify-start pt-4 gap-3 flex-shrink-0">
        <button
          onClick={() => onZoomChange(Math.min(4, zoom * 1.5))}
          className="w-10 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-bold transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <div className="text-xs text-gray-300 text-center px-1 bg-gray-700 rounded">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => onZoomChange(Math.max(0.1, zoom / 1.5))}
          className="w-10 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-bold transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={() => onZoomChange(1)}
          className="w-10 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
          title="Reset Zoom"
        >
          1:1
        </button>
        <button
          onClick={() => {
            setIsUserScrolling(false);
            if (scrollContainerRef.current && duration > 0) {
              const playheadPosition = timeToPixel(currentTime);
              const containerWidth = scrollContainerRef.current.clientWidth;
              scrollContainerRef.current.scrollTo({
                left: Math.max(0, playheadPosition - containerWidth / 2),
                behavior: 'smooth'
              });
            }
          }}
          className="w-10 h-6 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs transition-colors"
          title="Follow Playhead"
        >
          📍
        </button>
      </div>
    </div>
  );
} 