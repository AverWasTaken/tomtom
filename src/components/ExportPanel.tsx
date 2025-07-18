import { useState } from "react";
import type { TimelineProject, StacyScript, RGB, ColorSequence } from "../types/stacypilot";

interface ExportPanelProps {
  project: TimelineProject;
}

export function ExportPanel({ project }: ExportPanelProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"lua" | "json">("lua");

  const generateStacyScript = (): StacyScript => {
    return project.commands.map(command => {
      const data: (string | number | boolean | RGB | ColorSequence)[] = [
        command.parameters.lightType,
        command.type
      ];

      // Add parameters based on command type
      switch (command.type) {
        case "Color":
          if (command.parameters.color && typeof command.parameters.color === "object" && "r" in command.parameters.color) {
            data.push(command.parameters.color);
            if (command.parameters.colorDirection) {
              data.push(command.parameters.colorDirection);
            }
          }
          break;

        case "Cue":
          if (command.parameters.cueType) {
            data.push(command.parameters.cueType);
            data.push(command.parameters.cueValue ?? true);
          }
          break;

        case "Action":
          if (command.parameters.actionType) {
            data.push(command.parameters.actionType);
            data.push(command.parameters.actionValue ?? false);
          }
          break;

        case "BeamMode":
          if (command.parameters.beamMode) {
            data.push(command.parameters.beamMode);
          }
          break;

        case "BeamThickness":
          if (command.parameters.beamThickness !== undefined) {
            data.push(command.parameters.beamThickness);
          }
          break;

        case "GoboSpread":
          if (command.parameters.goboSpread !== undefined) {
            data.push(command.parameters.goboSpread);
          }
          break;

        case "Tilt":
          if (command.parameters.tilt !== undefined) {
            data.push(command.parameters.tilt);
          }
          break;

        case "Pan":
          if (command.parameters.pan !== undefined) {
            data.push(command.parameters.pan);
          }
          break;

        case "MotorSpeed":
          if (command.parameters.motorSpeed !== undefined) {
            data.push(command.parameters.motorSpeed);
          }
          break;

        case "RotateGobo":
          if (command.parameters.rotateGobo) {
            data.push(command.parameters.rotateGobo.speed);
            data.push(command.parameters.rotateGobo.direction);
          }
          break;

        case "Follow":
          if (command.parameters.followTarget) {
            data.push(command.parameters.followTarget);
          }
          break;

        case "SetGlobalCueSetting":
          if (command.parameters.globalCueSetting) {
            data.push(command.parameters.globalCueSetting.setting);
            data.push(command.parameters.globalCueSetting.value);
          }
          break;

        case "SetCueSetting":
          if (command.parameters.localCueSetting) {
            data.push(command.parameters.localCueSetting.cue);
            data.push(command.parameters.localCueSetting.setting);
            data.push(command.parameters.localCueSetting.value);
          }
          break;

        case "CueSpeed":
          if (command.parameters.cueSpeed !== undefined) {
            data.push(command.parameters.cueSpeed);
          }
          break;

        case "FadeSpeed":
          if (command.parameters.fadeSpeed !== undefined) {
            data.push(command.parameters.fadeSpeed);
          }
          break;

        case "Dimness":
          if (command.parameters.dimness !== undefined) {
            data.push(command.parameters.dimness);
          }
          break;

        case "LoopCues":
          if (command.parameters.loopCues !== undefined) {
            data.push(command.parameters.loopCues);
          }
          break;

        case "SmoothColor":
          if (command.parameters.smoothColor !== undefined) {
            data.push(command.parameters.smoothColor);
          }
          break;

        case "AnimatedGradients":
          if (command.parameters.animatedGradients !== undefined) {
            data.push(command.parameters.animatedGradients);
          }
          break;
      }

      return {
        Time: command.time,
        Data: data
      };
    }).sort((a, b) => a.Time - b.Time);
  };

  const formatLuaValue = (value: string | number | boolean | RGB | ColorSequence): string => {
    if (typeof value === "string") {
      return `"${value}"`;
    } else if (typeof value === "number") {
      return value.toString();
    } else if (typeof value === "boolean") {
      return value.toString();
    } else if (value && typeof value === "object" && "r" in value) {
      // RGB color
      return `Color3.fromRGB(${value.r}, ${value.g}, ${value.b})`;
    } else if (value && typeof value === "object" && "keypoints" in value) {
      // ColorSequence
      const keypoints = value.keypoints.map((kp: { position: number; color: RGB }) => 
        `ColorSequenceKeypoint.new(${kp.position}, Color3.fromRGB(${kp.color.r}, ${kp.color.g}, ${kp.color.b}))`
      ).join(", ");
      return `ColorSequence.new({${keypoints}})`;
    }
    return JSON.stringify(value);
  };

  const exportToLua = (): string => {
    const script = generateStacyScript();
    const luaLines = script.map(line => {
      const dataStr = line.Data.map(item => formatLuaValue(item)).join(", ");
      return `    {Time = ${line.Time}, Data = {${dataStr}}};`;
    });
    return `return {\n${luaLines.join("\n")}\n};`;
  };

  const exportToJson = (): string => {
    const script = generateStacyScript();
    return JSON.stringify(script, null, 2);
  };

  const handleExport = () => {
    const content = exportFormat === "lua" ? exportToLua() : exportToJson();
    const filename = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_stacy_script.${exportFormat === "lua" ? "lua" : "json"}`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveProject = () => {
    const projectData = {
      ...project,
      audioFile: null, // Can't serialize File objects
      audioFileName: project.audioFile?.name ?? null,
    };
    
    const content = JSON.stringify(projectData, null, 2);
    const filename = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_project.json`;
    
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isExportOpen) {
    return (
      <button
        onClick={() => setIsExportOpen(true)}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
      >
        Export
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Export Project</h2>
          <button
            onClick={() => setIsExportOpen(false)}
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

        {/* Project Info */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Project:</span>
              <span className="text-white ml-2">{project.name}</span>
            </div>
            <div>
              <span className="text-gray-400">Commands:</span>
              <span className="text-white ml-2">{project.commands.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Duration:</span>
              <span className="text-white ml-2">{project.duration.toFixed(2)}s</span>
            </div>
            <div>
              <span className="text-gray-400">Audio:</span>
              <span className="text-white ml-2">{project.audioFile?.name ?? "None"}</span>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              StacyPilot Script Format
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="lua"
                  checked={exportFormat === "lua"}
                  onChange={(e) => setExportFormat(e.target.value as "lua")}
                  className="mr-2"
                />
                <span className="text-white">Lua Script (.lua)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="json"
                  checked={exportFormat === "json"}
                  onChange={(e) => setExportFormat(e.target.value as "json")}
                  className="mr-2"
                />
                <span className="text-white">JSON (.json)</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preview ({project.commands.length} commands)
            </label>
            <div className="bg-gray-900 rounded p-3 h-64 overflow-auto text-xs font-mono text-green-400">
              {exportFormat === "lua" ? exportToLua() : exportToJson()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleExport}
              disabled={project.commands.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              Download StacyPilot Script
            </button>
            <button
              onClick={handleSaveProject}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              Save Project File
            </button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-400">
            <p className="mb-2">
              <strong>StacyPilot Script:</strong> Ready-to-use script for StacyPilot light control system
            </p>
            <p>
              <strong>Project File:</strong> Save your timeline work to continue editing later
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 