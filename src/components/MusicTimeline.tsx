import { useState, useRef, useEffect } from "react";
import { AudioPlayer } from "./AudioPlayer";
import { Timeline } from "./Timeline";
import { EffectsPanel } from "./EffectsPanel";
import { CommandEditor } from "./CommandEditor";
import { ExportPanel } from "./ExportPanel";
import type { StacyCommand, TimelineProject } from "../types/stacypilot";

export function MusicTimeline() {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [commands, setCommands] = useState<StacyCommand[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<StacyCommand | null>(null);
  const [zoom, setZoom] = useState(1);
  const [project, setProject] = useState<TimelineProject>({
    name: "Untitled Project",
    audioFile: null,
    commands: [],
    duration: 0
  });

  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle file upload
  const handleFileUpload = (file: File) => {
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setProject(prev => ({ ...prev, audioFile: file }));
  };

  // Add new command at current time
  const addCommand = (command: Omit<StacyCommand, "id">) => {
    const newCommand: StacyCommand = {
      ...command,
      id: Date.now().toString(),
      time: currentTime
    };
    const updatedCommands = [...commands, newCommand].sort((a, b) => a.time - b.time);
    setCommands(updatedCommands);
    setProject(prev => ({ ...prev, commands: updatedCommands }));
  };

  // Update existing command
  const updateCommand = (commandId: string, updates: Partial<StacyCommand>) => {
    const updatedCommands = commands.map(cmd => 
      cmd.id === commandId ? { ...cmd, ...updates } : cmd
    ).sort((a, b) => a.time - b.time);
    setCommands(updatedCommands);
    setProject(prev => ({ ...prev, commands: updatedCommands }));
  };

  // Delete command
  const deleteCommand = (commandId: string) => {
    const updatedCommands = commands.filter(cmd => cmd.id !== commandId);
    setCommands(updatedCommands);
    setProject(prev => ({ ...prev, commands: updatedCommands }));
    if (selectedCommand?.id === commandId) {
      setSelectedCommand(null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.code) {
        case "Space":
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case "Home":
          e.preventDefault();
          setCurrentTime(0);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
          }
          break;
        case "ArrowLeft":
          if (e.shiftKey) {
            setCurrentTime(prev => Math.max(0, prev - 0.1));
          } else {
            setCurrentTime(prev => Math.max(0, prev - 1));
          }
          break;
        case "ArrowRight":
          if (e.shiftKey) {
            setCurrentTime(prev => Math.min(duration, prev + 0.1));
          } else {
            setCurrentTime(prev => Math.min(duration, prev + 1));
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [duration]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-700 bg-gray-800 p-4">
        <h1 className="text-xl font-bold text-white">StacyPilot Music Timeline</h1>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
            id="audio-upload"
          />
          <label
            htmlFor="audio-upload"
            className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Load Audio
          </label>
          <ExportPanel project={project} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Effects Controls */}
        <div className="w-80 border-r border-gray-700 bg-gray-800">
          <EffectsPanel onAddCommand={addCommand} currentTime={currentTime} />
        </div>

        {/* Center - Timeline */}
        <div className="flex flex-1 flex-col">
          {/* Audio Player */}
          <div className="border-b border-gray-700 bg-gray-800 p-4">
            <AudioPlayer
              ref={audioRef}
              audioUrl={audioUrl}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onPlayStateChange={setIsPlaying}
            />
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-auto">
            <Timeline
              duration={duration}
              currentTime={currentTime}
              commands={commands}
              zoom={zoom}
              onTimeChange={setCurrentTime}
              onCommandSelect={setSelectedCommand}
              onCommandUpdate={updateCommand}
              onCommandDelete={deleteCommand}
              onZoomChange={setZoom}
            />
          </div>
        </div>

        {/* Right Panel - Command Editor */}
        {selectedCommand && (
          <div className="w-80 border-l border-gray-700 bg-gray-800">
            <CommandEditor
              command={selectedCommand}
              onUpdate={(updates: Partial<StacyCommand>) => updateCommand(selectedCommand.id, updates)}
              onDelete={() => deleteCommand(selectedCommand.id)}
              onClose={() => setSelectedCommand(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
} 