import { useState, useRef, useEffect } from "react";
import { AudioPlayer } from "./AudioPlayer";
import { Timeline } from "./Timeline";
import { EffectsPanel } from "./EffectsPanel";
import { CommandEditor } from "./CommandEditor";
import { ExportPanel } from "./ExportPanel";
import { ImportPanel } from "./ImportPanel";
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

  // Import project handler
  const handleImportProject = (importedProject: TimelineProject) => {
    setProject(importedProject);
    setCommands(importedProject.commands);
    
    // If the imported project has an audio file, handle it
    if (importedProject.audioFile) {
      setAudioFile(importedProject.audioFile);
      const url = URL.createObjectURL(importedProject.audioFile);
      setAudioUrl(url);
    }
    
    // Update duration if available
    if (importedProject.duration > 0) {
      setDuration(importedProject.duration);
    }
    
    // Reset playback state
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedCommand(null);
  };

  // Import commands handler (adds to existing project)
  const handleImportCommands = (importedCommands: StacyCommand[]) => {
    const updatedCommands = [...commands, ...importedCommands].sort((a, b) => a.time - b.time);
    setCommands(updatedCommands);
    setProject(prev => ({ ...prev, commands: updatedCommands }));
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
          <ImportPanel 
            onImportProject={handleImportProject}
            onImportCommands={handleImportCommands}
          />
          <ExportPanel project={project} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* Left Panel - Effects Controls */}
        <div className="w-96 border-r border-gray-700 bg-gray-800 flex-shrink-0">
          <EffectsPanel onAddCommand={addCommand} currentTime={currentTime} />
        </div>

        {/* Center - Timeline */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {/* Audio Player */}
          <div className="border-b border-gray-700 bg-gray-800 p-4">
            <AudioPlayer
              ref={audioRef}
              audioUrl={audioUrl}
              audioFile={audioFile}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              zoom={zoom}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onPlayStateChange={setIsPlaying}
              onZoomChange={setZoom}
            />
          </div>

          {/* Timeline */}
          <div className="flex-1 min-w-0">
            <Timeline
              duration={duration}
              currentTime={currentTime}
              commands={commands}
              zoom={zoom}
              isPlaying={isPlaying}
              onTimeChange={setCurrentTime}
              onCommandSelect={setSelectedCommand}
              onCommandUpdate={updateCommand}
              onCommandDelete={deleteCommand}
              onZoomChange={setZoom}
            />
          </div>
        </div>

        {/* Right Panel - Command Editor */}
        <div className="w-96 border-l border-gray-700 bg-gray-800 flex-shrink-0">
          {selectedCommand ? (
            <CommandEditor
              command={selectedCommand}
              onUpdate={(updates: Partial<StacyCommand>) => updateCommand(selectedCommand.id, updates)}
              onDelete={() => deleteCommand(selectedCommand.id)}
              onClose={() => setSelectedCommand(null)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <h3 className="text-lg font-medium mb-2">Command Editor</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Click on a command in the timeline to edit its properties.
                </p>
                <div className="text-xs text-gray-600">
                  <p>• Adjust timing and parameters</p>
                  <p>• Modify light colors and effects</p>
                  <p>• Delete or duplicate commands</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 