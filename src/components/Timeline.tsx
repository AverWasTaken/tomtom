import { useRef, useEffect, useState } from "react";
import type { StacyCommand, LightType } from "../types/stacypilot";

interface TimelineProps {
  duration: number;
  currentTime: number;
  commands: StacyCommand[];
  zoom: number;
  onTimeChange: (time: number) => void;
  onCommandSelect: (command: StacyCommand) => void;
  onCommandUpdate: (commandId: string, updates: Partial<StacyCommand>) => void;
  onCommandDelete: (commandId: string) => void;
  onZoomChange: (zoom: number) => void;
}

const TRACK_HEIGHT = 40;
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
];

export function Timeline({
  duration,
  currentTime,
  commands,
  zoom,
  onTimeChange,
  onCommandSelect,
  onCommandUpdate,
  onCommandDelete,
  onZoomChange,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCommand, setDragCommand] = useState<StacyCommand | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Calculate timeline width based on duration and zoom
  const timelineWidth = Math.max(800, duration * 100 * zoom);

  // Convert time to pixel position
  const timeToPixel = (time: number) => {
    return (time / duration) * timelineWidth;
  };

  // Convert pixel position to time
  const pixelToTime = (pixel: number) => {
    return (pixel / timelineWidth) * duration;
  };

  // Handle timeline click for seeking
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const newTime = pixelToTime(x);
    onTimeChange(Math.max(0, Math.min(duration, newTime)));
  };

  // Handle command drag
  const handleCommandMouseDown = (e: React.MouseEvent, command: StacyCommand) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragCommand(command);
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const commandX = timeToPixel(command.time);
    setDragOffset(e.clientX - rect.left - commandX);
  };

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragCommand || !timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset;
      const newTime = pixelToTime(x);
      
      onCommandUpdate(dragCommand.id, { time: Math.max(0, Math.min(duration, newTime)) });
    };

    const handleMouseUp = () => {
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
  }, [isDragging, dragCommand, dragOffset, duration, onCommandUpdate]);

  // Generate time markers
  const generateTimeMarkers = () => {
    const markers = [];
    const interval = zoom < 0.5 ? 10 : zoom < 1 ? 5 : zoom < 2 ? 1 : 0.5;
    
    for (let time = 0; time <= duration; time += interval) {
      const x = timeToPixel(time);
      const isSecond = time % 1 === 0;
      
      markers.push(
        <div
          key={time}
          className={`absolute top-0 ${isSecond ? "h-full border-gray-400" : "h-2 border-gray-600"} border-l`}
          style={{ left: x }}
        >
          {isSecond && (
            <div className="absolute -top-6 -translate-x-1/2 text-xs text-gray-300">
              {formatTime(time)}
            </div>
          )}
        </div>
      );
    }
    
    return markers;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const centiseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  };

  // Get command label based on type and parameters
  const getCommandLabel = (command: StacyCommand) => {
    const { type, parameters } = command;
    
    switch (type) {
      case "Color":
        if (parameters.color && typeof parameters.color === "object" && "r" in parameters.color) {
          return `Color RGB(${parameters.color.r}, ${parameters.color.g}, ${parameters.color.b})`;
        }
        return "Color";
      case "Cue":
        const cueState = parameters.cueValue ? "ON" : "OFF";
        return `${parameters.cueType || "Unknown"} ${cueState}`;
      case "Action":
        return `Action ${parameters.actionType || "Unknown"}`;
      case "BeamThickness":
        return `Thickness: ${parameters.beamThickness || 0}%`;
      case "Dimness":
        return `Dimness: ${Math.round((parameters.dimness || 0) * 100)}%`;
      case "Tilt":
        return `Tilt: ${parameters.tilt || 0}°`;
      case "Pan":
        return `Pan: ${parameters.pan || 0}°`;
      default:
        return type;
    }
  };

  // Get command duration (for effects that have duration)
  const getCommandDuration = (command: StacyCommand) => {
    // For now, return a default duration. This could be configurable
    switch (command.type) {
      case "FadeOn":
      case "FadeOff":
        return command.parameters.fadeSpeed || 1;
      case "Color":
        return 2; // Color changes might have a duration
      case "Cue":
        return 3; // Cue effects might have a duration
      default:
        return 0.1; // Point effects
    }
  };

  return (
    <div className="flex h-full bg-gray-900">
      {/* Track Labels */}
      <div className="w-32 bg-gray-800 border-r border-gray-700">
        {/* Timeline header space */}
        <div className="h-[30px] border-b border-gray-700 bg-gray-700"></div>
        
        {/* Track labels */}
        {LIGHT_TRACKS.map((track) => (
          <div
            key={track.type}
            className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 text-white text-sm"
            style={{ height: TRACK_HEIGHT }}
          >
            <span>{track.icon}</span>
            <span className="font-medium">{track.type}</span>
          </div>
        ))}
      </div>

      {/* Timeline Area */}
      <div className="flex-1 overflow-auto">
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

          {/* Tracks */}
          {LIGHT_TRACKS.map((track, trackIndex) => (
            <div
              key={track.type}
              className="relative border-b border-gray-700 bg-gray-800"
              style={{ height: TRACK_HEIGHT }}
            >
              {/* Commands for this track */}
              {commands
                .filter((cmd) => cmd.parameters.lightType === track.type)
                .map((command) => {
                  const x = timeToPixel(command.time);
                  const width = Math.max(60, timeToPixel(getCommandDuration(command)));
                  
                  return (
                    <div
                      key={command.id}
                      className="absolute top-1 bottom-1 rounded cursor-pointer border border-opacity-50 border-white hover:border-opacity-100 transition-all"
                      style={{
                        left: x,
                        width: width,
                        backgroundColor: track.color,
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
                      <div className="px-2 py-1 text-white text-xs font-medium truncate">
                        {getCommandLabel(command)}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="w-16 bg-gray-800 border-l border-gray-700 flex flex-col items-center justify-start pt-4 gap-2">
        <button
          onClick={() => onZoomChange(Math.min(4, zoom * 1.5))}
          className="w-8 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
        >
          +
        </button>
        <div className="text-xs text-gray-300 rotate-90 w-8 text-center">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => onZoomChange(Math.max(0.25, zoom / 1.5))}
          className="w-8 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
        >
          -
        </button>
      </div>
    </div>
  );
} 