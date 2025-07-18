import { useState, useRef } from "react";
import type { TimelineProject, StacyCommand } from "../types/stacypilot";

interface ImportPanelProps {
  onImportProject: (project: TimelineProject) => void;
  onImportCommands: (commands: StacyCommand[]) => void;
}

export function ImportPanel({ onImportProject, onImportCommands }: ImportPanelProps) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importType, setImportType] = useState<"project" | "script">("project");
  const [dragActive, setDragActive] = useState(false);
  const [importStatus, setImportStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setImportStatus("Processing file...");
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') {
          throw new Error('Failed to read file content');
        }
        const content = result;
        
        if (importType === "project") {
          // Import project file (JSON)
          const projectData = JSON.parse(content) as TimelineProject;
          
          // Validate project structure
          if (!projectData.name || !Array.isArray(projectData.commands)) {
            throw new Error("Invalid project file format");
          }
          
          onImportProject(projectData);
          setImportStatus(`Successfully imported project: ${projectData.name}`);
        } else {
          // Import StacyPilot script (Lua or JSON)
          let commands: StacyCommand[] = [];
          
          if (file.name.endsWith('.lua')) {
            // Parse Lua script format
            commands = parseLuaScript(content);
          } else if (file.name.endsWith('.json')) {
            // Parse JSON script format
            const scriptData = JSON.parse(content);
            commands = parseJsonScript(scriptData);
          } else {
            throw new Error("Unsupported file format. Please use .lua or .json files.");
          }
          
          onImportCommands(commands);
          setImportStatus(`Successfully imported ${commands.length} commands`);
        }
        
        // Auto-close after successful import
        setTimeout(() => {
          setIsImportOpen(false);
          setImportStatus("");
        }, 2000);
        
      } catch (error) {
        setImportStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    
    reader.readAsText(file);
  };

  const parseLuaScript = (luaContent: string): StacyCommand[] => {
    // Extract the return statement content from Lua script
    const returnMatch = luaContent.match(/return\s*\{([\s\S]*)\}/);
    if (!returnMatch) {
      throw new Error("Invalid Lua script format - no return statement found");
    }
    
    // Convert Lua table syntax to JSON-like format for parsing
    let jsonContent = returnMatch[1]
      .replace(/\[(\d+)\]\s*=/g, '"$1":') // Convert [1] = to "1":
      .replace(/(\w+)\s*=/g, '"$1":') // Convert key = to "key":
      .replace(/\{([^}]+)\}/g, (match) => {
        // Convert Lua table values to JSON array format
        return match.replace(/=/g, ':');
      });
    
    try {
      const scriptData = JSON.parse(`{${jsonContent}}`);
      return parseJsonScript(scriptData);
    } catch {
      throw new Error("Failed to parse Lua script format");
    }
  };

  const parseJsonScript = (scriptData: any): StacyCommand[] => {
    const commands: StacyCommand[] = [];
    
    // Parse script data structure
    Object.entries(scriptData).forEach(([timeKey, commandData]: [string, any]) => {
      const time = parseFloat(timeKey);
      
      if (Array.isArray(commandData)) {
        // Handle array format: [lightType, commandType, ...params]
        const [lightType, commandType, ...params] = commandData;
        
        const command: StacyCommand = {
          id: `imported-${Date.now()}-${Math.random()}`,
          time,
          type: commandType,
          parameters: {
            lightType,
            ...parseCommandParameters(commandType, params)
          }
        };
        
        commands.push(command);
      }
    });
    
    return commands.sort((a, b) => a.time - b.time);
  };

  const parseCommandParameters = (commandType: string, params: any[]): any => {
    const parameters: any = {};
    
    switch (commandType) {
      case "Color":
        if (params[0] && typeof params[0] === 'object') {
          parameters.color = params[0];
        }
        if (params[1]) {
          parameters.colorDirection = params[1];
        }
        break;
        
      case "Cue":
        if (params[0]) parameters.cueType = params[0];
        if (params[1] !== undefined) parameters.cueValue = params[1];
        break;
        
      case "Action":
        if (params[0]) parameters.actionType = params[0];
        if (params[1] !== undefined) parameters.actionValue = params[1];
        break;
        
      case "BeamMode":
        if (params[0]) parameters.beamMode = params[0];
        break;
        
      case "BeamThickness":
        if (params[0] !== undefined) parameters.beamThickness = params[0];
        break;
        
      case "Tilt":
        if (params[0] !== undefined) parameters.tilt = params[0];
        break;
        
      case "Pan":
        if (params[0] !== undefined) parameters.pan = params[0];
        break;
        
      case "FadeSpeed":
        if (params[0] !== undefined) parameters.fadeSpeed = params[0];
        break;
        
      case "Dimness":
        if (params[0] !== undefined) parameters.dimness = params[0];
        break;
        
      // Add more parameter parsing as needed
    }
    
    return parameters;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  if (!isImportOpen) {
    return (
      <button
        onClick={() => setIsImportOpen(true)}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
      >
        Import
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Import Project</h2>
          <button
            onClick={() => setIsImportOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Import Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Import Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="project"
                checked={importType === "project"}
                onChange={(e) => setImportType(e.target.value as "project")}
                className="mr-2"
              />
              <span className="text-white">Project File (.json)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="script"
                checked={importType === "script"}
                onChange={(e) => setImportType(e.target.value as "script")}
                className="mr-2"
              />
              <span className="text-white">StacyPilot Script (.lua/.json)</span>
            </label>
          </div>
        </div>

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-400 bg-blue-900 bg-opacity-20"
              : "border-gray-600 hover:border-gray-500"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-gray-300 mb-4">
            <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-lg font-medium">
              {importType === "project" 
                ? "Drop a project file here or click to browse"
                : "Drop a StacyPilot script here or click to browse"
              }
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {importType === "project"
                ? "Supports .json project files"
                : "Supports .lua and .json script files"
              }
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept={importType === "project" ? ".json" : ".lua,.json"}
            onChange={handleFileInput}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Browse Files
          </button>
        </div>

        {/* Status Message */}
        {importStatus && (
          <div className={`mt-4 p-3 rounded ${
            importStatus.startsWith("Error") 
              ? "bg-red-900 text-red-200" 
              : importStatus.startsWith("Successfully")
              ? "bg-green-900 text-green-200"
              : "bg-blue-900 text-blue-200"
          }`}>
            {importStatus}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 text-xs text-gray-400">
          <p className="mb-2">
            <strong>Project File:</strong> Import a complete timeline project with all settings and commands
          </p>
          <p>
            <strong>StacyPilot Script:</strong> Import commands from exported StacyPilot scripts (will be added to current project)
          </p>
        </div>
      </div>
    </div>
  );
}
